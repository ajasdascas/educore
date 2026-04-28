package reports

import (
	"time"
)

// Request types
type GenerateReportRequest struct {
	Type      string    `json:"type" validate:"required,oneof=attendance grades behavior financial academic_summary"`
	StartDate string    `json:"start_date" validate:"required"`
	EndDate   string    `json:"end_date" validate:"required"`
	Format    string    `json:"format" validate:"required,oneof=pdf excel csv"`
	Filters   ReportFilters `json:"filters"`
}

type ReportFilters struct {
	GroupIDs   []string `json:"group_ids,omitempty"`
	StudentIDs []string `json:"student_ids,omitempty"`
	TeacherIDs []string `json:"teacher_ids,omitempty"`
	SubjectIDs []string `json:"subject_ids,omitempty"`
	Grades     []string `json:"grades,omitempty"`
}

type ScheduleReportRequest struct {
	ReportID string `json:"report_id" validate:"required"`
	Schedule string `json:"schedule" validate:"required,oneof=daily weekly monthly"`
	Recipients []string `json:"recipients" validate:"required,dive,email"`
}

// Response types
type ReportResponse struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenant_id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Status      string    `json:"status"`
	Format      string    `json:"format"`
	FileURL     *string   `json:"file_url,omitempty"`
	GeneratedBy string    `json:"generated_by"`
	StartDate   string    `json:"start_date"`
	EndDate     string    `json:"end_date"`
	CreatedAt   time.Time `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

type ReportTemplateResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Description string    `json:"description"`
	Fields      []ReportField `json:"fields"`
	CreatedAt   time.Time `json:"created_at"`
}

type ReportField struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Options     []string `json:"options,omitempty"`
}

type AttendanceReportResponse struct {
	Summary AttendanceSummary `json:"summary"`
	Details []AttendanceDetail `json:"details"`
	Period  ReportPeriod `json:"period"`
}

type AttendanceSummary struct {
	TotalDays      int     `json:"total_days"`
	PresentDays    int     `json:"present_days"`
	AbsentDays     int     `json:"absent_days"`
	LateDays       int     `json:"late_days"`
	ExcusedDays    int     `json:"excused_days"`
	AttendanceRate float64 `json:"attendance_rate"`
}

type AttendanceDetail struct {
	Date        string `json:"date"`
	StudentID   string `json:"student_id"`
	StudentName string `json:"student_name"`
	GroupName   string `json:"group_name"`
	Status      string `json:"status"`
	Notes       *string `json:"notes,omitempty"`
}

type GradesReportResponse struct {
	Summary GradesSummary `json:"summary"`
	Details []GradeDetail `json:"details"`
	Period  ReportPeriod `json:"period"`
}

type GradesSummary struct {
	TotalStudents    int     `json:"total_students"`
	PassingStudents  int     `json:"passing_students"`
	FailingStudents  int     `json:"failing_students"`
	AverageGrade     float64 `json:"average_grade"`
	HighestGrade     float64 `json:"highest_grade"`
	LowestGrade      float64 `json:"lowest_grade"`
}

type GradeDetail struct {
	StudentID     string  `json:"student_id"`
	StudentName   string  `json:"student_name"`
	GroupName     string  `json:"group_name"`
	SubjectName   string  `json:"subject_name"`
	Grade         float64 `json:"grade"`
	MaxGrade      float64 `json:"max_grade"`
	TeacherName   string  `json:"teacher_name"`
	EvaluationDate string `json:"evaluation_date"`
}

type FinancialReportResponse struct {
	Summary FinancialSummary `json:"summary"`
	Details []FinancialDetail `json:"details"`
	Period  ReportPeriod `json:"period"`
}

type FinancialSummary struct {
	TotalRevenue   float64 `json:"total_revenue"`
	PaidAmount     float64 `json:"paid_amount"`
	PendingAmount  float64 `json:"pending_amount"`
	OverdueAmount  float64 `json:"overdue_amount"`
	CollectionRate float64 `json:"collection_rate"`
}

type FinancialDetail struct {
	StudentID      string  `json:"student_id"`
	StudentName    string  `json:"student_name"`
	GroupName      string  `json:"group_name"`
	ConceptName    string  `json:"concept_name"`
	Amount         float64 `json:"amount"`
	PaidAmount     float64 `json:"paid_amount"`
	PendingAmount  float64 `json:"pending_amount"`
	DueDate        string  `json:"due_date"`
	Status         string  `json:"status"`
}

type AcademicSummaryResponse struct {
	Overview AcademicOverview `json:"overview"`
	Attendance AttendanceSummary `json:"attendance"`
	Grades GradesSummary `json:"grades"`
	Groups []GroupSummary `json:"groups"`
	Period ReportPeriod `json:"period"`
}

type AcademicOverview struct {
	TotalStudents   int `json:"total_students"`
	TotalTeachers   int `json:"total_teachers"`
	TotalGroups     int `json:"total_groups"`
	TotalSubjects   int `json:"total_subjects"`
	ActiveStudents  int `json:"active_students"`
	InactiveStudents int `json:"inactive_students"`
}

type GroupSummary struct {
	GroupID         string  `json:"group_id"`
	GroupName       string  `json:"group_name"`
	StudentCount    int     `json:"student_count"`
	AttendanceRate  float64 `json:"attendance_rate"`
	AverageGrade    float64 `json:"average_grade"`
	TeacherName     string  `json:"teacher_name"`
}

type ReportPeriod struct {
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Type      string `json:"type"`
}

type ReportJobResponse struct {
	ID          string    `json:"id"`
	ReportID    string    `json:"report_id"`
	Status      string    `json:"status"`
	Progress    int       `json:"progress"`
	Message     *string   `json:"message,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

type AnalyticsResponse struct {
	Metrics []MetricData `json:"metrics"`
	Charts  []ChartData  `json:"charts"`
	Period  ReportPeriod `json:"period"`
}

type MetricData struct {
	Key         string      `json:"key"`
	Label       string      `json:"label"`
	Value       interface{} `json:"value"`
	Type        string      `json:"type"`
	Trend       *TrendData  `json:"trend,omitempty"`
	Comparison  *ComparisonData `json:"comparison,omitempty"`
}

type TrendData struct {
	Direction string  `json:"direction"` // up, down, stable
	Percentage float64 `json:"percentage"`
	Period     string  `json:"period"`
}

type ComparisonData struct {
	Previous   interface{} `json:"previous"`
	Current    interface{} `json:"current"`
	Difference interface{} `json:"difference"`
}

type ChartData struct {
	Type   string      `json:"type"` // line, bar, pie, area
	Title  string      `json:"title"`
	Data   []DataPoint `json:"data"`
	Config ChartConfig `json:"config"`
}

type DataPoint struct {
	Label string      `json:"label"`
	Value interface{} `json:"value"`
	Extra map[string]interface{} `json:"extra,omitempty"`
}

type ChartConfig struct {
	XAxisLabel string `json:"x_axis_label,omitempty"`
	YAxisLabel string `json:"y_axis_label,omitempty"`
	Colors     []string `json:"colors,omitempty"`
}

// Export types
type ExportConfigRequest struct {
	Format    string            `json:"format" validate:"required,oneof=pdf excel csv"`
	Template  string            `json:"template,omitempty"`
	Options   ExportOptions     `json:"options"`
}

type ExportOptions struct {
	IncludeCharts   bool     `json:"include_charts"`
	IncludeDetails  bool     `json:"include_details"`
	Orientation     string   `json:"orientation,omitempty"` // portrait, landscape
	PageSize        string   `json:"page_size,omitempty"`   // A4, Letter
	Columns         []string `json:"columns,omitempty"`
	CustomTitle     string   `json:"custom_title,omitempty"`
	IncludeLogo     bool     `json:"include_logo"`
}