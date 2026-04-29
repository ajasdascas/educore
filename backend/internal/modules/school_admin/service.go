package school_admin

import (
	"context"
	"fmt"
	"strings"
	"time"

	"educore/internal/events"
)

type Service struct {
	repo *Repository
	bus  *events.EventBus
}

func NewService(repo *Repository, bus *events.EventBus) *Service {
	return &Service{
		repo: repo,
		bus:  bus,
	}
}

// Dashboard & Stats use cases
func (s *Service) GetDashboard(ctx context.Context, tenantID string) (*DashboardResponse, error) {
	stats, err := s.repo.GetDashboardStats(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard stats: %w", err)
	}

	recentActivity, err := s.repo.GetRecentActivity(ctx, tenantID, 10)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent activity: %w", err)
	}

	return &DashboardResponse{
		Stats:          stats,
		RecentActivity: recentActivity,
		LastUpdated:    time.Now(),
	}, nil
}

func (s *Service) GetStats(ctx context.Context, tenantID string) (*StatsResponse, error) {
	stats, err := s.repo.GetDetailedStats(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get detailed stats: %w", err)
	}

	return stats, nil
}

func (s *Service) GetSettings(ctx context.Context, tenantID string) (*SchoolSettingsResponse, error) {
	settings, err := s.repo.GetSettings(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get settings: %w", err)
	}
	return settings, nil
}

func (s *Service) UpdateSettings(ctx context.Context, tenantID, userID string, req UpdateSchoolSettingsRequest) (*SchoolSettingsResponse, error) {
	settings, err := s.repo.UpdateSettings(ctx, tenantID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update settings: %w", err)
	}
	s.bus.Publish("settings.updated", map[string]interface{}{"tenant_id": tenantID, "updated_by": userID, "timestamp": time.Now()})
	return settings, nil
}

func (s *Service) GetSchoolYears(ctx context.Context, tenantID string) ([]SchoolYearResponse, error) {
	years, err := s.repo.GetSchoolYears(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get school years: %w", err)
	}
	return years, nil
}

func (s *Service) CreateSchoolYear(ctx context.Context, tenantID, userID string, req CreateSchoolYearRequest) (*SchoolYearResponse, error) {
	year, err := s.repo.CreateSchoolYear(ctx, tenantID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create school year: %w", err)
	}
	s.bus.Publish("school_year.created", map[string]interface{}{"tenant_id": tenantID, "school_year_id": year.ID, "created_by": userID, "timestamp": time.Now()})
	return year, nil
}

func (s *Service) UpdateSchoolYear(ctx context.Context, tenantID, userID, yearID string, req UpdateSchoolYearRequest) (*SchoolYearResponse, error) {
	year, err := s.repo.UpdateSchoolYear(ctx, tenantID, yearID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update school year: %w", err)
	}
	s.bus.Publish("school_year.updated", map[string]interface{}{"tenant_id": tenantID, "school_year_id": yearID, "updated_by": userID, "timestamp": time.Now()})
	return year, nil
}

// Student management use cases
func (s *Service) GetStudents(ctx context.Context, tenantID string, params GetStudentsParams) ([]StudentResponse, int, error) {
	students, total, err := s.repo.GetStudentsPaginated(ctx, tenantID, params)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get students: %w", err)
	}

	return students, total, nil
}

func (s *Service) CreateStudent(ctx context.Context, tenantID, userID string, req CreateStudentRequest) (*StudentResponse, error) {
	// Validate business rules
	if err := s.validateCreateStudent(ctx, tenantID, req); err != nil {
		return nil, err
	}

	student, err := s.repo.CreateStudent(ctx, tenantID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create student: %w", err)
	}

	// Publish domain event
	s.bus.Publish("student.created", map[string]interface{}{
		"tenant_id":  tenantID,
		"student_id": student.ID,
		"created_by": userID,
		"timestamp":  time.Now(),
	})

	return student, nil
}

func (s *Service) GetStudent(ctx context.Context, tenantID, studentID string) (*StudentDetailResponse, error) {
	student, err := s.repo.GetStudentByID(ctx, tenantID, studentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get student: %w", err)
	}

	return student, nil
}

func (s *Service) GetStudentAcademicHistory(ctx context.Context, tenantID, studentID string) ([]AcademicHistoryItem, error) {
	history, err := s.repo.GetStudentAcademicHistory(ctx, tenantID, studentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get student academic history: %w", err)
	}
	return history, nil
}

func (s *Service) UpdateStudent(ctx context.Context, tenantID, userID, studentID string, req UpdateStudentRequest) (*StudentResponse, error) {
	// Validate business rules
	if err := s.validateUpdateStudent(ctx, tenantID, studentID, req); err != nil {
		return nil, err
	}

	student, err := s.repo.UpdateStudent(ctx, tenantID, studentID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update student: %w", err)
	}

	// Publish domain event
	s.bus.Publish("student.updated", map[string]interface{}{
		"tenant_id":  tenantID,
		"student_id": studentID,
		"updated_by": userID,
		"timestamp":  time.Now(),
	})

	return student, nil
}

func (s *Service) DeleteStudent(ctx context.Context, tenantID, userID, studentID string) error {
	// Validate business rules (e.g., can't delete if has grades)
	if err := s.validateDeleteStudent(ctx, tenantID, studentID); err != nil {
		return err
	}

	err := s.repo.DeleteStudent(ctx, tenantID, studentID)
	if err != nil {
		return fmt.Errorf("failed to delete student: %w", err)
	}

	// Publish domain event
	s.bus.Publish("student.deleted", map[string]interface{}{
		"tenant_id":  tenantID,
		"student_id": studentID,
		"deleted_by": userID,
		"timestamp":  time.Now(),
	})

	return nil
}

func (s *Service) CommitStudentImport(ctx context.Context, tenantID, userID string, req StudentImportCommitRequest) (*StudentImportCommitResponse, error) {
	if len(req.Rows) == 0 {
		return nil, fmt.Errorf("no rows to import")
	}
	result, err := s.repo.CommitStudentImport(ctx, tenantID, userID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to commit student import: %w", err)
	}
	s.bus.Publish("students.imported", map[string]interface{}{
		"tenant_id":     tenantID,
		"imported_rows": result.ImportedRows,
		"total_rows":    result.TotalRows,
		"source_sheet":  req.SourceSheet,
		"imported_by":   userID,
		"timestamp":     time.Now(),
	})
	return result, nil
}

// Teacher management use cases
func (s *Service) GetTeachers(ctx context.Context, tenantID string) ([]TeacherResponse, error) {
	teachers, err := s.repo.GetTeachers(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get teachers: %w", err)
	}

	return teachers, nil
}

func (s *Service) CreateTeacher(ctx context.Context, tenantID, userID string, req CreateTeacherRequest) (*TeacherResponse, error) {
	// Validate business rules
	if err := s.validateCreateTeacher(ctx, tenantID, req); err != nil {
		return nil, err
	}

	teacher, err := s.repo.CreateTeacher(ctx, tenantID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create teacher: %w", err)
	}

	// Publish domain event
	s.bus.Publish("teacher.created", map[string]interface{}{
		"tenant_id":  tenantID,
		"teacher_id": teacher.ID,
		"created_by": userID,
		"timestamp":  time.Now(),
	})

	return teacher, nil
}

func (s *Service) GetTeacher(ctx context.Context, tenantID, teacherID string) (*TeacherDetailResponse, error) {
	teacher, err := s.repo.GetTeacherByID(ctx, tenantID, teacherID)
	if err != nil {
		return nil, fmt.Errorf("failed to get teacher: %w", err)
	}

	return teacher, nil
}

func (s *Service) UpdateTeacher(ctx context.Context, tenantID, userID, teacherID string, req UpdateTeacherRequest) (*TeacherResponse, error) {
	if err := s.validateUpdateTeacher(ctx, tenantID, teacherID, req); err != nil {
		return nil, err
	}

	teacher, err := s.repo.UpdateTeacher(ctx, tenantID, teacherID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update teacher: %w", err)
	}

	// Publish domain event
	s.bus.Publish("teacher.updated", map[string]interface{}{
		"tenant_id":  tenantID,
		"teacher_id": teacherID,
		"updated_by": userID,
		"timestamp":  time.Now(),
	})

	return teacher, nil
}

// Group management use cases
func (s *Service) GetGroups(ctx context.Context, tenantID string) ([]GroupResponse, error) {
	groups, err := s.repo.GetGroups(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get groups: %w", err)
	}

	return groups, nil
}

func (s *Service) CreateGroup(ctx context.Context, tenantID, userID string, req CreateGroupRequest) (*GroupResponse, error) {
	// Validate business rules
	if err := s.validateCreateGroup(ctx, tenantID, req); err != nil {
		return nil, err
	}

	group, err := s.repo.CreateGroup(ctx, tenantID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create group: %w", err)
	}

	// Publish domain event
	s.bus.Publish("group.created", map[string]interface{}{
		"tenant_id":  tenantID,
		"group_id":   group.ID,
		"created_by": userID,
		"timestamp":  time.Now(),
	})

	return group, nil
}

func (s *Service) GetGroup(ctx context.Context, tenantID, groupID string) (*GroupDetailResponse, error) {
	group, err := s.repo.GetGroupByID(ctx, tenantID, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get group: %w", err)
	}

	return group, nil
}

func (s *Service) UpdateGroup(ctx context.Context, tenantID, userID, groupID string, req UpdateGroupRequest) (*GroupResponse, error) {
	group, err := s.repo.UpdateGroup(ctx, tenantID, groupID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update group: %w", err)
	}

	// Publish domain event
	s.bus.Publish("group.updated", map[string]interface{}{
		"tenant_id":  tenantID,
		"group_id":   groupID,
		"updated_by": userID,
		"timestamp":  time.Now(),
	})

	return group, nil
}

func (s *Service) DeleteGroup(ctx context.Context, tenantID, userID, groupID string) error {
	err := s.repo.DeleteGroup(ctx, tenantID, groupID)
	if err != nil {
		return fmt.Errorf("failed to delete group: %w", err)
	}

	s.bus.Publish("group.deleted", map[string]interface{}{
		"tenant_id":  tenantID,
		"group_id":   groupID,
		"deleted_by": userID,
		"timestamp":  time.Now(),
	})

	return nil
}

// Subject management use cases
func (s *Service) GetSubjects(ctx context.Context, tenantID string) ([]SubjectResponse, error) {
	subjects, err := s.repo.GetSubjects(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get subjects: %w", err)
	}

	return subjects, nil
}

func (s *Service) CreateSubject(ctx context.Context, tenantID, userID string, req CreateSubjectRequest) (*SubjectResponse, error) {
	// Validate business rules
	if err := s.validateCreateSubject(ctx, tenantID, req); err != nil {
		return nil, err
	}

	subject, err := s.repo.CreateSubject(ctx, tenantID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create subject: %w", err)
	}

	// Publish domain event
	s.bus.Publish("subject.created", map[string]interface{}{
		"tenant_id":  tenantID,
		"subject_id": subject.ID,
		"created_by": userID,
		"timestamp":  time.Now(),
	})

	return subject, nil
}

func (s *Service) UpdateSubject(ctx context.Context, tenantID, userID, subjectID string, req UpdateSubjectRequest) (*SubjectResponse, error) {
	subject, err := s.repo.UpdateSubject(ctx, tenantID, subjectID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update subject: %w", err)
	}
	s.bus.Publish("subject.updated", map[string]interface{}{"tenant_id": tenantID, "subject_id": subjectID, "updated_by": userID, "timestamp": time.Now()})
	return subject, nil
}

func (s *Service) DeleteSubject(ctx context.Context, tenantID, userID, subjectID string) error {
	if err := s.repo.DeleteSubject(ctx, tenantID, subjectID); err != nil {
		return fmt.Errorf("failed to delete subject: %w", err)
	}
	s.bus.Publish("subject.deleted", map[string]interface{}{"tenant_id": tenantID, "subject_id": subjectID, "deleted_by": userID, "timestamp": time.Now()})
	return nil
}

func (s *Service) GetSchedule(ctx context.Context, tenantID, groupID string) ([]ScheduleBlockResponse, error) {
	blocks, err := s.repo.GetSchedule(ctx, tenantID, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get schedule: %w", err)
	}
	return blocks, nil
}

func (s *Service) CreateScheduleBlock(ctx context.Context, tenantID, userID string, req CreateScheduleBlockRequest) (*ScheduleBlockResponse, error) {
	block, err := s.repo.CreateScheduleBlock(ctx, tenantID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create schedule block: %w", err)
	}
	s.bus.Publish("schedule.created", map[string]interface{}{"tenant_id": tenantID, "schedule_id": block.ID, "created_by": userID, "timestamp": time.Now()})
	return block, nil
}

func (s *Service) GetScheduleBlock(ctx context.Context, tenantID, blockID string) (*ScheduleBlockResponse, error) {
	block, err := s.repo.GetScheduleBlock(ctx, tenantID, blockID)
	if err != nil {
		return nil, fmt.Errorf("failed to get schedule block: %w", err)
	}
	return block, nil
}

func (s *Service) UpdateScheduleBlock(ctx context.Context, tenantID, userID, blockID string, req UpdateScheduleBlockRequest) (*ScheduleBlockResponse, error) {
	block, err := s.repo.UpdateScheduleBlock(ctx, tenantID, blockID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update schedule block: %w", err)
	}
	s.bus.Publish("schedule.updated", map[string]interface{}{"tenant_id": tenantID, "schedule_id": blockID, "updated_by": userID, "timestamp": time.Now()})
	return block, nil
}

func (s *Service) DeleteScheduleBlock(ctx context.Context, tenantID, userID, blockID string) error {
	if err := s.repo.DeleteScheduleBlock(ctx, tenantID, blockID); err != nil {
		return fmt.Errorf("failed to delete schedule block: %w", err)
	}
	s.bus.Publish("schedule.deleted", map[string]interface{}{"tenant_id": tenantID, "schedule_id": blockID, "deleted_by": userID, "timestamp": time.Now()})
	return nil
}

// Attendance use cases
func (s *Service) GetTodayAttendance(ctx context.Context, tenantID, groupID string) (*AttendanceResponse, error) {
	attendance, err := s.repo.GetTodayAttendance(ctx, tenantID, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get today's attendance: %w", err)
	}

	return attendance, nil
}

func (s *Service) BulkUpdateAttendance(ctx context.Context, tenantID, userID, groupID string, req BulkAttendanceRequest) error {
	// Validate business rules
	if err := s.validateBulkAttendance(ctx, tenantID, groupID, req); err != nil {
		return err
	}

	err := s.repo.BulkUpdateAttendance(ctx, tenantID, groupID, req)
	if err != nil {
		return fmt.Errorf("failed to update attendance: %w", err)
	}

	// Publish domain event
	s.bus.Publish("attendance.bulk_updated", map[string]interface{}{
		"tenant_id":     tenantID,
		"group_id":      groupID,
		"updated_by":    userID,
		"student_count": len(req.Records),
		"date":          req.Date,
		"timestamp":     time.Now(),
	})

	return nil
}

func (s *Service) GetStudentAttendanceHistory(ctx context.Context, tenantID, studentID, startDate, endDate string) (*AttendanceHistoryResponse, error) {
	history, err := s.repo.GetStudentAttendanceHistory(ctx, tenantID, studentID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get attendance history: %w", err)
	}

	return history, nil
}

func (s *Service) GetMonthlyAttendanceReport(ctx context.Context, tenantID string, year, month int) (*MonthlyAttendanceReport, error) {
	report, err := s.repo.GetMonthlyAttendanceReport(ctx, tenantID, year, month)
	if err != nil {
		return nil, fmt.Errorf("failed to get monthly attendance report: %w", err)
	}

	return report, nil
}

// Grades use cases
func (s *Service) GetGroupGrades(ctx context.Context, tenantID, groupID, subjectID string) (*GroupGradesResponse, error) {
	grades, err := s.repo.GetGroupGrades(ctx, tenantID, groupID, subjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get group grades: %w", err)
	}

	return grades, nil
}

func (s *Service) BulkUpdateGrades(ctx context.Context, tenantID, userID string, req BulkGradesRequest) error {
	// Validate business rules
	if err := s.validateBulkGrades(ctx, tenantID, req); err != nil {
		return err
	}

	err := s.repo.BulkUpdateGrades(ctx, tenantID, req)
	if err != nil {
		return fmt.Errorf("failed to update grades: %w", err)
	}

	// Publish domain event
	s.bus.Publish("grades.bulk_updated", map[string]interface{}{
		"tenant_id":   tenantID,
		"updated_by":  userID,
		"grade_count": len(req.Grades),
		"timestamp":   time.Now(),
	})

	return nil
}

func (s *Service) GetStudentReportCard(ctx context.Context, tenantID, studentID, period string) (*ReportCardResponse, error) {
	reportCard, err := s.repo.GetStudentReportCard(ctx, tenantID, studentID, period)
	if err != nil {
		return nil, fmt.Errorf("failed to get report card: %w", err)
	}

	return reportCard, nil
}

func (s *Service) GetGroupFinalGrades(ctx context.Context, tenantID, groupID string) (*GroupFinalGradesResponse, error) {
	grades, err := s.repo.GetGroupFinalGrades(ctx, tenantID, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get final grades: %w", err)
	}

	return grades, nil
}

// Business rule validation methods
func (s *Service) validateCreateStudent(ctx context.Context, tenantID string, req CreateStudentRequest) error {
	if strings.TrimSpace(req.FirstName) == "" || strings.TrimSpace(req.PaternalLastName) == "" || strings.TrimSpace(req.MaternalLastName) == "" {
		return fmt.Errorf("student first name, paternal last name and maternal last name are required")
	}
	if strings.TrimSpace(req.BirthDay) == "" || strings.TrimSpace(req.BirthMonth) == "" || strings.TrimSpace(req.BirthYear) == "" {
		return fmt.Errorf("student birth day, month and year are required")
	}
	if len(req.Parents) == 0 && strings.TrimSpace(req.ParentEmail) == "" {
		return fmt.Errorf("at least one parent or guardian is required")
	}
	// Check if student with same email already exists
	if req.Email != "" {
		exists, err := s.repo.StudentEmailExists(ctx, tenantID, req.Email)
		if err != nil {
			return err
		}
		if exists {
			return fmt.Errorf("student with email %s already exists", req.Email)
		}
	}

	// Validate group exists and is active
	if req.GroupID != "" {
		groupExists, err := s.repo.GroupExists(ctx, tenantID, req.GroupID)
		if err != nil {
			return err
		}
		if !groupExists {
			return fmt.Errorf("group %s does not exist", req.GroupID)
		}
	}

	return nil
}

func (s *Service) validateUpdateStudent(ctx context.Context, tenantID, studentID string, req UpdateStudentRequest) error {
	// Check if email is being changed to an existing one
	if req.Email != "" {
		exists, err := s.repo.StudentEmailExistsExcluding(ctx, tenantID, req.Email, studentID)
		if err != nil {
			return err
		}
		if exists {
			return fmt.Errorf("student with email %s already exists", req.Email)
		}
	}

	return nil
}

func (s *Service) validateDeleteStudent(ctx context.Context, tenantID, studentID string) error {
	// Check if student has any grades (business rule: can't delete if has academic records)
	hasGrades, err := s.repo.StudentHasGrades(ctx, tenantID, studentID)
	if err != nil {
		return err
	}
	if hasGrades {
		return fmt.Errorf("cannot delete student with existing grades")
	}

	return nil
}

func (s *Service) validateCreateTeacher(ctx context.Context, tenantID string, req CreateTeacherRequest) error {
	// Check if teacher with same email already exists
	exists, err := s.repo.TeacherEmailExists(ctx, tenantID, req.Email)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("teacher with email %s already exists", req.Email)
	}

	return nil
}

func (s *Service) validateUpdateTeacher(ctx context.Context, tenantID, teacherID string, req UpdateTeacherRequest) error {
	if req.Email == "" {
		return nil
	}

	exists, err := s.repo.TeacherEmailExistsExcluding(ctx, tenantID, req.Email, teacherID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("teacher with email %s already exists", req.Email)
	}

	return nil
}

func (s *Service) validateCreateGroup(ctx context.Context, tenantID string, req CreateGroupRequest) error {
	// Check if group with same name and grade level already exists
	exists, err := s.repo.GroupNameExists(ctx, tenantID, req.Name, req.GradeLevelID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("group with name %s already exists in this grade level", req.Name)
	}

	return nil
}

func (s *Service) validateCreateSubject(ctx context.Context, tenantID string, req CreateSubjectRequest) error {
	// Check if subject with same name already exists
	exists, err := s.repo.SubjectNameExists(ctx, tenantID, req.Name)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("subject with name %s already exists", req.Name)
	}

	return nil
}

func (s *Service) validateBulkAttendance(ctx context.Context, tenantID, groupID string, req BulkAttendanceRequest) error {
	// Validate all students belong to the group
	for _, record := range req.Records {
		belongs, err := s.repo.StudentBelongsToGroup(ctx, tenantID, record.StudentID, groupID)
		if err != nil {
			return err
		}
		if !belongs {
			return fmt.Errorf("student %s does not belong to group %s", record.StudentID, groupID)
		}
	}

	return nil
}

func (s *Service) validateBulkGrades(ctx context.Context, tenantID string, req BulkGradesRequest) error {
	// Validate all grades are within acceptable range
	for _, grade := range req.Grades {
		if grade.Score < 0 || grade.Score > 100 {
			return fmt.Errorf("grade score must be between 0 and 100")
		}

		// Validate student belongs to the group/subject
		belongs, err := s.repo.StudentBelongsToSubject(ctx, tenantID, grade.StudentID, grade.SubjectID)
		if err != nil {
			return err
		}
		if !belongs {
			return fmt.Errorf("student %s is not enrolled in subject %s", grade.StudentID, grade.SubjectID)
		}
	}

	return nil
}
