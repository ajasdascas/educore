package teacher

import (
	"context"
	"fmt"
	"time"

	"educore/internal/events"
)

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
		return nil, fmt.Errorf("group_id is required")
	}
	return s.repo.GetAttendance(ctx, tenantID, teacherID, groupID, date)
}

func (s *Service) SaveAttendance(ctx context.Context, tenantID, teacherID string, req AttendanceRequest) error {
	if req.GroupID == "" || len(req.Records) == 0 {
		return fmt.Errorf("group_id and records are required")
	}
	if err := s.repo.SaveAttendance(ctx, tenantID, teacherID, req); err != nil {
		return err
	}
	s.bus.Publish("teacher.attendance_saved", map[string]interface{}{"tenant_id": tenantID, "teacher_id": teacherID, "group_id": req.GroupID, "timestamp": time.Now()})
	return nil
}

func (s *Service) GetGrades(ctx context.Context, tenantID, teacherID, groupID, subjectID, period string) (*GradesResponse, error) {
	if groupID == "" || subjectID == "" {
		return nil, fmt.Errorf("group_id and subject_id are required")
	}
	return s.repo.GetGrades(ctx, tenantID, teacherID, groupID, subjectID, period)
}

func (s *Service) SaveGrades(ctx context.Context, tenantID, teacherID string, req GradesRequest) error {
	if req.GroupID == "" || len(req.Grades) == 0 {
		return fmt.Errorf("group_id and grades are required")
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

func (s *Service) SendMessage(ctx context.Context, tenantID, teacherID string, req SendMessageRequest) (*TeacherMessage, error) {
	if req.RecipientID == "" || req.Subject == "" || req.Content == "" {
		return nil, fmt.Errorf("recipient_id, subject and content are required")
	}
	message, err := s.repo.SendMessage(ctx, tenantID, teacherID, req)
	if err != nil {
		return nil, err
	}
	s.bus.Publish("teacher.message_sent", map[string]interface{}{"tenant_id": tenantID, "teacher_id": teacherID, "recipient_id": req.RecipientID, "message_id": message.ID, "timestamp": time.Now()})
	return message, nil
}
