package student

type StudentProfile struct {
	ID             string  `json:"id" db:"id"`
	TenantID       string  `json:"tenant_id" db:"tenant_id"`
	FirstName      string  `json:"first_name" db:"first_name"`
	LastName       string  `json:"last_name" db:"last_name"`
	LastNameMother string  `json:"last_name_mother" db:"last_name_mother"`
	Email          string  `json:"email" db:"email"`
	GroupID        *string `json:"group_id" db:"group_id"`
	GroupName      *string `json:"group_name" db:"group_name"`
	GradeName      *string `json:"grade_name" db:"grade_name"`
	EnrollmentNum  string  `json:"enrollment_number" db:"enrollment_number"`
	Status         string  `json:"status" db:"status"`
}

type StudentDashboardResponse struct {
	Student        StudentProfile    `json:"student"`
	RecentGrades   []GradeSummary    `json:"recent_grades"`
	AttendanceSummary AttendanceSummary `json:"attendance_summary"`
	RecentMessages []MessageSummary  `json:"recent_messages"`
}

type GradeSummary struct {
	SubjectName  string  `json:"subject_name"`
	Grade        float64 `json:"grade"`
	Period       string  `json:"period"`
	EvalType     string  `json:"eval_type"`
	RecordedDate string  `json:"recorded_date"`
}

type AttendanceSummary struct {
	TotalDays   int     `json:"total_days"`
	Present     int     `json:"present"`
	Absent      int     `json:"absent"`
	Late        int     `json:"late"`
	Rate        float64 `json:"rate"`
}

type MessageSummary struct {
	ID        string `json:"id"`
	From      string `json:"from"`
	Subject   string `json:"subject"`
	Preview   string `json:"preview"`
	SentAt    string `json:"sent_at"`
	IsRead    bool   `json:"is_read"`
}
