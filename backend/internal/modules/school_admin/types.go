package school_admin

import "time"

// Request DTOs
type GetStudentsParams struct {
	Page    int    `json:"page"`
	PerPage int    `json:"per_page"`
	Search  string `json:"search"`
	GroupID string `json:"group_id"`
	Status  string `json:"status"`
}

type CreateStudentRequest struct {
	FirstName    string `json:"first_name" validate:"required,min=2,max=100"`
	LastName     string `json:"last_name" validate:"required,min=2,max=100"`
	Email        string `json:"email" validate:"required,email"`
	Phone        string `json:"phone" validate:"required"`
	BirthDate    string `json:"birth_date" validate:"required"`
	Address      string `json:"address" validate:"required"`
	GroupID      string `json:"group_id"`
	ParentName   string `json:"parent_name" validate:"required"`
	ParentEmail  string `json:"parent_email" validate:"required,email"`
	ParentPhone  string `json:"parent_phone" validate:"required"`
	EnrollmentID string `json:"enrollment_id" validate:"required"`
	Status       string `json:"status"`
}

type UpdateStudentRequest struct {
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	Address      string `json:"address"`
	GroupID      string `json:"group_id"`
	ParentName   string `json:"parent_name"`
	ParentEmail  string `json:"parent_email"`
	ParentPhone  string `json:"parent_phone"`
	EnrollmentID string `json:"enrollment_id"`
	Status       string `json:"status"`
}

type CreateTeacherRequest struct {
	FirstName   string   `json:"first_name" validate:"required,min=2,max=100"`
	LastName    string   `json:"last_name" validate:"required,min=2,max=100"`
	Email       string   `json:"email" validate:"required,email"`
	Phone       string   `json:"phone" validate:"required"`
	Address     string   `json:"address"`
	Specialties []string `json:"specialties"`
	EmployeeID  string   `json:"employee_id" validate:"required"`
	HireDate    string   `json:"hire_date" validate:"required"`
	Salary      float64  `json:"salary"`
	Status      string   `json:"status"`
}

type UpdateTeacherRequest struct {
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	Email       string   `json:"email"`
	Phone       string   `json:"phone"`
	Address     string   `json:"address"`
	Specialties []string `json:"specialties"`
	Salary      float64  `json:"salary"`
	Status      string   `json:"status"`
}

type CreateGroupRequest struct {
	Name         string   `json:"name" validate:"required,min=1,max=100"`
	GradeLevelID string   `json:"grade_level_id" validate:"required"`
	SchoolYearID string   `json:"school_year_id"`
	Description  string   `json:"description"`
	MaxStudents  int      `json:"max_students"`
	TeacherID    string   `json:"teacher_id"`
	TeacherIDs   []string `json:"teacher_ids"`
	StudentIDs   []string `json:"student_ids"`
	SubjectIDs   []string `json:"subject_ids"`
	Schedule     string   `json:"schedule"`
	Room         string   `json:"room"`
	Status       string   `json:"status"`
}

type UpdateGroupRequest struct {
	Name         string   `json:"name"`
	GradeLevelID string   `json:"grade_level_id"`
	SchoolYearID string   `json:"school_year_id"`
	Description  string   `json:"description"`
	MaxStudents  int      `json:"max_students"`
	TeacherID    string   `json:"teacher_id"`
	TeacherIDs   []string `json:"teacher_ids"`
	StudentIDs   []string `json:"student_ids"`
	SubjectIDs   []string `json:"subject_ids"`
	Schedule     string   `json:"schedule"`
	Room         string   `json:"room"`
	Status       string   `json:"status"`
}

type CreateSubjectRequest struct {
	Name         string `json:"name" validate:"required,min=2,max=100"`
	Code         string `json:"code" validate:"required,min=2,max=10"`
	Description  string `json:"description"`
	Credits      int    `json:"credits"`
	GradeLevelID string `json:"grade_level_id"`
	Status       string `json:"status"`
}

type UpdateSubjectRequest struct {
	Name         string `json:"name"`
	Code         string `json:"code"`
	Description  string `json:"description"`
	Credits      int    `json:"credits"`
	GradeLevelID string `json:"grade_level_id"`
	Status       string `json:"status"`
}

type CreateSchoolYearRequest struct {
	Name      string `json:"name" validate:"required"`
	StartDate string `json:"start_date" validate:"required"`
	EndDate   string `json:"end_date" validate:"required"`
	Status    string `json:"status"`
	IsCurrent bool   `json:"is_current"`
	Notes     string `json:"notes"`
}

type UpdateSchoolYearRequest struct {
	Name      string `json:"name"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Status    string `json:"status"`
	IsCurrent *bool  `json:"is_current"`
	Notes     string `json:"notes"`
}

type SchoolSettingsResponse struct {
	School        map[string]interface{} `json:"school"`
	Academic      map[string]interface{} `json:"academic"`
	Notifications map[string]interface{} `json:"notifications"`
	Security      map[string]interface{} `json:"security"`
	UpdatedAt     time.Time              `json:"updated_at"`
}

type UpdateSchoolSettingsRequest struct {
	School        map[string]interface{} `json:"school"`
	Academic      map[string]interface{} `json:"academic"`
	Notifications map[string]interface{} `json:"notifications"`
	Security      map[string]interface{} `json:"security"`
}

type CreateScheduleBlockRequest struct {
	GroupID   string `json:"group_id" validate:"required"`
	SubjectID string `json:"subject_id"`
	Subject   string `json:"subject"`
	TeacherID string `json:"teacher_id"`
	Day       string `json:"day" validate:"required"`
	StartTime string `json:"start_time" validate:"required"`
	EndTime   string `json:"end_time" validate:"required"`
	Room      string `json:"room"`
	Status    string `json:"status"`
	Notes     string `json:"notes"`
}

type UpdateScheduleBlockRequest struct {
	GroupID   string `json:"group_id"`
	SubjectID string `json:"subject_id"`
	Subject   string `json:"subject"`
	TeacherID string `json:"teacher_id"`
	Day       string `json:"day"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	Room      string `json:"room"`
	Status    string `json:"status"`
	Notes     string `json:"notes"`
}

type AttendanceRecord struct {
	StudentID string `json:"student_id" validate:"required"`
	Status    string `json:"status" validate:"required,oneof=present absent late excused"`
	Notes     string `json:"notes"`
}

type BulkAttendanceRequest struct {
	Date    string             `json:"date" validate:"required"`
	Records []AttendanceRecord `json:"records" validate:"required,dive"`
}

type GradeRecord struct {
	StudentID   string  `json:"student_id" validate:"required"`
	SubjectID   string  `json:"subject_id" validate:"required"`
	Score       float64 `json:"score" validate:"required,min=0,max=100"`
	Type        string  `json:"type" validate:"required,oneof=quiz exam homework project midterm final"`
	Description string  `json:"description"`
	Weight      float64 `json:"weight"`
}

type BulkGradesRequest struct {
	Grades []GradeRecord `json:"grades" validate:"required,dive"`
}

// Response DTOs
type DashboardResponse struct {
	Stats          *DashboardStats `json:"stats"`
	RecentActivity []ActivityItem  `json:"recent_activity"`
	LastUpdated    time.Time       `json:"last_updated"`
}

type DashboardStats struct {
	TotalStudents    int     `json:"total_students"`
	TotalTeachers    int     `json:"total_teachers"`
	TotalGroups      int     `json:"total_groups"`
	ActiveStudents   int     `json:"active_students"`
	AttendanceRate   float64 `json:"attendance_rate"`
	AverageGrade     float64 `json:"average_grade"`
	NewStudentsMonth int     `json:"new_students_month"`
	GraduationsMonth int     `json:"graduations_month"`
}

type StatsResponse struct {
	Students          *StudentStats       `json:"students"`
	Teachers          *TeacherStats       `json:"teachers"`
	Academic          *AcademicStats      `json:"academic"`
	Attendance        *AttendanceStats    `json:"attendance"`
	Performance       *PerformanceStats   `json:"performance"`
	MonthlyTrends     []MonthlyTrend      `json:"monthly_trends"`
	GradeDistribution []GradeDistribution `json:"grade_distribution"`
}

type StudentStats struct {
	Total     int               `json:"total"`
	Active    int               `json:"active"`
	Inactive  int               `json:"inactive"`
	Graduated int               `json:"graduated"`
	ByGrade   map[string]int    `json:"by_grade"`
	ByGender  map[string]int    `json:"by_gender"`
	ByStatus  map[string]int    `json:"by_status"`
	Recent    []StudentResponse `json:"recent"`
}

type TeacherStats struct {
	Total       int               `json:"total"`
	Active      int               `json:"active"`
	PartTime    int               `json:"part_time"`
	FullTime    int               `json:"full_time"`
	BySpecialty map[string]int    `json:"by_specialty"`
	Recent      []TeacherResponse `json:"recent"`
}

type AcademicStats struct {
	TotalGroups   int            `json:"total_groups"`
	TotalSubjects int            `json:"total_subjects"`
	ActiveTerms   int            `json:"active_terms"`
	AvgClassSize  float64        `json:"avg_class_size"`
	GroupsByGrade map[string]int `json:"groups_by_grade"`
}

type AttendanceStats struct {
	OverallRate  float64            `json:"overall_rate"`
	WeeklyRate   float64            `json:"weekly_rate"`
	MonthlyRate  float64            `json:"monthly_rate"`
	ByGrade      map[string]float64 `json:"by_grade"`
	TrendWeekly  []AttendanceTrend  `json:"trend_weekly"`
	TrendMonthly []AttendanceTrend  `json:"trend_monthly"`
}

type PerformanceStats struct {
	OverallGPA    float64            `json:"overall_gpa"`
	ByGrade       map[string]float64 `json:"by_grade"`
	BySubject     map[string]float64 `json:"by_subject"`
	TopPerformers []StudentResponse  `json:"top_performers"`
	NeedAttention []StudentResponse  `json:"need_attention"`
}

type ActivityItem struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	UserName    string                 `json:"user_name"`
	Timestamp   time.Time              `json:"timestamp"`
	Metadata    map[string]interface{} `json:"metadata"`
}

type StudentResponse struct {
	ID           string    `json:"id"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	EnrollmentID string    `json:"enrollment_id"`
	Status       string    `json:"status"`
	GroupName    string    `json:"group_name"`
	GradeName    string    `json:"grade_name"`
	ParentName   string    `json:"parent_name"`
	ParentEmail  string    `json:"parent_email"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type StudentDetailResponse struct {
	*StudentResponse
	BirthDate        string           `json:"birth_date"`
	Address          string           `json:"address"`
	ParentPhone      string           `json:"parent_phone"`
	AttendanceRate   float64          `json:"attendance_rate"`
	AverageGrade     float64          `json:"average_grade"`
	TotalAbsences    int              `json:"total_absences"`
	RecentGrades     []GradeResponse  `json:"recent_grades"`
	RecentAttendance []AttendanceItem `json:"recent_attendance"`
}

type TeacherResponse struct {
	ID          string    `json:"id"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	Email       string    `json:"email"`
	Phone       string    `json:"phone"`
	EmployeeID  string    `json:"employee_id"`
	Status      string    `json:"status"`
	Specialties []string  `json:"specialties"`
	GroupCount  int       `json:"group_count"`
	HireDate    string    `json:"hire_date"`
	CreatedAt   time.Time `json:"created_at"`
}

type TeacherDetailResponse struct {
	*TeacherResponse
	Address     string              `json:"address"`
	Salary      float64             `json:"salary"`
	Groups      []GroupResponse     `json:"groups"`
	Subjects    []SubjectResponse   `json:"subjects"`
	Performance *TeacherPerformance `json:"performance"`
}

type TeacherPerformance struct {
	StudentCount        int     `json:"student_count"`
	AttendanceRate      float64 `json:"attendance_rate"`
	AverageGrade        float64 `json:"average_grade"`
	StudentSatisfaction float64 `json:"student_satisfaction"`
}

type GroupResponse struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	GradeLevelID string    `json:"grade_level_id"`
	GradeName    string    `json:"grade_name"`
	SchoolYearID string    `json:"school_year_id"`
	SchoolYear   string    `json:"school_year"`
	TeacherID    string    `json:"teacher_id"`
	TeacherName  string    `json:"teacher_name"`
	StudentCount int       `json:"student_count"`
	MaxStudents  int       `json:"max_students"`
	Room         string    `json:"room"`
	Schedule     string    `json:"schedule"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

type GroupDetailResponse struct {
	*GroupResponse
	Description    string            `json:"description"`
	Students       []StudentResponse `json:"students"`
	Teachers       []TeacherResponse `json:"teachers"`
	Subjects       []SubjectResponse `json:"subjects"`
	RecentActivity []ActivityItem    `json:"recent_activity"`
}

type SubjectResponse struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Code         string    `json:"code"`
	Description  string    `json:"description"`
	Credits      int       `json:"credits"`
	GradeLevelID string    `json:"grade_level_id"`
	GradeName    string    `json:"grade_name"`
	Status       string    `json:"status"`
	TeacherCount int       `json:"teacher_count"`
	StudentCount int       `json:"student_count"`
	CreatedAt    time.Time `json:"created_at"`
}

type SchoolYearResponse struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	StartDate    string    `json:"start_date"`
	EndDate      string    `json:"end_date"`
	Status       string    `json:"status"`
	IsCurrent    bool      `json:"is_current"`
	Notes        string    `json:"notes"`
	GroupCount   int       `json:"group_count"`
	StudentCount int       `json:"student_count"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type ScheduleBlockResponse struct {
	ID          string    `json:"id"`
	GroupID     string    `json:"group_id"`
	GroupName   string    `json:"group_name"`
	GradeName   string    `json:"grade_name"`
	SubjectID   string    `json:"subject_id"`
	Subject     string    `json:"subject"`
	TeacherID   string    `json:"teacher_id"`
	TeacherName string    `json:"teacher_name"`
	Day         string    `json:"day"`
	StartTime   string    `json:"start_time"`
	EndTime     string    `json:"end_time"`
	Room        string    `json:"room"`
	Status      string    `json:"status"`
	Notes       string    `json:"notes"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type AttendanceResponse struct {
	GroupID     string              `json:"group_id"`
	GroupName   string              `json:"group_name"`
	Date        string              `json:"date"`
	Students    []AttendanceStudent `json:"students"`
	Summary     AttendanceSummary   `json:"summary"`
	LastUpdated time.Time           `json:"last_updated"`
}

type AttendanceStudent struct {
	StudentID   string    `json:"student_id"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	Status      string    `json:"status"`
	Notes       string    `json:"notes"`
	LastChanged time.Time `json:"last_changed"`
}

type AttendanceSummary struct {
	Present int     `json:"present"`
	Absent  int     `json:"absent"`
	Late    int     `json:"late"`
	Excused int     `json:"excused"`
	Rate    float64 `json:"rate"`
}

type AttendanceHistoryResponse struct {
	StudentID   string            `json:"student_id"`
	StudentName string            `json:"student_name"`
	StartDate   string            `json:"start_date"`
	EndDate     string            `json:"end_date"`
	Records     []AttendanceItem  `json:"records"`
	Summary     AttendanceSummary `json:"summary"`
}

type AttendanceItem struct {
	Date   string `json:"date"`
	Status string `json:"status"`
	Notes  string `json:"notes"`
}

type MonthlyAttendanceReport struct {
	Year    int               `json:"year"`
	Month   int               `json:"month"`
	Summary AttendanceSummary `json:"summary"`
	ByGroup []GroupAttendance `json:"by_group"`
	ByDate  []DailyAttendance `json:"by_date"`
	Trends  []AttendanceTrend `json:"trends"`
}

type GroupAttendance struct {
	GroupID   string            `json:"group_id"`
	GroupName string            `json:"group_name"`
	Summary   AttendanceSummary `json:"summary"`
}

type DailyAttendance struct {
	Date    string            `json:"date"`
	Summary AttendanceSummary `json:"summary"`
}

type AttendanceTrend struct {
	Period string  `json:"period"`
	Rate   float64 `json:"rate"`
	Change float64 `json:"change"`
}

type GroupGradesResponse struct {
	GroupID     string         `json:"group_id"`
	GroupName   string         `json:"group_name"`
	SubjectID   string         `json:"subject_id"`
	SubjectName string         `json:"subject_name"`
	Students    []StudentGrade `json:"students"`
	Summary     GradeSummary   `json:"summary"`
}

type StudentGrade struct {
	StudentID   string          `json:"student_id"`
	FirstName   string          `json:"first_name"`
	LastName    string          `json:"last_name"`
	Grades      []GradeResponse `json:"grades"`
	Average     float64         `json:"average"`
	LetterGrade string          `json:"letter_grade"`
}

type GradeResponse struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	Score       float64   `json:"score"`
	MaxScore    float64   `json:"max_score"`
	Description string    `json:"description"`
	Weight      float64   `json:"weight"`
	Date        string    `json:"date"`
	TeacherName string    `json:"teacher_name"`
	CreatedAt   time.Time `json:"created_at"`
}

type GradeSummary struct {
	Average      float64 `json:"average"`
	Highest      float64 `json:"highest"`
	Lowest       float64 `json:"lowest"`
	PassingRate  float64 `json:"passing_rate"`
	StudentCount int     `json:"student_count"`
	GradeCount   int     `json:"grade_count"`
}

type ReportCardResponse struct {
	StudentID      string           `json:"student_id"`
	StudentName    string           `json:"student_name"`
	GroupName      string           `json:"group_name"`
	Period         string           `json:"period"`
	OverallGPA     float64          `json:"overall_gpa"`
	OverallGrade   string           `json:"overall_grade"`
	AttendanceRate float64          `json:"attendance_rate"`
	SubjectGrades  []SubjectGrade   `json:"subject_grades"`
	Comments       []TeacherComment `json:"comments"`
	GeneratedAt    time.Time        `json:"generated_at"`
}

type SubjectGrade struct {
	SubjectName string  `json:"subject_name"`
	TeacherName string  `json:"teacher_name"`
	Average     float64 `json:"average"`
	LetterGrade string  `json:"letter_grade"`
	Credits     int     `json:"credits"`
	Effort      string  `json:"effort"`
	Behavior    string  `json:"behavior"`
}

type TeacherComment struct {
	TeacherName string `json:"teacher_name"`
	Subject     string `json:"subject"`
	Comment     string `json:"comment"`
	Date        string `json:"date"`
}

type GroupFinalGradesResponse struct {
	GroupID   string              `json:"group_id"`
	GroupName string              `json:"group_name"`
	Students  []StudentFinalGrade `json:"students"`
	Summary   FinalGradeSummary   `json:"summary"`
}

type StudentFinalGrade struct {
	StudentID      string  `json:"student_id"`
	FirstName      string  `json:"first_name"`
	LastName       string  `json:"last_name"`
	OverallGPA     float64 `json:"overall_gpa"`
	OverallGrade   string  `json:"overall_grade"`
	Status         string  `json:"status"`
	Rank           int     `json:"rank"`
	AttendanceRate float64 `json:"attendance_rate"`
	Credits        int     `json:"credits"`
}

type FinalGradeSummary struct {
	AverageGPA  float64 `json:"average_gpa"`
	PassingRate float64 `json:"passing_rate"`
	HonorRoll   int     `json:"honor_roll"`
	AtRisk      int     `json:"at_risk"`
	Graduated   int     `json:"graduated"`
}

type MonthlyTrend struct {
	Month       string  `json:"month"`
	Students    int     `json:"students"`
	Teachers    int     `json:"teachers"`
	Attendance  float64 `json:"attendance"`
	Performance float64 `json:"performance"`
}

type GradeDistribution struct {
	Grade      string  `json:"grade"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}
