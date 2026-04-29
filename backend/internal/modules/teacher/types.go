package teacher

import "time"

type DashboardResponse struct {
	Stats          DashboardStats   `json:"stats"`
	TodayClasses   []TeacherClass   `json:"today_classes"`
	Alerts         []TeacherAlert   `json:"alerts"`
	RecentMessages []TeacherMessage `json:"recent_messages"`
	LastUpdated    time.Time        `json:"last_updated"`
}

type DashboardStats struct {
	TotalGroups       int     `json:"total_groups"`
	TotalStudents     int     `json:"total_students"`
	TodayClasses      int     `json:"today_classes"`
	PendingAttendance int     `json:"pending_attendance"`
	PendingGrades     int     `json:"pending_grades"`
	AverageGrade      float64 `json:"average_grade"`
}

type TeacherClass struct {
	ID           string    `json:"id"`
	GroupID      string    `json:"group_id"`
	GroupName    string    `json:"group_name"`
	GradeName    string    `json:"grade_name"`
	SubjectID    string    `json:"subject_id"`
	SubjectName  string    `json:"subject_name"`
	Day          string    `json:"day"`
	StartTime    string    `json:"start_time"`
	EndTime      string    `json:"end_time"`
	Room         string    `json:"room"`
	StudentCount int       `json:"student_count"`
	Status       string    `json:"status"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type TeacherStudent struct {
	ID             string  `json:"id"`
	FirstName      string  `json:"first_name"`
	LastName       string  `json:"last_name"`
	EnrollmentID   string  `json:"enrollment_id"`
	GroupID        string  `json:"group_id"`
	GroupName      string  `json:"group_name"`
	AttendanceRate float64 `json:"attendance_rate"`
	AverageGrade   float64 `json:"average_grade"`
	LastAttendance string  `json:"last_attendance"`
	Status         string  `json:"status"`
	ParentID       string  `json:"parent_id"`
	ParentName     string  `json:"parent_name"`
}

type AttendanceResponse struct {
	GroupID   string              `json:"group_id"`
	GroupName string              `json:"group_name"`
	Date      string              `json:"date"`
	Students  []AttendanceStudent `json:"students"`
	Summary   AttendanceSummary   `json:"summary"`
}

type AttendanceStudent struct {
	StudentID    string `json:"student_id"`
	StudentName  string `json:"student_name"`
	EnrollmentID string `json:"enrollment_id"`
	Status       string `json:"status"`
	Notes        string `json:"notes"`
}

type AttendanceSummary struct {
	Total   int `json:"total"`
	Present int `json:"present"`
	Absent  int `json:"absent"`
	Late    int `json:"late"`
	Excused int `json:"excused"`
}

type AttendanceRecordRequest struct {
	StudentID string `json:"student_id"`
	Status    string `json:"status"`
	Notes     string `json:"notes"`
}

type AttendanceRequest struct {
	GroupID string                    `json:"group_id"`
	Date    string                    `json:"date"`
	Records []AttendanceRecordRequest `json:"records"`
}

type GradesResponse struct {
	GroupID     string         `json:"group_id"`
	GroupName   string         `json:"group_name"`
	SubjectID   string         `json:"subject_id"`
	SubjectName string         `json:"subject_name"`
	Period      string         `json:"period"`
	Students    []GradeStudent `json:"students"`
	Summary     GradesSummary  `json:"summary"`
}

type GradeStudent struct {
	StudentID    string  `json:"student_id"`
	StudentName  string  `json:"student_name"`
	EnrollmentID string  `json:"enrollment_id"`
	Score        float64 `json:"score"`
	Status       string  `json:"status"`
	Notes        string  `json:"notes"`
}

type GradesSummary struct {
	Total   int     `json:"total"`
	Average float64 `json:"average"`
	Passing int     `json:"passing"`
	AtRisk  int     `json:"at_risk"`
}

type GradeRecordRequest struct {
	StudentID string  `json:"student_id"`
	SubjectID string  `json:"subject_id"`
	Score     float64 `json:"score"`
	Type      string  `json:"type"`
	Notes     string  `json:"notes"`
}

type GradesRequest struct {
	GroupID string               `json:"group_id"`
	Period  string               `json:"period"`
	Grades  []GradeRecordRequest `json:"grades"`
}

type TeacherMessage struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	SenderName     string    `json:"sender_name"`
	RecipientName  string    `json:"recipient_name"`
	Subject        string    `json:"subject"`
	Content        string    `json:"content"`
	Priority       string    `json:"priority"`
	IsRead         bool      `json:"is_read"`
	CreatedAt      time.Time `json:"created_at"`
}

type SendMessageRequest struct {
	RecipientID string `json:"recipient_id"`
	Subject     string `json:"subject"`
	Content     string `json:"content"`
	Priority    string `json:"priority"`
}

type TeacherAlert struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Title    string `json:"title"`
	Message  string `json:"message"`
	Priority string `json:"priority"`
}
