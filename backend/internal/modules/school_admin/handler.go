package school_admin

import (
	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// RegisterRoutes sets up all school admin routes with proper middleware
func (h *Handler) RegisterRoutes(app fiber.Router) {
	// The parent router is already mounted at /api/v1/school-admin in main.go.
	api := app

	// Dashboard & stats
	api.Get("/dashboard", h.GetDashboard)
	api.Get("/stats", h.GetStats)
	api.Get("/settings", h.GetSettings)
	api.Put("/settings", h.UpdateSettings)

	// Academic management
	academic := api.Group("/academic")
	academic.Get("/school-years", h.GetSchoolYears)
	academic.Post("/school-years", h.CreateSchoolYear)
	academic.Put("/school-years/:id", h.UpdateSchoolYear)

	academic.Get("/students", h.GetStudents)
	academic.Post("/students", h.CreateStudent)
	academic.Get("/students/:id", h.GetStudent)
	academic.Put("/students/:id", h.UpdateStudent)
	academic.Delete("/students/:id", h.DeleteStudent)

	academic.Get("/teachers", h.GetTeachers)
	academic.Post("/teachers", h.CreateTeacher)
	academic.Get("/teachers/:id", h.GetTeacher)
	academic.Put("/teachers/:id", h.UpdateTeacher)

	academic.Get("/groups", h.GetGroups)
	academic.Post("/groups", h.CreateGroup)
	academic.Get("/groups/:id", h.GetGroup)
	academic.Put("/groups/:id", h.UpdateGroup)
	academic.Delete("/groups/:id", h.DeleteGroup)

	academic.Get("/subjects", h.GetSubjects)
	academic.Post("/subjects", h.CreateSubject)
	academic.Put("/subjects/:id", h.UpdateSubject)
	academic.Delete("/subjects/:id", h.DeleteSubject)

	academic.Get("/schedule", h.GetSchedule)
	academic.Post("/schedule", h.CreateScheduleBlock)
	academic.Get("/schedule/:id", h.GetScheduleBlock)
	academic.Put("/schedule/:id", h.UpdateScheduleBlock)
	academic.Delete("/schedule/:id", h.DeleteScheduleBlock)

	// Attendance management
	attendance := api.Group("/attendance")
	attendance.Get("/groups/:groupId/today", h.GetTodayAttendance)
	attendance.Post("/groups/:groupId/bulk", h.BulkUpdateAttendance)
	attendance.Get("/students/:studentId/history", h.GetStudentAttendanceHistory)
	attendance.Get("/reports/monthly", h.GetMonthlyAttendanceReport)

	// Grades management
	grades := api.Group("/grades")
	grades.Get("/groups/:groupId/subjects/:subjectId", h.GetGroupGrades)
	grades.Post("/grades/bulk", h.BulkUpdateGrades)
	grades.Get("/students/:studentId/report-card", h.GetStudentReportCard)
	grades.Get("/groups/:groupId/final-grades", h.GetGroupFinalGrades)
}

func (h *Handler) GetSettings(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	settings, err := h.service.GetSettings(c.Context(), tenantID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, settings, "Success")
}

func (h *Handler) UpdateSettings(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	var req UpdateSchoolSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	settings, err := h.service.UpdateSettings(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, settings, "Success")
}

func (h *Handler) GetSchoolYears(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	years, err := h.service.GetSchoolYears(c.Context(), tenantID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, years, "Success")
}

func (h *Handler) CreateSchoolYear(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	var req CreateSchoolYearRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	year, err := h.service.CreateSchoolYear(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, year, "Success")
}

func (h *Handler) UpdateSchoolYear(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	yearID := c.Params("id")
	var req UpdateSchoolYearRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	year, err := h.service.UpdateSchoolYear(c.Context(), tenantID, userID, yearID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, year, "Success")
}

// Dashboard handlers
func (h *Handler) GetDashboard(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	dashboard, err := h.service.GetDashboard(c.Context(), tenantID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, dashboard, "Success")
}

func (h *Handler) GetStats(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	stats, err := h.service.GetStats(c.Context(), tenantID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, stats, "Success")
}

// Student management handlers
func (h *Handler) GetStudents(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	// Parse query parameters
	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)
	search := c.Query("search")
	groupID := c.Query("group_id")
	status := c.Query("status")

	students, total, err := h.service.GetStudents(c.Context(), tenantID, GetStudentsParams{
		Page:    page,
		PerPage: perPage,
		Search:  search,
		GroupID: groupID,
		Status:  status,
	})
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.SuccessWithMeta(c, students, response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

func (h *Handler) CreateStudent(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req CreateStudentRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	student, err := h.service.CreateStudent(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, student, "Success")
}

func (h *Handler) GetStudent(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	studentID := c.Params("id")

	student, err := h.service.GetStudent(c.Context(), tenantID, studentID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}

	return response.Success(c, student, "Success")
}

func (h *Handler) UpdateStudent(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	studentID := c.Params("id")

	var req UpdateStudentRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	student, err := h.service.UpdateStudent(c.Context(), tenantID, userID, studentID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, student, "Success")
}

func (h *Handler) DeleteStudent(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	studentID := c.Params("id")

	err := h.service.DeleteStudent(c.Context(), tenantID, userID, studentID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Student deleted successfully")
}

// Teacher management handlers
func (h *Handler) GetTeachers(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	teachers, err := h.service.GetTeachers(c.Context(), tenantID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, teachers, "Success")
}

func (h *Handler) CreateTeacher(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req CreateTeacherRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	teacher, err := h.service.CreateTeacher(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, teacher, "Success")
}

func (h *Handler) GetTeacher(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	teacherID := c.Params("id")

	teacher, err := h.service.GetTeacher(c.Context(), tenantID, teacherID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}

	return response.Success(c, teacher, "Success")
}

func (h *Handler) UpdateTeacher(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	teacherID := c.Params("id")

	var req UpdateTeacherRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	teacher, err := h.service.UpdateTeacher(c.Context(), tenantID, userID, teacherID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, teacher, "Success")
}

// Group management handlers
func (h *Handler) GetGroups(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	groups, err := h.service.GetGroups(c.Context(), tenantID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, groups, "Success")
}

func (h *Handler) CreateGroup(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req CreateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	group, err := h.service.CreateGroup(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, group, "Success")
}

func (h *Handler) GetGroup(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	groupID := c.Params("id")

	group, err := h.service.GetGroup(c.Context(), tenantID, groupID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}

	return response.Success(c, group, "Success")
}

func (h *Handler) UpdateGroup(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	groupID := c.Params("id")

	var req UpdateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	group, err := h.service.UpdateGroup(c.Context(), tenantID, userID, groupID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, group, "Success")
}

func (h *Handler) DeleteGroup(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	groupID := c.Params("id")

	err := h.service.DeleteGroup(c.Context(), tenantID, userID, groupID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Group deleted successfully")
}

// Subject management handlers
func (h *Handler) GetSubjects(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	subjects, err := h.service.GetSubjects(c.Context(), tenantID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, subjects, "Success")
}

func (h *Handler) CreateSubject(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req CreateSubjectRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	subject, err := h.service.CreateSubject(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, subject, "Success")
}

func (h *Handler) UpdateSubject(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	subjectID := c.Params("id")

	var req UpdateSubjectRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	subject, err := h.service.UpdateSubject(c.Context(), tenantID, userID, subjectID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, subject, "Success")
}

func (h *Handler) DeleteSubject(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	subjectID := c.Params("id")

	if err := h.service.DeleteSubject(c.Context(), tenantID, userID, subjectID); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Subject deleted successfully")
}

func (h *Handler) GetSchedule(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	groupID := c.Query("group_id")
	blocks, err := h.service.GetSchedule(c.Context(), tenantID, groupID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, blocks, "Success")
}

func (h *Handler) CreateScheduleBlock(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	var req CreateScheduleBlockRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	block, err := h.service.CreateScheduleBlock(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, block, "Success")
}

func (h *Handler) GetScheduleBlock(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	blockID := c.Params("id")
	block, err := h.service.GetScheduleBlock(c.Context(), tenantID, blockID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}
	return response.Success(c, block, "Success")
}

func (h *Handler) UpdateScheduleBlock(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	blockID := c.Params("id")
	var req UpdateScheduleBlockRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	block, err := h.service.UpdateScheduleBlock(c.Context(), tenantID, userID, blockID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, block, "Success")
}

func (h *Handler) DeleteScheduleBlock(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	blockID := c.Params("id")
	if err := h.service.DeleteScheduleBlock(c.Context(), tenantID, userID, blockID); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.SuccessMessage(c, "Schedule block deleted successfully")
}

// Attendance handlers
func (h *Handler) GetTodayAttendance(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	groupID := c.Params("groupId")

	attendance, err := h.service.GetTodayAttendance(c.Context(), tenantID, groupID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, attendance, "Success")
}

func (h *Handler) BulkUpdateAttendance(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	groupID := c.Params("groupId")

	var req BulkAttendanceRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	err := h.service.BulkUpdateAttendance(c.Context(), tenantID, userID, groupID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Attendance updated successfully")
}

func (h *Handler) GetStudentAttendanceHistory(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	studentID := c.Params("studentId")

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	history, err := h.service.GetStudentAttendanceHistory(c.Context(), tenantID, studentID, startDate, endDate)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, history, "Success")
}

func (h *Handler) GetMonthlyAttendanceReport(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	year := c.QueryInt("year")
	month := c.QueryInt("month")

	report, err := h.service.GetMonthlyAttendanceReport(c.Context(), tenantID, year, month)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, report, "Success")
}

// Grades handlers
func (h *Handler) GetGroupGrades(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	groupID := c.Params("groupId")
	subjectID := c.Params("subjectId")

	grades, err := h.service.GetGroupGrades(c.Context(), tenantID, groupID, subjectID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, grades, "Success")
}

func (h *Handler) BulkUpdateGrades(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req BulkGradesRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	err := h.service.BulkUpdateGrades(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Grades updated successfully")
}

func (h *Handler) GetStudentReportCard(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	studentID := c.Params("studentId")

	period := c.Query("period", "current")

	reportCard, err := h.service.GetStudentReportCard(c.Context(), tenantID, studentID, period)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, reportCard, "Success")
}

func (h *Handler) GetGroupFinalGrades(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	groupID := c.Params("groupId")

	grades, err := h.service.GetGroupFinalGrades(c.Context(), tenantID, groupID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, grades, "Success")
}
