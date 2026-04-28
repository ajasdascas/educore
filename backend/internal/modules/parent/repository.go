package parent

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
}

// Dashboard queries
func (r *Repository) GetDashboard(ctx context.Context, tenantID, userID string) (*ParentDashboardResponse, error) {
	// Get children summary
	children, err := r.GetChildrenByParent(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get children: %w", err)
	}

	// Get quick stats
	stats, err := r.getQuickStats(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get quick stats: %w", err)
	}

	// Get recent activity (last 10 items)
	activity, err := r.getRecentActivity(ctx, tenantID, userID, 10)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent activity: %w", err)
	}

	// Get upcoming events (next 7 days)
	events, err := r.getUpcomingEvents(ctx, tenantID, userID, 7)
	if err != nil {
		return nil, fmt.Errorf("failed to get upcoming events: %w", err)
	}

	// Get recent notifications (last 5)
	notifications, err := r.getRecentNotifications(ctx, tenantID, userID, 5)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent notifications: %w", err)
	}

	return &ParentDashboardResponse{
		Children:        children,
		RecentActivity:  activity,
		UpcomingEvents:  events,
		Notifications:   notifications,
		QuickStats:      stats,
		LastUpdated:     time.Now(),
	}, nil
}

func (r *Repository) GetChildrenByParent(ctx context.Context, tenantID, userID string) ([]ChildSummaryResponse, error) {
	query := `
		SELECT s.id, s.first_name, s.last_name, s.enrollment_id,
			   COALESCE(g.name, '') as group_name, COALESCE(gl.name, '') as grade_name,
			   s.status, s.profile_photo, s.updated_at,
			   COALESCE(att_stats.attendance_rate, 0) as attendance_rate,
			   COALESCE(grade_stats.current_gpa, 0) as current_gpa,
			   COALESCE(last_att.last_attendance, '') as last_attendance,
			   COALESCE(recent_grade.recent_grade, '') as recent_grade
		FROM students s
		INNER JOIN parent_student ps ON s.id = ps.student_id AND ps.tenant_id = $1
		INNER JOIN users u ON ps.parent_id = u.id AND u.id = $2
		LEFT JOIN group_students gs ON s.id = gs.student_id
		LEFT JOIN groups g ON gs.group_id = g.id
		LEFT JOIN grade_levels gl ON g.grade_level_id = gl.id
		LEFT JOIN LATERAL (
			SELECT ROUND(AVG(
				CASE WHEN status IN ('present', 'late') THEN 100.0 ELSE 0.0 END
			), 2) as attendance_rate
			FROM attendance_records
			WHERE student_id = s.id AND tenant_id = $1
			AND date >= CURRENT_DATE - INTERVAL '30 days'
		) att_stats ON true
		LEFT JOIN LATERAL (
			SELECT ROUND(AVG(score), 2) as current_gpa
			FROM grade_records
			WHERE student_id = s.id AND tenant_id = $1
			AND created_at >= date_trunc('month', CURRENT_DATE)
		) grade_stats ON true
		LEFT JOIN LATERAL (
			SELECT TO_CHAR(date, 'YYYY-MM-DD') as last_attendance
			FROM attendance_records
			WHERE student_id = s.id AND tenant_id = $1
			ORDER BY date DESC LIMIT 1
		) last_att ON true
		LEFT JOIN LATERAL (
			SELECT CONCAT(score, '/100 - ', sub.name) as recent_grade
			FROM grade_records gr
			INNER JOIN subjects sub ON gr.subject_id = sub.id
			WHERE gr.student_id = s.id AND gr.tenant_id = $1
			ORDER BY gr.created_at DESC LIMIT 1
		) recent_grade ON true
		WHERE ps.tenant_id = $1
		ORDER BY s.first_name, s.last_name
	`

	rows, err := r.db.Query(ctx, query, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query children: %w", err)
	}
	defer rows.Close()

	var children []ChildSummaryResponse
	for rows.Next() {
		var child ChildSummaryResponse
		err := rows.Scan(
			&child.ID, &child.FirstName, &child.LastName, &child.EnrollmentID,
			&child.GroupName, &child.GradeName, &child.Status, &child.ProfilePhoto,
			&child.UpdatedAt, &child.AttendanceRate, &child.CurrentGPA,
			&child.LastAttendance, &child.RecentGrade,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan child: %w", err)
		}
		children = append(children, child)
	}

	return children, nil
}

// Child verification and details
func (r *Repository) VerifyParentChild(ctx context.Context, tenantID, userID, childID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM parent_student ps
			INNER JOIN users u ON ps.parent_id = u.id
			WHERE ps.tenant_id = $1 AND u.id = $2 AND ps.student_id = $3
		)
	`, tenantID, userID, childID).Scan(&exists)

	return exists, err
}

func (r *Repository) GetChildDetails(ctx context.Context, tenantID, childID string) (*ChildDetailResponse, error) {
	query := `
		SELECT s.id, s.first_name, s.last_name, s.enrollment_id,
			   s.birth_date, s.address, s.status, s.profile_photo,
			   COALESCE(g.name, '') as group_name, COALESCE(gl.name, '') as grade_name,
			   COALESCE(t_user.first_name || ' ' || t_user.last_name, '') as teacher_name,
			   COALESCE(t_user.email, '') as teacher_email,
			   s.created_at, s.updated_at
		FROM students s
		LEFT JOIN group_students gs ON s.id = gs.student_id
		LEFT JOIN groups g ON gs.group_id = g.id
		LEFT JOIN grade_levels gl ON g.grade_level_id = gl.id
		LEFT JOIN group_teachers gt ON g.id = gt.group_id
		LEFT JOIN users t_user ON gt.teacher_id = t_user.id
		WHERE s.tenant_id = $1 AND s.id = $2
	`

	var child ChildDetailResponse
	err := r.db.QueryRow(ctx, query, tenantID, childID).Scan(
		&child.ID, &child.FirstName, &child.LastName, &child.EnrollmentID,
		&child.BirthDate, &child.Address, &child.Status, &child.ProfilePhoto,
		&child.GroupName, &child.GradeName, &child.TeacherName, &child.TeacherEmail,
		&child.CreatedAt, &child.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get child details: %w", err)
	}

	// Get attendance rate and GPA
	statsQuery := `
		SELECT
			COALESCE(AVG(
				CASE WHEN ar.status IN ('present', 'late') THEN 100.0 ELSE 0.0 END
			), 0) as attendance_rate,
			COALESCE(AVG(gr.score), 0) as current_gpa
		FROM students s
		LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
		LEFT JOIN grade_records gr ON s.id = gr.student_id AND gr.created_at >= date_trunc('month', CURRENT_DATE)
		WHERE s.tenant_id = $1 AND s.id = $2
		GROUP BY s.id
	`

	err = r.db.QueryRow(ctx, statsQuery, tenantID, childID).Scan(
		&child.AttendanceRate, &child.CurrentGPA,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get child stats: %w", err)
	}

	return &child, nil
}

// Grade-related queries
func (r *Repository) GetChildGrades(ctx context.Context, tenantID, childID, period, subject string) (*ChildGradesResponse, error) {
	// This is a simplified implementation - would need more complex logic for different periods
	query := `
		SELECT s.first_name || ' ' || s.last_name as child_name
		FROM students s
		WHERE s.tenant_id = $1 AND s.id = $2
	`

	var childName string
	err := r.db.QueryRow(ctx, query, tenantID, childID).Scan(&childName)
	if err != nil {
		return nil, fmt.Errorf("failed to get child name: %w", err)
	}

	// Placeholder response - would implement full grade querying logic here
	return &ChildGradesResponse{
		ChildID:      childID,
		ChildName:    childName,
		Period:       period,
		OverallGPA:   0,
		OverallGrade: "A",
		Subjects:     []SubjectGradeInfo{},
		TrendData:    []GradeTrend{},
		Summary:      &GradesSummary{},
		LastUpdated:  time.Now(),
	}, nil
}

// Attendance-related queries
func (r *Repository) GetChildAttendance(ctx context.Context, tenantID, childID, startDate, endDate string) (*ChildAttendanceResponse, error) {
	// Get child name
	var childName string
	err := r.db.QueryRow(ctx, `
		SELECT first_name || ' ' || last_name FROM students
		WHERE tenant_id = $1 AND id = $2
	`, tenantID, childID).Scan(&childName)
	if err != nil {
		return nil, fmt.Errorf("failed to get child name: %w", err)
	}

	// Placeholder response - would implement full attendance querying logic
	return &ChildAttendanceResponse{
		ChildID:   childID,
		ChildName: childName,
		StartDate: startDate,
		EndDate:   endDate,
		Records:   []AttendanceRecord{},
		Summary:   &AttendanceSummary{},
		TrendData: []AttendanceTrend{},
		Patterns:  &AttendancePatterns{},
	}, nil
}

// Notifications and communications
func (r *Repository) GetNotificationsPaginated(ctx context.Context, tenantID, userID string, page, perPage int, unreadOnly bool) ([]NotificationResponse, int, error) {
	whereClause := "WHERE n.tenant_id = $1 AND n.user_id = $2"
	args := []interface{}{tenantID, userID}
	argCount := 2

	if unreadOnly {
		argCount++
		whereClause += fmt.Sprintf(" AND n.is_read = false")
	}

	// Count query
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM notifications n %s
	`, whereClause)

	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count notifications: %w", err)
	}

	// Data query
	offset := (page - 1) * perPage
	dataQuery := fmt.Sprintf(`
		SELECT n.id, n.title, n.message, n.type, n.priority, n.is_read,
			   COALESCE(s.first_name || ' ' || s.last_name, '') as child_name,
			   n.sender_name, n.action_url, n.metadata, n.created_at, n.read_at
		FROM notifications n
		LEFT JOIN students s ON n.related_student_id = s.id
		%s
		ORDER BY n.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argCount+1, argCount+2)

	args = append(args, perPage, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get notifications: %w", err)
	}
	defer rows.Close()

	var notifications []NotificationResponse
	for rows.Next() {
		var notification NotificationResponse
		var metadata map[string]interface{}

		err := rows.Scan(
			&notification.ID, &notification.Title, &notification.Message,
			&notification.Type, &notification.Priority, &notification.IsRead,
			&notification.ChildName, &notification.SenderName, &notification.ActionURL,
			&metadata, &notification.CreatedAt, &notification.ReadAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan notification: %w", err)
		}

		notification.Metadata = metadata
		notifications = append(notifications, notification)
	}

	return notifications, total, nil
}

func (r *Repository) NotificationBelongsToUser(ctx context.Context, tenantID, userID, notificationID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM notifications WHERE tenant_id = $1 AND user_id = $2 AND id = $3)
	`, tenantID, userID, notificationID).Scan(&exists)

	return exists, err
}

func (r *Repository) MarkNotificationRead(ctx context.Context, tenantID, notificationID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE notifications SET is_read = true, read_at = NOW()
		WHERE tenant_id = $1 AND id = $2
	`, tenantID, notificationID)

	return err
}

// Profile management
func (r *Repository) GetProfile(ctx context.Context, tenantID, userID string) (*ParentProfileResponse, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
			   u.address, u.emergency_contact, u.emergency_phone,
			   u.notification_preferences, u.last_login, u.created_at, u.updated_at
		FROM users u
		WHERE u.tenant_id = $1 AND u.id = $2 AND u.role = 'PARENT'
	`

	var profile ParentProfileResponse
	var notificationPrefs map[string]bool

	err := r.db.QueryRow(ctx, query, tenantID, userID).Scan(
		&profile.ID, &profile.FirstName, &profile.LastName, &profile.Email,
		&profile.Phone, &profile.Address, &profile.EmergencyContact,
		&profile.EmergencyPhone, &notificationPrefs, &profile.LastLogin,
		&profile.CreatedAt, &profile.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}

	profile.NotificationPrefs = notificationPrefs

	// Get children
	children, err := r.GetChildrenByParent(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get children for profile: %w", err)
	}
	profile.Children = children

	return &profile, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, tenantID, userID string, req UpdateProfileRequest) (*ParentProfileResponse, error) {
	// Update user profile
	_, err := r.db.Exec(ctx, `
		UPDATE users SET
			first_name = COALESCE(NULLIF($3, ''), first_name),
			last_name = COALESCE(NULLIF($4, ''), last_name),
			email = COALESCE(NULLIF($5, ''), email),
			phone = COALESCE(NULLIF($6, ''), phone),
			address = COALESCE(NULLIF($7, ''), address),
			emergency_contact = COALESCE(NULLIF($8, ''), emergency_contact),
			emergency_phone = COALESCE(NULLIF($9, ''), emergency_phone),
			notification_preferences = COALESCE($10, notification_preferences),
			updated_at = NOW()
		WHERE tenant_id = $1 AND id = $2
	`, tenantID, userID, req.FirstName, req.LastName, req.Email, req.Phone,
		req.Address, req.EmergencyContact, req.EmergencyPhone, req.NotificationPrefs)
	if err != nil {
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	// Return updated profile
	return r.GetProfile(ctx, tenantID, userID)
}

func (r *Repository) ValidateCurrentPassword(ctx context.Context, tenantID, userID, currentPassword string) (bool, error) {
	// This would hash the current password and compare with stored hash
	// Placeholder implementation
	return true, nil
}

func (r *Repository) UpdatePassword(ctx context.Context, tenantID, userID, newPassword string) error {
	// This would hash the new password before storing
	// Placeholder implementation
	_, err := r.db.Exec(ctx, `
		UPDATE users SET password_hash = $3, updated_at = NOW()
		WHERE tenant_id = $1 AND id = $2
	`, tenantID, userID, newPassword)

	return err
}

func (r *Repository) EmailExistsForOtherUser(ctx context.Context, tenantID, email, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM users WHERE tenant_id = $1 AND email = $2 AND id != $3)
	`, tenantID, email, userID).Scan(&exists)

	return exists, err
}

// Helper functions for dashboard
func (r *Repository) getQuickStats(ctx context.Context, tenantID, userID string) (*ParentQuickStats, error) {
	// Placeholder implementation
	return &ParentQuickStats{
		TotalChildren:       0,
		OverallAttendance:   0,
		OverallGPA:          0,
		UnreadNotifications: 0,
		UpcomingEvents:      0,
		PendingAssignments:  0,
	}, nil
}

func (r *Repository) getRecentActivity(ctx context.Context, tenantID, userID string, limit int) ([]ActivitySummary, error) {
	return []ActivitySummary{}, nil
}

func (r *Repository) getUpcomingEvents(ctx context.Context, tenantID, userID string, days int) ([]EventSummary, error) {
	return []EventSummary{}, nil
}

func (r *Repository) getRecentNotifications(ctx context.Context, tenantID, userID string, limit int) ([]NotificationSummary, error) {
	return []NotificationSummary{}, nil
}

// Placeholder implementations for remaining methods
func (r *Repository) GetChildSchedule(ctx context.Context, tenantID, childID string) (*ChildScheduleResponse, error) {
	return &ChildScheduleResponse{}, nil
}

func (r *Repository) GetChildReportCard(ctx context.Context, tenantID, childID, period string) (*ChildReportCardResponse, error) {
	return &ChildReportCardResponse{}, nil
}

func (r *Repository) GetChildTeachers(ctx context.Context, tenantID, childID string) ([]ChildTeacherResponse, error) {
	return []ChildTeacherResponse{}, nil
}

func (r *Repository) GetChildAssignments(ctx context.Context, tenantID, childID, status, subject string) ([]ChildAssignmentResponse, error) {
	return []ChildAssignmentResponse{}, nil
}

func (r *Repository) CanMessageRecipient(ctx context.Context, tenantID, userID, recipientID string) (bool, error) {
	return true, nil
}

func (r *Repository) CreateMessage(ctx context.Context, tenantID, userID string, req SendMessageRequest) (*MessageResponse, error) {
	return &MessageResponse{}, nil
}

func (r *Repository) GetMessagesPaginated(ctx context.Context, tenantID, userID, conversationID string, page, perPage int) ([]MessageResponse, int, error) {
	return []MessageResponse{}, 0, nil
}

func (r *Repository) GetCalendar(ctx context.Context, tenantID, userID string, month, year int) (*CalendarResponse, error) {
	return &CalendarResponse{}, nil
}

func (r *Repository) GetEvents(ctx context.Context, tenantID, userID, startDate, endDate, eventType string) ([]EventResponse, error) {
	return []EventResponse{}, nil
}