package student

import (
	"context"
	"fmt"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetDashboard(ctx context.Context, userID, tenantID string) (*StudentDashboardResponse, error) {
	profile, err := s.repo.GetProfileByUserID(ctx, userID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("student.Service.GetDashboard: %w", err)
	}

	grades, err := s.repo.GetRecentGrades(ctx, profile.ID, tenantID, 5)
	if err != nil {
		return nil, fmt.Errorf("student.Service.GetDashboard grades: %w", err)
	}
	attendance, err := s.repo.GetAttendanceSummary(ctx, profile.ID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("student.Service.GetDashboard attendance: %w", err)
	}
	messages, err := s.repo.GetMessages(ctx, userID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("student.Service.GetDashboard messages: %w", err)
	}

	return &StudentDashboardResponse{
		Student:           *profile,
		RecentGrades:      grades,
		AttendanceSummary: *attendance,
		RecentMessages:    messages,
	}, nil
}
