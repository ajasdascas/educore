package school_admin

import "time"

// Request DTOs
type GetStudentsParams struct {
	Page    int    `json:"page"`
	PerPage int    `json:"per_page"`
	Search  string `json:"search"`
	GroupID string `json:"group_id"`
	GradeID string `json:"grade_id"`
	Status  string `json:"status"`
	SortBy  string `json:"sort_by"`
	SortDir string `json:"sort_dir"`
}

type CreateStudentRequest struct {
	FirstName        string        `json:"first_name" validate:"required,min=2,max=100"`
	PaternalLastName string        `json:"paternal_last_name"`
	MaternalLastName string        `json:"maternal_last_name"`
	LastName         string        `json:"last_name"`
	Email            string        `json:"email"`
	Phone            string        `json:"phone"`
	BirthDate        string        `json:"birth_date"`
	BirthDay         string        `json:"birth_day"`
	BirthMonth       string        `json:"birth_month"`
	BirthYear        string        `json:"birth_year"`
	Address          string        `json:"address"`
	GroupID          string        `json:"group_id"`
	ParentName       string        `json:"parent_name"`
	ParentEmail      string        `json:"parent_email"`
	ParentPhone      string        `json:"parent_phone"`
	Parents          []ParentInput `json:"parents"`
	EnrollmentID     string        `json:"enrollment_id" validate:"required"`
	Status           string        `json:"status"`
}

type UpdateStudentRequest struct {
	FirstName        string        `json:"first_name"`
	PaternalLastName string        `json:"paternal_last_name"`
	MaternalLastName string        `json:"maternal_last_name"`
	LastName         string        `json:"last_name"`
	Email            string        `json:"email"`
	Phone            string        `json:"phone"`
	BirthDate        string        `json:"birth_date"`
	BirthDay         string        `json:"birth_day"`
	BirthMonth       string        `json:"birth_month"`
	BirthYear        string        `json:"birth_year"`
	Address          string        `json:"address"`
	GroupID          string        `json:"group_id"`
	ParentName       string        `json:"parent_name"`
	ParentEmail      string        `json:"parent_email"`
	ParentPhone      string        `json:"parent_phone"`
	Parents          []ParentInput `json:"parents"`
	EnrollmentID     string        `json:"enrollment_id"`
	Status           string        `json:"status"`
}

type ParentInput struct {
	FirstName        string `json:"first_name"`
	PaternalLastName string `json:"paternal_last_name"`
	MaternalLastName string `json:"maternal_last_name"`
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	Relationship     string `json:"relationship"`
	IsPrimary        bool   `json:"is_primary"`
	Notes            string `json:"notes"`
}

type StudentImportCommitRequest struct {
	Rows        []map[string]string `json:"rows"`
	Mapping     map[string]string   `json:"mapping"`
	SourceSheet string              `json:"source_sheet"`
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

type EnabledModuleResponse struct {
	Key             string  `json:"key"`
	Name            string  `json:"name"`
	Description     string  `json:"description"`
	Layer           string  `json:"layer"`
	Level           string  `json:"level"`
	IsCore          bool    `json:"is_core"`
	IsRequired      bool    `json:"is_required"`
	Enabled         bool    `json:"enabled"`
	Source          string  `json:"source"`
	PriceMonthlyMXN float64 `json:"price_monthly_mxn"`
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
	Status    string `json:"status" validate:"required,oneof=present absent late sick excused"`
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

type CreateStudentDocumentRequest struct {
	StudentID     string `json:"student_id" validate:"required"`
	Title         string `json:"title" validate:"required"`
	Description   string `json:"description"`
	Category      string `json:"category"`
	FileName      string `json:"file_name"`
	FileURL       string `json:"file_url"`
	FileSize      int64  `json:"file_size"`
	MimeType      string `json:"mime_type"`
	StorageStatus string `json:"storage_status"`
}

type GenerateReportCardRequest struct {
	StudentID         string `json:"student_id" validate:"required"`
	Period            string `json:"period"`
	IncludeAttendance bool   `json:"include_attendance"`
	IncludeComments   bool   `json:"include_comments"`
	PersistAsDocument bool   `json:"persist_as_document"`
	ConfirmationText  string `json:"confirmation_text"`
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
	ID               string          `json:"id"`
	FirstName        string          `json:"first_name"`
	PaternalLastName string          `json:"paternal_last_name"`
	MaternalLastName string          `json:"maternal_last_name"`
	LastName         string          `json:"last_name"`
	Email            string          `json:"email"`
	Phone            string          `json:"phone"`
	EnrollmentID     string          `json:"enrollment_id"`
	Status           string          `json:"status"`
	GroupID          string          `json:"group_id"`
	GroupName        string          `json:"group_name"`
	GradeName        string          `json:"grade_name"`
	ParentName       string          `json:"parent_name"`
	ParentEmail      string          `json:"parent_email"`
	ParentPhone      string          `json:"parent_phone"`
	Parents          []ParentContact `json:"parents"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type StudentDetailResponse struct {
	*StudentResponse
	BirthDate        string                    `json:"birth_date"`
	BirthDay         string                    `json:"birth_day"`
	BirthMonth       string                    `json:"birth_month"`
	BirthYear        string                    `json:"birth_year"`
	Address          string                    `json:"address"`
	AttendanceRate   float64                   `json:"attendance_rate"`
	AverageGrade     float64                   `json:"average_grade"`
	TotalAbsences    int                       `json:"total_absences"`
	AcademicHistory  []AcademicHistoryItem     `json:"academic_history"`
	RecentGrades     []GradeResponse           `json:"recent_grades"`
	RecentAttendance []AttendanceItem          `json:"recent_attendance"`
	Schedule         []ScheduleBlockResponse   `json:"schedule"`
	Documents        []StudentDocumentResponse `json:"documents"`
	Observations     []StudentObservation      `json:"observations"`
}

type StudentDocumentResponse struct {
	ID            string    `json:"id"`
	StudentID     string    `json:"student_id"`
	StudentName   string    `json:"student_name"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	Category      string    `json:"category"`
	FileName      string    `json:"file_name"`
	FileURL       string    `json:"file_url"`
	FileSize      int64     `json:"file_size"`
	MimeType      string    `json:"mime_type"`
	StorageStatus string    `json:"storage_status"`
	IsVerified    bool      `json:"is_verified"`
	VerifiedAt    string    `json:"verified_at"`
	VerifiedBy    string    `json:"verified_by"`
	Status        string    `json:"status"`
	UploadedBy    string    `json:"uploaded_by"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type StudentObservation struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Note      string    `json:"note"`
	Author    string    `json:"author"`
	CreatedAt time.Time `json:"created_at"`
}

type ParentContact struct {
	ID               string `json:"id"`
	FirstName        string `json:"first_name"`
	PaternalLastName string `json:"paternal_last_name"`
	MaternalLastName string `json:"maternal_last_name"`
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	Relationship     string `json:"relationship"`
	IsPrimary        bool   `json:"is_primary"`
	Notes            string `json:"notes"`
}

type AcademicHistoryItem struct {
	ID             string    `json:"id"`
	StudentID      string    `json:"student_id"`
	SchoolYearID   string    `json:"school_year_id"`
	SchoolYear     string    `json:"school_year"`
	GradeName      string    `json:"grade_name"`
	GroupName      string    `json:"group_name"`
	Status         string    `json:"status"`
	AverageGrade   float64   `json:"average_grade"`
	AttendanceRate float64   `json:"attendance_rate"`
	Absences       int       `json:"absences"`
	Notes          string    `json:"notes"`
	CreatedAt      time.Time `json:"created_at"`
}

type StudentImportCommitResponse struct {
	BatchID      string `json:"batch_id"`
	ImportedRows int    `json:"imported"`
	TotalRows    int    `json:"total"`
	ErrorRows    int    `json:"errors"`
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
	Sick    int     `json:"sick"`
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
