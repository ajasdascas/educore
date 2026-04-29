package parent

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
	return &Service{
		repo: repo,
		bus:  bus,
	}
}

// Dashboard use cases
func (s *Service) GetDashboard(ctx context.Context, tenantID, userID string) (*ParentDashboardResponse, error) {
	dashboard, err := s.repo.GetDashboard(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get parent dashboard: %w", err)
	}

	return dashboard, nil
}

func (s *Service) GetChildren(ctx context.Context, tenantID, userID string) ([]ChildSummaryResponse, error) {
	children, err := s.repo.GetChildrenByParent(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get children: %w", err)
	}

	return children, nil
}

// Child information use cases
func (s *Service) VerifyParentAccess(ctx context.Context, tenantID, userID, childID string) (bool, error) {
	hasAccess, err := s.repo.VerifyParentChild(ctx, tenantID, userID, childID)
	if err != nil {
		return false, fmt.Errorf("failed to verify parent access: %w", err)
	}

	return hasAccess, nil
}

func (s *Service) GetChildDetails(ctx context.Context, tenantID, childID string) (*ChildDetailResponse, error) {
	child, err := s.repo.GetChildDetails(ctx, tenantID, childID)
	if err != nil {
		return nil, fmt.Errorf("failed to get child details: %w", err)
	}

	return child, nil
}

func (s *Service) GetChildGrades(ctx context.Context, tenantID, childID, period, subject string) (*ChildGradesResponse, error) {
	grades, err := s.repo.GetChildGrades(ctx, tenantID, childID, period, subject)
	if err != nil {
		return nil, fmt.Errorf("failed to get child grades: %w", err)
	}

	return grades, nil
}

func (s *Service) GetChildAttendance(ctx context.Context, tenantID, childID, startDate, endDate string) (*ChildAttendanceResponse, error) {
	attendance, err := s.repo.GetChildAttendance(ctx, tenantID, childID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get child attendance: %w", err)
	}

	return attendance, nil
}

func (s *Service) GetChildSchedule(ctx context.Context, tenantID, childID string) (*ChildScheduleResponse, error) {
	schedule, err := s.repo.GetChildSchedule(ctx, tenantID, childID)
	if err != nil {
		return nil, fmt.Errorf("failed to get child schedule: %w", err)
	}

	return schedule, nil
}

func (s *Service) GetChildReportCard(ctx context.Context, tenantID, childID, period string) (*ChildReportCardResponse, error) {
	reportCard, err := s.repo.GetChildReportCard(ctx, tenantID, childID, period)
	if err != nil {
		return nil, fmt.Errorf("failed to get child report card: %w", err)
	}

	return reportCard, nil
}

func (s *Service) GetChildTeachers(ctx context.Context, tenantID, childID string) ([]ChildTeacherResponse, error) {
	teachers, err := s.repo.GetChildTeachers(ctx, tenantID, childID)
	if err != nil {
		return nil, fmt.Errorf("failed to get child teachers: %w", err)
	}

	return teachers, nil
}

func (s *Service) GetChildAssignments(ctx context.Context, tenantID, childID, status, subject string) ([]ChildAssignmentResponse, error) {
	assignments, err := s.repo.GetChildAssignments(ctx, tenantID, childID, status, subject)
	if err != nil {
		return nil, fmt.Errorf("failed to get child assignments: %w", err)
	}

	return assignments, nil
}

// Communications use cases
func (s *Service) GetNotifications(ctx context.Context, tenantID, userID string, page, perPage int, unreadOnly bool) ([]NotificationResponse, int, error) {
	notifications, total, err := s.repo.GetNotificationsPaginated(ctx, tenantID, userID, page, perPage, unreadOnly)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get notifications: %w", err)
	}

	return notifications, total, nil
}

func (s *Service) MarkNotificationRead(ctx context.Context, tenantID, userID, notificationID string) error {
	// Verify notification belongs to user
	belongs, err := s.repo.NotificationBelongsToUser(ctx, tenantID, userID, notificationID)
	if err != nil {
		return fmt.Errorf("failed to verify notification ownership: %w", err)
	}
	if !belongs {
		return fmt.Errorf("notification not found or access denied")
	}

	err = s.repo.MarkNotificationRead(ctx, tenantID, notificationID)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	// Publish event
	s.bus.Publish("notification.read", map[string]interface{}{
		"tenant_id":       tenantID,
		"notification_id": notificationID,
		"user_id":         userID,
		"timestamp":       time.Now(),
	})

	return nil
}

func (s *Service) SendMessage(ctx context.Context, tenantID, userID string, req SendMessageRequest) (*MessageResponse, error) {
	// Validate business rules
	if err := s.validateSendMessage(ctx, tenantID, userID, req); err != nil {
		return nil, err
	}

	message, err := s.repo.CreateMessage(ctx, tenantID, userID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to send message: %w", err)
	}

	// Publish event
	s.bus.Publish("message.sent", map[string]interface{}{
		"tenant_id":    tenantID,
		"sender_id":    userID,
		"recipient_id": req.RecipientID,
		"message_id":   message.ID,
		"timestamp":    time.Now(),
	})

	return message, nil
}

func (s *Service) GetMessages(ctx context.Context, tenantID, userID, conversationID string, page, perPage int) ([]MessageResponse, int, error) {
	messages, total, err := s.repo.GetMessagesPaginated(ctx, tenantID, userID, conversationID, page, perPage)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, total, nil
}

func (s *Service) GetDocuments(ctx context.Context, tenantID, userID string) ([]ParentDocumentResponse, error) {
	documents, err := s.repo.GetDocuments(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get parent documents: %w", err)
	}
	return documents, nil
}

func (s *Service) GetPayments(ctx context.Context, tenantID, userID string) (*ParentPaymentsResponse, error) {
	payments, err := s.repo.GetPayments(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get parent payments: %w", err)
	}
	return payments, nil
}

func (s *Service) GetConsents(ctx context.Context, tenantID, userID string) ([]ParentConsentResponse, error) {
	consents, err := s.repo.GetConsents(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get parent consents: %w", err)
	}
	return consents, nil
}

func (s *Service) UpdateConsent(ctx context.Context, tenantID, userID, consentID string, req ConsentUpdateRequest) (*ParentConsentResponse, error) {
	if req.Action != "approved" && req.Action != "rejected" {
		return nil, fmt.Errorf("invalid consent action")
	}
	consent, err := s.repo.UpdateConsent(ctx, tenantID, userID, consentID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update consent: %w", err)
	}
	s.bus.Publish("parent.consent_updated", map[string]interface{}{"tenant_id": tenantID, "user_id": userID, "consent_id": consentID, "status": req.Action, "timestamp": time.Now()})
	return consent, nil
}

func (s *Service) GetReportSummary(ctx context.Context, tenantID, userID string) (*ParentReportSummaryResponse, error) {
	summary, err := s.repo.GetReportSummary(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get parent report summary: %w", err)
	}
	return summary, nil
}

// Calendar & Events use cases
func (s *Service) GetCalendar(ctx context.Context, tenantID, userID string, month, year int) (*CalendarResponse, error) {
	calendar, err := s.repo.GetCalendar(ctx, tenantID, userID, month, year)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar: %w", err)
	}

	return calendar, nil
}

func (s *Service) GetEvents(ctx context.Context, tenantID, userID, startDate, endDate, eventType string) ([]EventResponse, error) {
	events, err := s.repo.GetEvents(ctx, tenantID, userID, startDate, endDate, eventType)
	if err != nil {
		return nil, fmt.Errorf("failed to get events: %w", err)
	}

	return events, nil
}

// Profile use cases
func (s *Service) GetProfile(ctx context.Context, tenantID, userID string) (*ParentProfileResponse, error) {
	profile, err := s.repo.GetProfile(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}

	return profile, nil
}

func (s *Service) UpdateProfile(ctx context.Context, tenantID, userID string, req UpdateProfileRequest) (*ParentProfileResponse, error) {
	// Validate business rules
	if err := s.validateUpdateProfile(ctx, tenantID, userID, req); err != nil {
		return nil, err
	}

	profile, err := s.repo.UpdateProfile(ctx, tenantID, userID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	// Publish event
	s.bus.Publish("parent.profile_updated", map[string]interface{}{
		"tenant_id": tenantID,
		"user_id":   userID,
		"timestamp": time.Now(),
	})

	return profile, nil
}

func (s *Service) ChangePassword(ctx context.Context, tenantID, userID string, req ChangePasswordRequest) error {
	// Validate current password
	valid, err := s.repo.ValidateCurrentPassword(ctx, tenantID, userID, req.CurrentPassword)
	if err != nil {
		return fmt.Errorf("failed to validate current password: %w", err)
	}
	if !valid {
		return fmt.Errorf("current password is incorrect")
	}

	// Validate new password strength
	if err := s.validatePasswordStrength(req.NewPassword); err != nil {
		return err
	}

	err = s.repo.UpdatePassword(ctx, tenantID, userID, req.NewPassword)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Publish event
	s.bus.Publish("parent.password_changed", map[string]interface{}{
		"tenant_id": tenantID,
		"user_id":   userID,
		"timestamp": time.Now(),
	})

	return nil
}

// Business rule validation methods
func (s *Service) validateSendMessage(ctx context.Context, tenantID, userID string, req SendMessageRequest) error {
	// Verify recipient exists and user can message them
	canMessage, err := s.repo.CanMessageRecipient(ctx, tenantID, userID, req.RecipientID)
	if err != nil {
		return fmt.Errorf("failed to verify messaging permissions: %w", err)
	}
	if !canMessage {
		return fmt.Errorf("cannot send message to this recipient")
	}

	// Validate message content
	if len(req.Content) == 0 {
		return fmt.Errorf("message content cannot be empty")
	}
	if len(req.Content) > 2000 {
		return fmt.Errorf("message content too long (max 2000 characters)")
	}

	return nil
}

func (s *Service) validateUpdateProfile(ctx context.Context, tenantID, userID string, req UpdateProfileRequest) error {
	// Validate email format if provided
	if req.Email != "" {
		// Check if email already exists for another user
		exists, err := s.repo.EmailExistsForOtherUser(ctx, tenantID, req.Email, userID)
		if err != nil {
			return fmt.Errorf("failed to check email uniqueness: %w", err)
		}
		if exists {
			return fmt.Errorf("email already in use")
		}
	}

	// Validate phone format if provided
	if req.Phone != "" {
		if len(req.Phone) < 10 {
			return fmt.Errorf("phone number too short")
		}
	}

	return nil
}

func (s *Service) validatePasswordStrength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	hasUpper := false
	hasLower := false
	hasNumber := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			hasUpper = true
		case char >= 'a' && char <= 'z':
			hasLower = true
		case char >= '0' && char <= '9':
			hasNumber = true
		case char >= '!' && char <= '/' || char >= ':' && char <= '@':
			hasSpecial = true
		}
	}

	if !hasUpper {
		return fmt.Errorf("password must contain at least one uppercase letter")
	}
	if !hasLower {
		return fmt.Errorf("password must contain at least one lowercase letter")
	}
	if !hasNumber {
		return fmt.Errorf("password must contain at least one number")
	}
	if !hasSpecial {
		return fmt.Errorf("password must contain at least one special character")
	}

	return nil
}
