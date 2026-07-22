package teacher

import (
	"context"
	"errors"
	"fmt"
	"time"

	"educore/internal/events"
)

var ErrTeacherInvalidRequest = errors.New("invalid teacher request")

type Service struct {
	repo *Repository
	bus  *events.EventBus
}

func NewService(repo *Repository, bus *events.EventBus) *Service {
	return &Service{repo: repo, bus: bus}
}

func (s *Service) GetDashboard(ctx context.Context, tenantID, teacherID string) (*DashboardResponse, error) {
	return s.repo.GetDashboard(ctx, tenantID, teacherID)
}

func (s *Service) GetClasses(ctx context.Context, tenantID, teacherID string) ([]TeacherClass, error) {
	return s.repo.GetClasses(ctx, tenantID, teacherID)
}

func (s *Service) GetClassStudents(ctx context.Context, tenantID, teacherID, groupID string) ([]TeacherStudent, error) {
	return s.repo.GetClassStudents(ctx, tenantID, teacherID, groupID)
}

func (s *Service) GetAttendance(ctx context.Context, tenantID, teacherID, groupID, date string) (*AttendanceResponse, error) {
	if groupID == "" {
		return nil, fmt.Errorf("%w: group_id is required", ErrTeacherInvalidRequest)
	}
	if date != "" {
		if _, err := time.Parse("2006-01-02", date); err != nil {
			return nil, fmt.Errorf("%w: date must use YYYY-MM-DD", ErrTeacherInvalidRequest)
		}
	}
	return s.repo.GetAttendance(ctx, tenantID, teacherID, groupID, date)
}

func (s *Service) SaveAttendance(ctx context.Context, tenantID, teacherID string, req AttendanceRequest) error {
	if req.GroupID == "" || len(req.Records) == 0 {
		return fmt.Errorf("%w: group_id and records are required", ErrTeacherInvalidRequest)
	}
	if req.Date != "" {
		if _, err := time.Parse("2006-01-02", req.Date); err != nil {
			return fmt.Errorf("%w: date must use YYYY-MM-DD", ErrTeacherInvalidRequest)
		}
	}
	allowedStatuses := map[string]bool{"present": true, "absent": true, "late": true, "excused": true}
	seenStudents := map[string]bool{}
	for _, record := range req.Records {
		if record.StudentID == "" || !allowedStatuses[record.Status] {
			return fmt.Errorf("%w: every attendance record needs a student and valid status", ErrTeacherInvalidRequest)
		}
		if seenStudents[record.StudentID] {
			return fmt.Errorf("%w: duplicate student in attendance payload", ErrTeacherInvalidRequest)
		}
		seenStudents[record.StudentID] = true
	}
	if err := s.repo.SaveAttendance(ctx, tenantID, teacherID, req); err != nil {
		return err
	}
	s.bus.Publish("teacher.attendance_saved", map[string]interface{}{"tenant_id": tenantID, "teacher_id": teacherID, "group_id": req.GroupID, "timestamp": time.Now()})
	return nil
}

func (s *Service) GetGrades(ctx context.Context, tenantID, teacherID, groupID, subjectID, period string) (*GradesResponse, error) {
	if groupID == "" || subjectID == "" {
		return nil, fmt.Errorf("%w: group_id and subject_id are required", ErrTeacherInvalidRequest)
	}
	return s.repo.GetGrades(ctx, tenantID, teacherID, groupID, subjectID, period)
}

func (s *Service) SaveGrades(ctx context.Context, tenantID, teacherID string, req GradesRequest) error {
	if req.GroupID == "" || len(req.Grades) == 0 {
		return fmt.Errorf("%w: group_id and grades are required", ErrTeacherInvalidRequest)
	}
	seen := map[string]bool{}
	for _, grade := range req.Grades {
		if grade.StudentID == "" || grade.SubjectID == "" {
			return fmt.Errorf("%w: every grade needs student_id and subject_id", ErrTeacherInvalidRequest)
		}
		if grade.Score < 0 || grade.Score > 100 {
			return fmt.Errorf("%w: score must be between 0 and 100", ErrTeacherInvalidRequest)
		}
		key := grade.StudentID + ":" + grade.SubjectID
		if seen[key] {
			return fmt.Errorf("%w: duplicate student and subject in grades payload", ErrTeacherInvalidRequest)
		}
		seen[key] = true
	}
	if err := s.repo.SaveGrades(ctx, tenantID, teacherID, req); err != nil {
		return err
	}
	s.bus.Publish("teacher.grades_saved", map[string]interface{}{"tenant_id": tenantID, "teacher_id": teacherID, "group_id": req.GroupID, "timestamp": time.Now()})
	return nil
}

func (s *Service) GetMessages(ctx context.Context, tenantID, teacherID string, page, perPage int) ([]TeacherMessage, error) {
	return s.repo.GetMessages(ctx, tenantID, teacherID, page, perPage)
}

func (s *Service) GetSchedule(ctx context.Context, tenantID, teacherID string) ([]TeacherClass, error) {
	return s.repo.GetSchedule(ctx, tenantID, teacherID)
}

func (s *Service) GetNotifications(ctx context.Context, tenantID, userID string) ([]TeacherNotification, error) {
	return s.repo.GetNotifications(ctx, tenantID, userID)
}

func (s *Service) SendMessage(ctx context.Context, tenantID, teacherID string, req SendMessageRequest) (*TeacherMessage, error) {
	if req.RecipientID == "" || req.Subject == "" || req.Content == "" {
		return nil, fmt.Errorf("%w: recipient_id, subject and content are required", ErrTeacherInvalidRequest)
	}
	if req.Priority != "" {
		allowedPriorities := map[string]bool{"low": true, "normal": true, "medium": true, "high": true, "urgent": true}
		if !allowedPriorities[req.Priority] {
			return nil, fmt.Errorf("%w: invalid priority", ErrTeacherInvalidRequest)
		}
	}
	message, err := s.repo.SendMessage(ctx, tenantID, teacherID, req)
	if err != nil {
		return nil, err
	}
	s.bus.Publish("teacher.message_sent", map[string]interface{}{"tenant_id": tenantID, "teacher_id": teacherID, "recipient_id": req.RecipientID, "message_id": message.ID, "timestamp": time.Now()})
	return message, nil
}
