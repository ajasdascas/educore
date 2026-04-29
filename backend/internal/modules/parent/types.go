package parent

import "time"

// Request DTOs
type SendMessageRequest struct {
	RecipientID string `json:"recipient_id" validate:"required"`
	Subject     string `json:"subject" validate:"required,max=200"`
	Content     string `json:"content" validate:"required,max=2000"`
	Priority    string `json:"priority"`
}

type UpdateProfileRequest struct {
	FirstName         string          `json:"first_name"`
	LastName          string          `json:"last_name"`
	Email             string          `json:"email"`
	Phone             string          `json:"phone"`
	Address           string          `json:"address"`
	EmergencyContact  string          `json:"emergency_contact"`
	EmergencyPhone    string          `json:"emergency_phone"`
	NotificationPrefs map[string]bool `json:"notification_preferences"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
	ConfirmPassword string `json:"confirm_password" validate:"required"`
}

type ConsentUpdateRequest struct {
	Action string `json:"action" validate:"required"`
	Notes  string `json:"notes"`
}

// Response DTOs
type ParentDashboardResponse struct {
	Children       []ChildSummaryResponse `json:"children"`
	RecentActivity []ActivitySummary      `json:"recent_activity"`
	UpcomingEvents []EventSummary         `json:"upcoming_events"`
	Notifications  []NotificationSummary  `json:"recent_notifications"`
	QuickStats     *ParentQuickStats      `json:"quick_stats"`
	LastUpdated    time.Time              `json:"last_updated"`
}

type ParentQuickStats struct {
	TotalChildren       int     `json:"total_children"`
	OverallAttendance   float64 `json:"overall_attendance"`
	OverallGPA          float64 `json:"overall_gpa"`
	UnreadNotifications int     `json:"unread_notifications"`
	UpcomingEvents      int     `json:"upcoming_events"`
	PendingAssignments  int     `json:"pending_assignments"`
}

type ParentDocumentResponse struct {
	ID          string    `json:"id"`
	StudentID   string    `json:"student_id"`
	StudentName string    `json:"student_name"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	FileName    string    `json:"file_name"`
	FileURL     string    `json:"file_url"`
	MimeType    string    `json:"mime_type"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type ParentPaymentResponse struct {
	ID            string     `json:"id"`
	StudentID     string     `json:"student_id"`
	StudentName   string     `json:"student_name"`
	Concept       string     `json:"concept"`
	Description   string     `json:"description"`
	Amount        float64    `json:"amount"`
	Currency      string     `json:"currency"`
	DueDate       string     `json:"due_date"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
	PaymentMethod string     `json:"payment_method"`
	ReceiptNumber string     `json:"receipt_number"`
	ReceiptURL    string     `json:"receipt_url"`
	Status        string     `json:"status"`
}

type ParentPaymentSummary struct {
	TotalDue     float64 `json:"total_due"`
	TotalPaid    float64 `json:"total_paid"`
	OverdueCount int     `json:"overdue_count"`
	PendingCount int     `json:"pending_count"`
	Currency     string  `json:"currency"`
}

type ParentPaymentsResponse struct {
	Payments []ParentPaymentResponse `json:"payments"`
	Summary  ParentPaymentSummary    `json:"summary"`
}

type ParentConsentResponse struct {
	ID          string     `json:"id"`
	StudentID   string     `json:"student_id"`
	StudentName string     `json:"student_name"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Category    string     `json:"category"`
	DueDate     string     `json:"due_date"`
	Status      string     `json:"status"`
	SignedAt    *time.Time `json:"signed_at,omitempty"`
	Notes       string     `json:"notes"`
	CreatedAt   time.Time  `json:"created_at"`
}

type ParentReportSummaryResponse struct {
	ChildrenCount      int       `json:"children_count"`
	AverageAttendance  float64   `json:"average_attendance"`
	AverageGrade       float64   `json:"average_grade"`
	PendingPayments    float64   `json:"pending_payments"`
	PendingConsents    int       `json:"pending_consents"`
	UnreadMessages     int       `json:"unread_messages"`
	DocumentsAvailable int       `json:"documents_available"`
	LastUpdated        time.Time `json:"last_updated"`
}

type ChildSummaryResponse struct {
	ID             string    `json:"id"`
	FirstName      string    `json:"first_name"`
	LastName       string    `json:"last_name"`
	EnrollmentID   string    `json:"enrollment_id"`
	GroupName      string    `json:"group_name"`
	GradeName      string    `json:"grade_name"`
	Status         string    `json:"status"`
	AttendanceRate float64   `json:"attendance_rate"`
	CurrentGPA     float64   `json:"current_gpa"`
	LastAttendance string    `json:"last_attendance"`
	NextClass      string    `json:"next_class"`
	RecentGrade    string    `json:"recent_grade"`
	ProfilePhoto   string    `json:"profile_photo"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ChildDetailResponse struct {
	*ChildSummaryResponse
	BirthDate           string           `json:"birth_date"`
	Address             string           `json:"address"`
	TeacherName         string           `json:"teacher_name"`
	TeacherEmail        string           `json:"teacher_email"`
	Schedule            []ScheduleItem   `json:"schedule"`
	RecentAttendance    []AttendanceItem `json:"recent_attendance"`
	RecentGrades        []GradeItem      `json:"recent_grades"`
	UpcomingAssignments []AssignmentItem `json:"upcoming_assignments"`
	Behavior            *BehaviorSummary `json:"behavior"`
	EmergencyInfo       *EmergencyInfo   `json:"emergency_info"`
}

type ChildGradesResponse struct {
	ChildID      string             `json:"child_id"`
	ChildName    string             `json:"child_name"`
	Period       string             `json:"period"`
	OverallGPA   float64            `json:"overall_gpa"`
	OverallGrade string             `json:"overall_grade"`
	Subjects     []SubjectGradeInfo `json:"subjects"`
	TrendData    []GradeTrend       `json:"trend_data"`
	Summary      *GradesSummary     `json:"summary"`
	LastUpdated  time.Time          `json:"last_updated"`
}

type SubjectGradeInfo struct {
	SubjectID    string      `json:"subject_id"`
	SubjectName  string      `json:"subject_name"`
	TeacherName  string      `json:"teacher_name"`
	CurrentGrade float64     `json:"current_grade"`
	LetterGrade  string      `json:"letter_grade"`
	Assignments  []GradeItem `json:"assignments"`
	Trend        string      `json:"trend"` // "improving", "declining", "stable"
	LastUpdated  time.Time   `json:"last_updated"`
}

type GradeItem struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Type        string    `json:"type"`
	Score       float64   `json:"score"`
	MaxScore    float64   `json:"max_score"`
	Percentage  float64   `json:"percentage"`
	LetterGrade string    `json:"letter_grade"`
	Date        string    `json:"date"`
	Subject     string    `json:"subject"`
	TeacherName string    `json:"teacher_name"`
	Comments    string    `json:"comments"`
	CreatedAt   time.Time `json:"created_at"`
}

type GradeTrend struct {
	Period string  `json:"period"`
	GPA    float64 `json:"gpa"`
	Change float64 `json:"change"`
}

type GradesSummary struct {
	HighestGrade     float64 `json:"highest_grade"`
	LowestGrade      float64 `json:"lowest_grade"`
	AverageGrade     float64 `json:"average_grade"`
	TotalAssignments int     `json:"total_assignments"`
	PassingRate      float64 `json:"passing_rate"`
	ImprovementTrend string  `json:"improvement_trend"`
}

type ChildAttendanceResponse struct {
	ChildID   string              `json:"child_id"`
	ChildName string              `json:"child_name"`
	StartDate string              `json:"start_date"`
	EndDate   string              `json:"end_date"`
	Records   []AttendanceRecord  `json:"records"`
	Summary   *AttendanceSummary  `json:"summary"`
	TrendData []AttendanceTrend   `json:"trend_data"`
	Patterns  *AttendancePatterns `json:"patterns"`
}

type AttendanceRecord struct {
	Date       string `json:"date"`
	Status     string `json:"status"`
	CheckIn    string `json:"check_in"`
	CheckOut   string `json:"check_out"`
	Notes      string `json:"notes"`
	ExcuseNote string `json:"excuse_note"`
}

type AttendanceItem struct {
	Date     string `json:"date"`
	Status   string `json:"status"`
	Notes    string `json:"notes"`
	CheckIn  string `json:"check_in"`
	CheckOut string `json:"check_out"`
}

type AttendanceSummary struct {
	TotalDays   int     `json:"total_days"`
	PresentDays int     `json:"present_days"`
	AbsentDays  int     `json:"absent_days"`
	LateDays    int     `json:"late_days"`
	ExcusedDays int     `json:"excused_days"`
	Rate        float64 `json:"rate"`
	OnTimeRate  float64 `json:"on_time_rate"`
}

type AttendanceTrend struct {
	Week string  `json:"week"`
	Rate float64 `json:"rate"`
}

type AttendancePatterns struct {
	MostAbsentDay       string `json:"most_absent_day"`
	MostLateDay         string `json:"most_late_day"`
	BestAttendanceMonth string `json:"best_attendance_month"`
	NeedsAttention      bool   `json:"needs_attention"`
}

type ChildScheduleResponse struct {
	ChildID        string        `json:"child_id"`
	ChildName      string        `json:"child_name"`
	GroupName      string        `json:"group_name"`
	WeeklySchedule []ScheduleDay `json:"weekly_schedule"`
	CurrentPeriod  *ScheduleItem `json:"current_period"`
	NextPeriod     *ScheduleItem `json:"next_period"`
	SpecialEvents  []EventItem   `json:"special_events"`
}

type ScheduleDay struct {
	DayOfWeek string         `json:"day_of_week"`
	Date      string         `json:"date"`
	Periods   []ScheduleItem `json:"periods"`
	IsToday   bool           `json:"is_today"`
}

type ScheduleItem struct {
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	Subject     string `json:"subject"`
	TeacherName string `json:"teacher_name"`
	Room        string `json:"room"`
	IsNow       bool   `json:"is_now"`
	IsNext      bool   `json:"is_next"`
}

type ChildReportCardResponse struct {
	ChildID         string           `json:"child_id"`
	ChildName       string           `json:"child_name"`
	Period          string           `json:"period"`
	GradeName       string           `json:"grade_name"`
	GroupName       string           `json:"group_name"`
	OverallGPA      float64          `json:"overall_gpa"`
	OverallGrade    string           `json:"overall_grade"`
	Rank            int              `json:"rank"`
	TotalStudents   int              `json:"total_students"`
	AttendanceRate  float64          `json:"attendance_rate"`
	SubjectGrades   []ReportSubject  `json:"subject_grades"`
	BehaviorGrades  []BehaviorGrade  `json:"behavior_grades"`
	TeacherComments []TeacherComment `json:"teacher_comments"`
	Achievements    []Achievement    `json:"achievements"`
	Recommendations []string         `json:"recommendations"`
	GeneratedAt     time.Time        `json:"generated_at"`
	Status          string           `json:"status"`
}

type ReportSubject struct {
	SubjectName   string  `json:"subject_name"`
	TeacherName   string  `json:"teacher_name"`
	Grade         float64 `json:"grade"`
	LetterGrade   string  `json:"letter_grade"`
	Credits       int     `json:"credits"`
	Effort        string  `json:"effort"`
	Participation string  `json:"participation"`
}

type BehaviorGrade struct {
	Category string `json:"category"`
	Rating   string `json:"rating"`
	Comments string `json:"comments"`
}

type TeacherComment struct {
	TeacherName string `json:"teacher_name"`
	Subject     string `json:"subject"`
	Comment     string `json:"comment"`
	Date        string `json:"date"`
}

type Achievement struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Date        string `json:"date"`
	Category    string `json:"category"`
}

type ChildTeacherResponse struct {
	TeacherID    string `json:"teacher_id"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	Subject      string `json:"subject"`
	Role         string `json:"role"`
	OfficeHours  string `json:"office_hours"`
	Room         string `json:"room"`
	ProfilePhoto string `json:"profile_photo"`
	Bio          string `json:"bio"`
	CanMessage   bool   `json:"can_message"`
	LastContact  string `json:"last_contact"`
}

type ChildAssignmentResponse struct {
	Assignments []AssignmentItem    `json:"assignments"`
	Summary     *AssignmentsSummary `json:"summary"`
	Subjects    []string            `json:"subjects"`
}

type AssignmentItem struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Subject     string    `json:"subject"`
	TeacherName string    `json:"teacher_name"`
	Type        string    `json:"type"`
	Description string    `json:"description"`
	DueDate     string    `json:"due_date"`
	Status      string    `json:"status"`
	Grade       *float64  `json:"grade,omitempty"`
	MaxGrade    float64   `json:"max_grade"`
	IsLate      bool      `json:"is_late"`
	DaysLate    int       `json:"days_late"`
	Priority    string    `json:"priority"`
	CreatedAt   time.Time `json:"created_at"`
}

type AssignmentsSummary struct {
	Total     int `json:"total"`
	Pending   int `json:"pending"`
	Submitted int `json:"submitted"`
	Graded    int `json:"graded"`
	Overdue   int `json:"overdue"`
}

type NotificationResponse struct {
	ID         string                 `json:"id"`
	Title      string                 `json:"title"`
	Message    string                 `json:"message"`
	Type       string                 `json:"type"`
	Priority   string                 `json:"priority"`
	IsRead     bool                   `json:"is_read"`
	ChildName  string                 `json:"child_name,omitempty"`
	SenderName string                 `json:"sender_name"`
	ActionURL  string                 `json:"action_url,omitempty"`
	Metadata   map[string]interface{} `json:"metadata"`
	CreatedAt  time.Time              `json:"created_at"`
	ReadAt     *time.Time             `json:"read_at,omitempty"`
}

type NotificationSummary struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Type      string    `json:"type"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

type MessageResponse struct {
	ID              string     `json:"id"`
	ConversationID  string     `json:"conversation_id"`
	SenderName      string     `json:"sender_name"`
	RecipientName   string     `json:"recipient_name"`
	Subject         string     `json:"subject"`
	Content         string     `json:"content"`
	IsRead          bool       `json:"is_read"`
	Priority        string     `json:"priority"`
	HasAttachments  bool       `json:"has_attachments"`
	ParentMessageID *string    `json:"parent_message_id,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	ReadAt          *time.Time `json:"read_at,omitempty"`
}

type CalendarResponse struct {
	Month      int            `json:"month"`
	Year       int            `json:"year"`
	Days       []CalendarDay  `json:"days"`
	Events     []EventItem    `json:"events"`
	Holidays   []HolidayItem  `json:"holidays"`
	Statistics *CalendarStats `json:"statistics"`
}

type CalendarDay struct {
	Date             string      `json:"date"`
	DayOfWeek        int         `json:"day_of_week"`
	IsToday          bool        `json:"is_today"`
	IsWeekend        bool        `json:"is_weekend"`
	IsHoliday        bool        `json:"is_holiday"`
	HasEvents        bool        `json:"has_events"`
	EventCount       int         `json:"event_count"`
	Events           []EventItem `json:"events"`
	AttendanceStatus string      `json:"attendance_status,omitempty"`
}

type EventResponse struct {
	Events      []EventItem            `json:"events"`
	GroupedBy   map[string][]EventItem `json:"grouped_by"`
	Summary     *EventsSummary         `json:"summary"`
	ChildFilter []string               `json:"child_filter"`
}

type EventItem struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Type        string    `json:"type"`
	StartDate   string    `json:"start_date"`
	EndDate     string    `json:"end_date"`
	StartTime   string    `json:"start_time"`
	EndTime     string    `json:"end_time"`
	Location    string    `json:"location"`
	IsAllDay    bool      `json:"is_all_day"`
	IsRecurring bool      `json:"is_recurring"`
	ChildName   string    `json:"child_name,omitempty"`
	Category    string    `json:"category"`
	Priority    string    `json:"priority"`
	CreatedAt   time.Time `json:"created_at"`
}

type EventSummary struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Date      string `json:"date"`
	Time      string `json:"time"`
	Type      string `json:"type"`
	ChildName string `json:"child_name,omitempty"`
}

type HolidayItem struct {
	Name       string `json:"name"`
	Date       string `json:"date"`
	IsNational bool   `json:"is_national"`
	IsSchool   bool   `json:"is_school"`
}

type CalendarStats struct {
	TotalEvents int `json:"total_events"`
	SchoolDays  int `json:"school_days"`
	Holidays    int `json:"holidays"`
	Weekends    int `json:"weekends"`
}

type EventsSummary struct {
	Total    int            `json:"total"`
	ByType   map[string]int `json:"by_type"`
	ByChild  map[string]int `json:"by_child"`
	Upcoming int            `json:"upcoming"`
	ThisWeek int            `json:"this_week"`
}

type ParentProfileResponse struct {
	ID                string                 `json:"id"`
	FirstName         string                 `json:"first_name"`
	LastName          string                 `json:"last_name"`
	Email             string                 `json:"email"`
	Phone             string                 `json:"phone"`
	Address           string                 `json:"address"`
	EmergencyContact  string                 `json:"emergency_contact"`
	EmergencyPhone    string                 `json:"emergency_phone"`
	Children          []ChildSummaryResponse `json:"children"`
	NotificationPrefs map[string]bool        `json:"notification_preferences"`
	LastLogin         time.Time              `json:"last_login"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
}

// Supporting types
type ActivitySummary struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	ChildName   string    `json:"child_name,omitempty"`
	Timestamp   time.Time `json:"timestamp"`
	ActionURL   string    `json:"action_url,omitempty"`
}

type BehaviorSummary struct {
	OverallRating   string                `json:"overall_rating"`
	RecentIncidents []BehaviorIncident    `json:"recent_incidents"`
	Improvements    []BehaviorImprovement `json:"improvements"`
	Goals           []BehaviorGoal        `json:"goals"`
}

type BehaviorIncident struct {
	Date        string `json:"date"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Severity    string `json:"severity"`
	Action      string `json:"action"`
}

type BehaviorImprovement struct {
	Area        string `json:"area"`
	Description string `json:"description"`
	Date        string `json:"date"`
}

type BehaviorGoal struct {
	Goal       string `json:"goal"`
	Progress   string `json:"progress"`
	TargetDate string `json:"target_date"`
	Status     string `json:"status"`
}

type EmergencyInfo struct {
	PrimaryContact    string `json:"primary_contact"`
	PrimaryPhone      string `json:"primary_phone"`
	SecondaryContact  string `json:"secondary_contact"`
	SecondaryPhone    string `json:"secondary_phone"`
	MedicalConditions string `json:"medical_conditions"`
	Medications       string `json:"medications"`
	Allergies         string `json:"allergies"`
	DoctorName        string `json:"doctor_name"`
	DoctorPhone       string `json:"doctor_phone"`
	Insurance         string `json:"insurance"`
}
