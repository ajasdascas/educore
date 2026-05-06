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

	grades, _ := s.repo.GetRecentGrades(ctx, profile.ID, tenantID, 5)
	attendance, _ := s.repo.GetAttendanceSummary(ctx, profile.ID, tenantID)

	if attendance == nil {
		attendance = &AttendanceSummary{}
	}

	return &StudentDashboardResponse{
		Student:           *profile,
		RecentGrades:      grades,
		AttendanceSummary: *attendance,
		RecentMessages:    []MessageSummary{},
	}, nil
}

func (s *Service) GetEnabledModules(ctx context.Context, tenantID string) ([]map[string]interface{}, error) {
	return s.repo.GetEnabledModules(ctx, tenantID)
}
