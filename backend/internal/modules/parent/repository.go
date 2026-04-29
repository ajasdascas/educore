package parent

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetDashboard(ctx context.Context, tenantID, userID string) (*ParentDashboardResponse, error) {
	children, err := r.GetChildrenByParent(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get children: %w", err)
	}

	stats, err := r.getQuickStats(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get quick stats: %w", err)
	}

	activity, err := r.getRecentActivity(ctx, tenantID, userID, 10)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent activity: %w", err)
	}

	events, err := r.getUpcomingEvents(ctx, tenantID, userID, 7)
	if err != nil {
		return nil, fmt.Errorf("failed to get upcoming events: %w", err)
	}

	notifications, err := r.getRecentNotifications(ctx, tenantID, userID, 5)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent notifications: %w", err)
	}

	return &ParentDashboardResponse{
		Children:       children,
		RecentActivity: activity,
		UpcomingEvents: events,
		Notifications:  notifications,
		QuickStats:     stats,
		LastUpdated:    time.Now(),
	}, nil
}

func (r *Repository) GetChildrenByParent(ctx context.Context, tenantID, userID string) ([]ChildSummaryResponse, error) {
	rows, err := r.db.Query(ctx, `
		SELECT s.id,
		       s.first_name,
		       s.last_name,
		       COALESCE(s.enrollment_number, ''),
		       COALESCE(g.name, ''),
		       COALESCE(gl.name, ''),
		       s.status,
		       COALESCE(s.photo_url, ''),
		       s.updated_at,
		       COALESCE(att_stats.attendance_rate, 0),
		       COALESCE(grade_stats.current_gpa, 0),
		       COALESCE(last_att.last_attendance, ''),
		       COALESCE(recent_grade.recent_grade, ''),
		       COALESCE(next_class.next_class, '')
		FROM students s
		INNER JOIN parent_student ps ON s.id = ps.student_id
		INNER JOIN users u ON ps.parent_id = u.id AND u.id = $2
		LEFT JOIN group_students gs ON s.id = gs.student_id
		LEFT JOIN groups g ON gs.group_id = g.id
		LEFT JOIN grade_levels gl ON g.grade_id = gl.id
		LEFT JOIN LATERAL (
			SELECT ROUND(AVG(CASE WHEN status IN ('present', 'late') THEN 100.0 ELSE 0.0 END), 2)::float8 AS attendance_rate
			FROM attendance_records
			WHERE student_id = s.id AND tenant_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
		) att_stats ON true
		LEFT JOIN LATERAL (
			SELECT ROUND(AVG(score), 2)::float8 AS current_gpa
			FROM grade_records
			WHERE student_id = s.id AND tenant_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)
		) grade_stats ON true
		LEFT JOIN LATERAL (
			SELECT TO_CHAR(date, 'YYYY-MM-DD') AS last_attendance
			FROM attendance_records
			WHERE student_id = s.id AND tenant_id = $1
			ORDER BY date DESC LIMIT 1
		) last_att ON true
		LEFT JOIN LATERAL (
			SELECT CONCAT(score, ' - ', sub.name) AS recent_grade
			FROM grade_records gr
			INNER JOIN subjects sub ON gr.subject_id = sub.id
			WHERE gr.student_id = s.id AND gr.tenant_id = $1
			ORDER BY gr.created_at DESC LIMIT 1
		) recent_grade ON true
		LEFT JOIN LATERAL (
			SELECT CONCAT(sub.name, ' ', TO_CHAR(csb.start_time, 'HH24:MI')) AS next_class
			FROM class_schedule_blocks csb
			LEFT JOIN subjects sub ON csb.subject_id = sub.id
			WHERE csb.group_id = gs.group_id AND csb.tenant_id = $1 AND csb.status = 'active'
			ORDER BY csb.day, csb.start_time LIMIT 1
		) next_class ON true
		WHERE s.tenant_id = $1
		  AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
		ORDER BY s.first_name, s.last_name
	`, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query children: %w", err)
	}
	defer rows.Close()

	var children []ChildSummaryResponse
	for rows.Next() {
		var child ChildSummaryResponse
		if err := rows.Scan(
			&child.ID, &child.FirstName, &child.LastName, &child.EnrollmentID,
			&child.GroupName, &child.GradeName, &child.Status, &child.ProfilePhoto,
			&child.UpdatedAt, &child.AttendanceRate, &child.CurrentGPA,
			&child.LastAttendance, &child.RecentGrade, &child.NextClass,
		); err != nil {
			return nil, fmt.Errorf("failed to scan child: %w", err)
		}
		children = append(children, child)
	}

	return children, rows.Err()
}

func (r *Repository) VerifyParentChild(ctx context.Context, tenantID, userID, childID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM parent_student ps
			INNER JOIN students s ON ps.student_id = s.id
			WHERE s.tenant_id = $1
			  AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
			  AND ps.parent_id = $2
			  AND ps.student_id = $3
		)
	`, tenantID, userID, childID).Scan(&exists)
	return exists, err
}

func (r *Repository) GetChildDetails(ctx context.Context, tenantID, childID string) (*ChildDetailResponse, error) {
	var child ChildDetailResponse
	err := r.db.QueryRow(ctx, `
		SELECT s.id,
		       s.first_name,
		       s.last_name,
		       COALESCE(s.enrollment_number, ''),
		       COALESCE(TO_CHAR(s.birth_date, 'YYYY-MM-DD'), ''),
		       COALESCE(s.notes, ''),
		       s.status,
		       COALESCE(s.photo_url, ''),
		       COALESCE(g.name, ''),
		       COALESCE(gl.name, ''),
		       COALESCE(t_user.first_name || ' ' || t_user.last_name, ''),
		       COALESCE(t_user.email, ''),
		       s.updated_at
		FROM students s
		LEFT JOIN group_students gs ON s.id = gs.student_id
		LEFT JOIN groups g ON gs.group_id = g.id
		LEFT JOIN grade_levels gl ON g.grade_id = gl.id
		LEFT JOIN group_teachers gt ON g.id = gt.group_id
		LEFT JOIN users t_user ON gt.teacher_id = t_user.id
		WHERE s.tenant_id = $1 AND s.id = $2
		LIMIT 1
	`, tenantID, childID).Scan(
		&child.ID, &child.FirstName, &child.LastName, &child.EnrollmentID,
		&child.BirthDate, &child.Address, &child.Status, &child.ProfilePhoto,
		&child.GroupName, &child.GradeName, &child.TeacherName, &child.TeacherEmail,
		&child.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get child details: %w", err)
	}

	_ = r.db.QueryRow(ctx, `
		SELECT
			COALESCE(ROUND(AVG(CASE WHEN ar.status IN ('present', 'late') THEN 100.0 ELSE 0.0 END), 2), 0)::float8,
			COALESCE(ROUND(AVG(gr.score), 2), 0)::float8
		FROM students s
		LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.tenant_id = $1 AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
		LEFT JOIN grade_records gr ON s.id = gr.student_id AND gr.tenant_id = $1 AND gr.created_at >= date_trunc('month', CURRENT_DATE)
		WHERE s.tenant_id = $1 AND s.id = $2
		GROUP BY s.id
	`, tenantID, childID).Scan(&child.AttendanceRate, &child.CurrentGPA)

	child.Schedule = []ScheduleItem{}
	child.RecentAttendance = []AttendanceItem{}
	child.RecentGrades = []GradeItem{}
	child.UpcomingAssignments = []AssignmentItem{}
	child.Behavior = &BehaviorSummary{OverallRating: "Adecuado"}
	child.EmergencyInfo = &EmergencyInfo{}

	return &child, nil
}

func (r *Repository) GetChildGrades(ctx context.Context, tenantID, childID, period, subject string) (*ChildGradesResponse, error) {
	childName, err := r.getChildName(ctx, tenantID, childID)
	if err != nil {
		return nil, err
	}

	args := []interface{}{tenantID, childID}
	filter := ""
	if period != "" && period != "current" {
		args = append(args, period)
		filter += fmt.Sprintf(" AND gr.period = $%d", len(args))
	}
	if subject != "" && subject != "all" {
		args = append(args, subject)
		filter += fmt.Sprintf(" AND sub.id::text = $%d", len(args))
	}

	rows, err := r.db.Query(ctx, `
		SELECT sub.id,
		       sub.name,
		       COALESCE(u.first_name || ' ' || u.last_name, ''),
		       gr.id,
		       gr.period,
		       COALESCE(gr.score, 0)::float8,
		       COALESCE(gr.notes, ''),
		       gr.created_at
		FROM grade_records gr
		INNER JOIN subjects sub ON gr.subject_id = sub.id
		LEFT JOIN group_teachers gt ON gt.group_id = gr.group_id AND gt.subject_id = gr.subject_id
		LEFT JOIN users u ON gt.teacher_id = u.id
		WHERE gr.tenant_id = $1 AND gr.student_id = $2 `+filter+`
		ORDER BY sub.name, gr.created_at DESC
	`, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get grades: %w", err)
	}
	defer rows.Close()

	subjects := map[string]*SubjectGradeInfo{}
	var allScores []float64
	for rows.Next() {
		var subjectID, subjectName, teacherName, gradeID, gradePeriod, notes string
		var score float64
		var createdAt time.Time
		if err := rows.Scan(&subjectID, &subjectName, &teacherName, &gradeID, &gradePeriod, &score, &notes, &createdAt); err != nil {
			return nil, fmt.Errorf("failed to scan grade: %w", err)
		}
		info := subjects[subjectID]
		if info == nil {
			info = &SubjectGradeInfo{
				SubjectID:   subjectID,
				SubjectName: subjectName,
				TeacherName: teacherName,
				Trend:       "stable",
				LastUpdated: createdAt,
			}
			subjects[subjectID] = info
		}
		grade := GradeItem{
			ID:          gradeID,
			Title:       gradePeriod,
			Type:        "grade",
			Score:       score,
			MaxScore:    100,
			Percentage:  score,
			LetterGrade: letterGrade(score),
			Date:        createdAt.Format("2006-01-02"),
			Subject:     subjectName,
			TeacherName: teacherName,
			Comments:    notes,
			CreatedAt:   createdAt,
		}
		info.Assignments = append(info.Assignments, grade)
		allScores = append(allScores, score)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	subjectList := make([]SubjectGradeInfo, 0, len(subjects))
	for _, info := range subjects {
		var total float64
		for _, grade := range info.Assignments {
			total += grade.Score
		}
		if len(info.Assignments) > 0 {
			info.CurrentGrade = round2(total / float64(len(info.Assignments)))
			info.LetterGrade = letterGrade(info.CurrentGrade)
		}
		subjectList = append(subjectList, *info)
	}

	avg, high, low := gradeStats(allScores)
	return &ChildGradesResponse{
		ChildID:      childID,
		ChildName:    childName,
		Period:       period,
		OverallGPA:   avg,
		OverallGrade: letterGrade(avg),
		Subjects:     subjectList,
		TrendData:    []GradeTrend{{Period: periodOrCurrent(period), GPA: avg, Change: 0}},
		Summary: &GradesSummary{
			HighestGrade:     high,
			LowestGrade:      low,
			AverageGrade:     avg,
			TotalAssignments: len(allScores),
			PassingRate:      passingRate(allScores),
			ImprovementTrend: "stable",
		},
		LastUpdated: time.Now(),
	}, nil
}

func (r *Repository) GetChildAttendance(ctx context.Context, tenantID, childID, startDate, endDate string) (*ChildAttendanceResponse, error) {
	childName, err := r.getChildName(ctx, tenantID, childID)
	if err != nil {
		return nil, err
	}
	if startDate == "" {
		startDate = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}
	if endDate == "" {
		endDate = time.Now().Format("2006-01-02")
	}

	rows, err := r.db.Query(ctx, `
		SELECT TO_CHAR(date, 'YYYY-MM-DD'), status, COALESCE(notes, '')
		FROM attendance_records
		WHERE tenant_id = $1 AND student_id = $2 AND date BETWEEN $3::date AND $4::date
		ORDER BY date DESC
	`, tenantID, childID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get attendance: %w", err)
	}
	defer rows.Close()

	records := []AttendanceRecord{}
	summary := &AttendanceSummary{}
	for rows.Next() {
		var record AttendanceRecord
		if err := rows.Scan(&record.Date, &record.Status, &record.Notes); err != nil {
			return nil, fmt.Errorf("failed to scan attendance: %w", err)
		}
		record.CheckIn = "08:00"
		record.CheckOut = "14:00"
		records = append(records, record)
		summary.TotalDays++
		switch record.Status {
		case "present":
			summary.PresentDays++
		case "late":
			summary.LateDays++
		case "excused":
			summary.ExcusedDays++
		default:
			summary.AbsentDays++
		}
	}
	if summary.TotalDays > 0 {
		summary.Rate = round2(float64(summary.PresentDays+summary.LateDays+summary.ExcusedDays) * 100 / float64(summary.TotalDays))
		summary.OnTimeRate = round2(float64(summary.PresentDays) * 100 / float64(summary.TotalDays))
	}

	return &ChildAttendanceResponse{
		ChildID:   childID,
		ChildName: childName,
		StartDate: startDate,
		EndDate:   endDate,
		Records:   records,
		Summary:   summary,
		TrendData: []AttendanceTrend{{Week: "Actual", Rate: summary.Rate}},
		Patterns:  &AttendancePatterns{NeedsAttention: summary.Rate < 85},
	}, rows.Err()
}

func (r *Repository) GetNotificationsPaginated(ctx context.Context, tenantID, userID string, page, perPage int, unreadOnly bool) ([]NotificationResponse, int, error) {
	whereClause := "WHERE n.tenant_id = $1 AND n.user_id = $2"
	args := []interface{}{tenantID, userID}
	if unreadOnly {
		whereClause += " AND n.is_read = false"
	}

	var total int
	if err := r.db.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM notifications n %s", whereClause), args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count notifications: %w", err)
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	offset := (page - 1) * perPage
	args = append(args, perPage, offset)

	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT n.id,
		       n.title,
		       COALESCE(n.message, n.body),
		       n.type,
		       n.priority,
		       n.is_read,
		       COALESCE(s.first_name || ' ' || s.last_name, ''),
		       COALESCE(n.sender_name, ''),
		       COALESCE(n.action_url, ''),
		       n.metadata,
		       n.created_at,
		       n.read_at
		FROM notifications n
		LEFT JOIN students s ON n.related_student_id = s.id
		%s
		ORDER BY n.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get notifications: %w", err)
	}
	defer rows.Close()

	notifications := []NotificationResponse{}
	for rows.Next() {
		var notification NotificationResponse
		var readAt sql.NullTime
		var metadata map[string]interface{}
		if err := rows.Scan(
			&notification.ID, &notification.Title, &notification.Message,
			&notification.Type, &notification.Priority, &notification.IsRead,
			&notification.ChildName, &notification.SenderName, &notification.ActionURL,
			&metadata, &notification.CreatedAt, &readAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan notification: %w", err)
		}
		if readAt.Valid {
			notification.ReadAt = &readAt.Time
		}
		notification.Metadata = metadata
		notifications = append(notifications, notification)
	}

	return notifications, total, rows.Err()
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

func (r *Repository) GetProfile(ctx context.Context, tenantID, userID string) (*ParentProfileResponse, error) {
	var profile ParentProfileResponse
	var notificationPrefs map[string]bool
	err := r.db.QueryRow(ctx, `
		SELECT id,
		       first_name,
		       last_name,
		       email,
		       COALESCE(phone, ''),
		       COALESCE(address, ''),
		       COALESCE(emergency_contact, ''),
		       COALESCE(emergency_phone, ''),
		       notification_preferences,
		       COALESCE(last_login_at, created_at),
		       created_at,
		       updated_at
		FROM users
		WHERE tenant_id = $1 AND id = $2 AND role = 'PARENT'
	`, tenantID, userID).Scan(
		&profile.ID, &profile.FirstName, &profile.LastName, &profile.Email,
		&profile.Phone, &profile.Address, &profile.EmergencyContact,
		&profile.EmergencyPhone, &notificationPrefs, &profile.LastLogin,
		&profile.CreatedAt, &profile.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}
	profile.NotificationPrefs = notificationPrefs

	children, err := r.GetChildrenByParent(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get children for profile: %w", err)
	}
	profile.Children = children

	return &profile, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, tenantID, userID string, req UpdateProfileRequest) (*ParentProfileResponse, error) {
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
	return r.GetProfile(ctx, tenantID, userID)
}

func (r *Repository) ValidateCurrentPassword(ctx context.Context, tenantID, userID, currentPassword string) (bool, error) {
	var hash sql.NullString
	err := r.db.QueryRow(ctx, `
		SELECT password_hash FROM users WHERE tenant_id = $1 AND id = $2
	`, tenantID, userID).Scan(&hash)
	if err != nil {
		return false, err
	}
	if !hash.Valid || hash.String == "" {
		return false, nil
	}
	return bcrypt.CompareHashAndPassword([]byte(hash.String), []byte(currentPassword)) == nil, nil
}

func (r *Repository) UpdatePassword(ctx context.Context, tenantID, userID, newPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}
	_, err = r.db.Exec(ctx, `
		UPDATE users SET password_hash = $3, updated_at = NOW()
		WHERE tenant_id = $1 AND id = $2
	`, tenantID, userID, string(hash))
	return err
}

func (r *Repository) EmailExistsForOtherUser(ctx context.Context, tenantID, email, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM users WHERE tenant_id = $1 AND email = $2 AND id != $3)
	`, tenantID, email, userID).Scan(&exists)
	return exists, err
}

func (r *Repository) getQuickStats(ctx context.Context, tenantID, userID string) (*ParentQuickStats, error) {
	var stats ParentQuickStats
	err := r.db.QueryRow(ctx, `
		WITH children AS (
			SELECT s.id
			FROM students s
			INNER JOIN parent_student ps ON ps.student_id = s.id
			WHERE s.tenant_id = $1 AND ps.parent_id = $2 AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
		),
		att AS (
			SELECT ROUND(AVG(CASE WHEN ar.status IN ('present','late','excused') THEN 100.0 ELSE 0.0 END), 2)::float8 rate
			FROM attendance_records ar
			INNER JOIN children c ON c.id = ar.student_id
			WHERE ar.tenant_id = $1 AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
		),
		grades AS (
			SELECT ROUND(AVG(gr.score), 2)::float8 avg_grade
			FROM grade_records gr
			INNER JOIN children c ON c.id = gr.student_id
			WHERE gr.tenant_id = $1
		)
		SELECT
			(SELECT COUNT(*) FROM children),
			COALESCE((SELECT rate FROM att), 0),
			COALESCE((SELECT avg_grade FROM grades), 0),
			(SELECT COUNT(*) FROM notifications WHERE tenant_id = $1 AND user_id = $2 AND is_read = false),
			(SELECT COUNT(*) FROM school_events WHERE tenant_id = $1 AND start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'),
			(SELECT COUNT(*) FROM student_assignments sa INNER JOIN children c ON c.id = sa.student_id WHERE sa.tenant_id = $1 AND sa.status IN ('pending','overdue'))
	`, tenantID, userID).Scan(
		&stats.TotalChildren, &stats.OverallAttendance, &stats.OverallGPA,
		&stats.UnreadNotifications, &stats.UpcomingEvents, &stats.PendingAssignments,
	)
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

func (r *Repository) getRecentActivity(ctx context.Context, tenantID, userID string, limit int) ([]ActivitySummary, error) {
	rows, err := r.db.Query(ctx, `
		WITH children AS (
			SELECT s.id, s.first_name || ' ' || s.last_name AS child_name
			FROM students s
			INNER JOIN parent_student ps ON ps.student_id = s.id
			WHERE s.tenant_id = $1 AND ps.parent_id = $2 AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
		),
		grade_activity AS (
			SELECT gr.id::text id, 'grade'::text type, 'Nueva calificacion'::text title,
			       CONCAT(sub.name, ': ', gr.score) description, c.child_name, gr.created_at timestamp,
			       CONCAT('/parent/grades?child=', c.id::text) action_url
			FROM grade_records gr
			INNER JOIN children c ON c.id = gr.student_id
			INNER JOIN subjects sub ON sub.id = gr.subject_id
			WHERE gr.tenant_id = $1
		),
		attendance_activity AS (
			SELECT ar.id::text id, 'attendance'::text type, 'Asistencia registrada'::text title,
			       CONCAT('Estado: ', ar.status) description, c.child_name, ar.created_at timestamp,
			       CONCAT('/parent/attendance?child=', c.id::text) action_url
			FROM attendance_records ar
			INNER JOIN children c ON c.id = ar.student_id
			WHERE ar.tenant_id = $1
		),
		notification_activity AS (
			SELECT n.id::text id, 'notification'::text type, n.title,
			       COALESCE(n.message, n.body) description, ''::text child_name, n.created_at timestamp,
			       COALESCE(n.action_url, '/parent/notifications') action_url
			FROM notifications n
			WHERE n.tenant_id = $1 AND n.user_id = $2
		)
		SELECT id, type, title, description, child_name, timestamp, action_url
		FROM (
			SELECT * FROM grade_activity
			UNION ALL SELECT * FROM attendance_activity
			UNION ALL SELECT * FROM notification_activity
		) activity
		ORDER BY timestamp DESC
		LIMIT $3
	`, tenantID, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	activity := []ActivitySummary{}
	for rows.Next() {
		var item ActivitySummary
		if err := rows.Scan(&item.ID, &item.Type, &item.Title, &item.Description, &item.ChildName, &item.Timestamp, &item.ActionURL); err != nil {
			return nil, err
		}
		activity = append(activity, item)
	}
	return activity, rows.Err()
}

func (r *Repository) getUpcomingEvents(ctx context.Context, tenantID, userID string, days int) ([]EventSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT se.id, se.title, TO_CHAR(se.start_date, 'YYYY-MM-DD'), COALESCE(TO_CHAR(se.start_time, 'HH24:MI'), ''),
		       se.type, COALESCE(s.first_name || ' ' || s.last_name, '')
		FROM school_events se
		LEFT JOIN students s ON se.student_id = s.id
		WHERE se.tenant_id = $1
		  AND se.start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($2::text || ' days')::interval
		  AND (
			  se.student_id IS NULL
			  OR se.student_id IN (
				  SELECT ps.student_id FROM parent_student ps
				  INNER JOIN students st ON st.id = ps.student_id
				  WHERE ps.parent_id = $3 AND st.tenant_id = $1 AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
			  )
		  )
		ORDER BY se.start_date, se.start_time
		LIMIT 10
	`, tenantID, days, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := []EventSummary{}
	for rows.Next() {
		var event EventSummary
		if err := rows.Scan(&event.ID, &event.Title, &event.Date, &event.Time, &event.Type, &event.ChildName); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

func (r *Repository) getRecentNotifications(ctx context.Context, tenantID, userID string, limit int) ([]NotificationSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, title, type, is_read, created_at
		FROM notifications
		WHERE tenant_id = $1 AND user_id = $2
		ORDER BY created_at DESC
		LIMIT $3
	`, tenantID, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := []NotificationSummary{}
	for rows.Next() {
		var item NotificationSummary
		if err := rows.Scan(&item.ID, &item.Title, &item.Type, &item.IsRead, &item.CreatedAt); err != nil {
			return nil, err
		}
		notifications = append(notifications, item)
	}
	return notifications, rows.Err()
}

func (r *Repository) GetChildSchedule(ctx context.Context, tenantID, childID string) (*ChildScheduleResponse, error) {
	childName, err := r.getChildName(ctx, tenantID, childID)
	if err != nil {
		return nil, err
	}
	groupName, groupID := "", ""
	_ = r.db.QueryRow(ctx, `
		SELECT COALESCE(g.name, ''), COALESCE(g.id::text, '')
		FROM group_students gs
		INNER JOIN groups g ON gs.group_id = g.id
		WHERE gs.student_id = $1
		LIMIT 1
	`, childID).Scan(&groupName, &groupID)

	rows, err := r.db.Query(ctx, `
		SELECT csb.day, TO_CHAR(csb.start_time, 'HH24:MI'), TO_CHAR(csb.end_time, 'HH24:MI'),
		       COALESCE(sub.name, 'Sin materia'), COALESCE(u.first_name || ' ' || u.last_name, ''),
		       COALESCE(csb.room, '')
		FROM class_schedule_blocks csb
		LEFT JOIN subjects sub ON csb.subject_id = sub.id
		LEFT JOIN users u ON csb.teacher_id = u.id
		WHERE csb.tenant_id = $1 AND csb.group_id::text = $2 AND csb.status = 'active'
		ORDER BY csb.day, csb.start_time
	`, tenantID, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byDay := map[string][]ScheduleItem{}
	for rows.Next() {
		var day string
		var item ScheduleItem
		if err := rows.Scan(&day, &item.StartTime, &item.EndTime, &item.Subject, &item.TeacherName, &item.Room); err != nil {
			return nil, err
		}
		byDay[day] = append(byDay[day], item)
	}

	days := []ScheduleDay{}
	for _, day := range []string{"monday", "tuesday", "wednesday", "thursday", "friday"} {
		days = append(days, ScheduleDay{DayOfWeek: day, Periods: byDay[day]})
	}
	return &ChildScheduleResponse{ChildID: childID, ChildName: childName, GroupName: groupName, WeeklySchedule: days, SpecialEvents: []EventItem{}}, rows.Err()
}

func (r *Repository) GetChildReportCard(ctx context.Context, tenantID, childID, period string) (*ChildReportCardResponse, error) {
	grades, err := r.GetChildGrades(ctx, tenantID, childID, period, "")
	if err != nil {
		return nil, err
	}
	attendance, _ := r.GetChildAttendance(ctx, tenantID, childID, "", "")
	detail, _ := r.GetChildDetails(ctx, tenantID, childID)

	subjects := []ReportSubject{}
	for _, subject := range grades.Subjects {
		subjects = append(subjects, ReportSubject{
			SubjectName:   subject.SubjectName,
			TeacherName:   subject.TeacherName,
			Grade:         subject.CurrentGrade,
			LetterGrade:   subject.LetterGrade,
			Credits:       1,
			Effort:        "Bueno",
			Participation: "Adecuada",
		})
	}

	groupName, gradeName := "", ""
	if detail != nil {
		groupName = detail.GroupName
		gradeName = detail.GradeName
	}
	attendanceRate := 0.0
	if attendance != nil && attendance.Summary != nil {
		attendanceRate = attendance.Summary.Rate
	}
	return &ChildReportCardResponse{
		ChildID:         childID,
		ChildName:       grades.ChildName,
		Period:          period,
		GradeName:       gradeName,
		GroupName:       groupName,
		OverallGPA:      grades.OverallGPA,
		OverallGrade:    grades.OverallGrade,
		Rank:            0,
		TotalStudents:   0,
		AttendanceRate:  attendanceRate,
		SubjectGrades:   subjects,
		BehaviorGrades:  []BehaviorGrade{{Category: "Conducta", Rating: "Buena", Comments: "Sin incidencias relevantes."}},
		TeacherComments: []TeacherComment{},
		Achievements:    []Achievement{},
		Recommendations: []string{},
		GeneratedAt:     time.Now(),
		Status:          "generated",
	}, nil
}

func (r *Repository) GetChildTeachers(ctx context.Context, tenantID, childID string) ([]ChildTeacherResponse, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT u.id, u.first_name, u.last_name, u.email,
		       COALESCE(tp.phone, u.phone, ''),
		       COALESCE(sub.name, 'Titular'),
		       COALESCE(tp.specialization, 'Docente'),
		       COALESCE(u.avatar_url, '')
		FROM group_students gs
		INNER JOIN group_teachers gt ON gt.group_id = gs.group_id
		INNER JOIN users u ON gt.teacher_id = u.id
		LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
		LEFT JOIN subjects sub ON gt.subject_id = sub.id
		WHERE gs.student_id = $2 AND u.tenant_id = $1
		ORDER BY u.first_name, u.last_name
	`, tenantID, childID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	teachers := []ChildTeacherResponse{}
	for rows.Next() {
		var teacher ChildTeacherResponse
		if err := rows.Scan(&teacher.TeacherID, &teacher.FirstName, &teacher.LastName, &teacher.Email, &teacher.Phone, &teacher.Subject, &teacher.Role, &teacher.ProfilePhoto); err != nil {
			return nil, err
		}
		teacher.CanMessage = true
		teachers = append(teachers, teacher)
	}
	return teachers, rows.Err()
}

func (r *Repository) GetChildAssignments(ctx context.Context, tenantID, childID, status, subject string) ([]ChildAssignmentResponse, error) {
	args := []interface{}{tenantID, childID}
	filter := ""
	if status != "" && status != "all" {
		args = append(args, status)
		filter += fmt.Sprintf(" AND sa.status = $%d", len(args))
	}
	if subject != "" && subject != "all" {
		args = append(args, subject)
		filter += fmt.Sprintf(" AND sub.id::text = $%d", len(args))
	}

	rows, err := r.db.Query(ctx, `
		SELECT sa.id, sa.title, COALESCE(sub.name, ''), COALESCE(u.first_name || ' ' || u.last_name, ''),
		       sa.type, COALESCE(sa.description, ''), TO_CHAR(sa.due_date, 'YYYY-MM-DD'), sa.status,
		       sa.grade::float8, sa.max_grade::float8, sa.priority, sa.created_at
		FROM student_assignments sa
		LEFT JOIN subjects sub ON sa.subject_id = sub.id
		LEFT JOIN users u ON sa.teacher_id = u.id
		WHERE sa.tenant_id = $1 AND (sa.student_id = $2 OR sa.group_id IN (SELECT group_id FROM group_students WHERE student_id = $2)) `+filter+`
		ORDER BY sa.due_date ASC
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []AssignmentItem{}
	subjects := map[string]bool{}
	summary := &AssignmentsSummary{}
	for rows.Next() {
		var item AssignmentItem
		var grade sql.NullFloat64
		if err := rows.Scan(&item.ID, &item.Title, &item.Subject, &item.TeacherName, &item.Type, &item.Description, &item.DueDate, &item.Status, &grade, &item.MaxGrade, &item.Priority, &item.CreatedAt); err != nil {
			return nil, err
		}
		if grade.Valid {
			item.Grade = &grade.Float64
		}
		due, _ := time.Parse("2006-01-02", item.DueDate)
		item.IsLate = item.Status == "overdue" || (item.Status == "pending" && !due.IsZero() && due.Before(time.Now()))
		if item.IsLate && !due.IsZero() {
			item.DaysLate = int(time.Since(due).Hours() / 24)
		}
		items = append(items, item)
		if item.Subject != "" {
			subjects[item.Subject] = true
		}
		summary.Total++
		switch item.Status {
		case "submitted":
			summary.Submitted++
		case "graded":
			summary.Graded++
		case "overdue":
			summary.Overdue++
		default:
			summary.Pending++
		}
	}
	subjectList := make([]string, 0, len(subjects))
	for name := range subjects {
		subjectList = append(subjectList, name)
	}
	return []ChildAssignmentResponse{{Assignments: items, Summary: summary, Subjects: subjectList}}, rows.Err()
}

func (r *Repository) CanMessageRecipient(ctx context.Context, tenantID, userID, recipientID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM users
			WHERE tenant_id = $1 AND id = $2 AND role IN ('SCHOOL_ADMIN','TEACHER') AND is_active = true
		)
	`, tenantID, recipientID).Scan(&exists)
	return exists, err
}

func (r *Repository) CreateMessage(ctx context.Context, tenantID, userID string, req SendMessageRequest) (*MessageResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var conversationID string
	err = tx.QueryRow(ctx, `
		INSERT INTO parent_conversations (tenant_id, parent_id, recipient_id, subject)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, tenantID, userID, req.RecipientID, req.Subject).Scan(&conversationID)
	if err != nil {
		return nil, err
	}

	var msg MessageResponse
	var readAt sql.NullTime
	err = tx.QueryRow(ctx, `
		INSERT INTO parent_messages (tenant_id, conversation_id, sender_id, recipient_id, subject, content, priority)
		VALUES ($1, $2, $3, $4, $5, $6, COALESCE(NULLIF($7, ''), 'normal'))
		RETURNING id, conversation_id, subject, content, priority, has_attachments, created_at, read_at
	`, tenantID, conversationID, userID, req.RecipientID, req.Subject, req.Content, req.Priority).Scan(
		&msg.ID, &msg.ConversationID, &msg.Subject, &msg.Content, &msg.Priority,
		&msg.HasAttachments, &msg.CreatedAt, &readAt,
	)
	if err != nil {
		return nil, err
	}
	if readAt.Valid {
		msg.ReadAt = &readAt.Time
	}
	_ = tx.QueryRow(ctx, `SELECT first_name || ' ' || last_name FROM users WHERE id = $1`, userID).Scan(&msg.SenderName)
	_ = tx.QueryRow(ctx, `SELECT first_name || ' ' || last_name FROM users WHERE id = $1`, req.RecipientID).Scan(&msg.RecipientName)

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &msg, nil
}

func (r *Repository) GetMessagesPaginated(ctx context.Context, tenantID, userID, conversationID string, page, perPage int) ([]MessageResponse, int, error) {
	where := "WHERE pm.tenant_id = $1 AND (pm.sender_id = $2 OR pm.recipient_id = $2)"
	args := []interface{}{tenantID, userID}
	if conversationID != "" {
		args = append(args, conversationID)
		where += fmt.Sprintf(" AND pm.conversation_id = $%d", len(args))
	}

	var total int
	if err := r.db.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM parent_messages pm %s", where), args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	offset := (page - 1) * perPage
	args = append(args, perPage, offset)

	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT pm.id, pm.conversation_id,
		       sender.first_name || ' ' || sender.last_name,
		       recipient.first_name || ' ' || recipient.last_name,
		       pm.subject, pm.content, (pm.read_at IS NOT NULL), pm.priority,
		       pm.has_attachments, pm.parent_message_id::text, pm.created_at, pm.read_at
		FROM parent_messages pm
		INNER JOIN users sender ON pm.sender_id = sender.id
		INNER JOIN users recipient ON pm.recipient_id = recipient.id
		%s
		ORDER BY pm.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	messages := []MessageResponse{}
	for rows.Next() {
		var msg MessageResponse
		var parentID sql.NullString
		var readAt sql.NullTime
		if err := rows.Scan(&msg.ID, &msg.ConversationID, &msg.SenderName, &msg.RecipientName, &msg.Subject, &msg.Content, &msg.IsRead, &msg.Priority, &msg.HasAttachments, &parentID, &msg.CreatedAt, &readAt); err != nil {
			return nil, 0, err
		}
		if parentID.Valid {
			msg.ParentMessageID = &parentID.String
		}
		if readAt.Valid {
			msg.ReadAt = &readAt.Time
		}
		messages = append(messages, msg)
	}
	return messages, total, rows.Err()
}

func (r *Repository) GetCalendar(ctx context.Context, tenantID, userID string, month, year int) (*CalendarResponse, error) {
	now := time.Now()
	if month == 0 {
		month = int(now.Month())
	}
	if year == 0 {
		year = now.Year()
	}
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(0, 1, -1)
	events, err := r.loadEventItems(ctx, tenantID, userID, start.Format("2006-01-02"), end.Format("2006-01-02"), "")
	if err != nil {
		return nil, err
	}

	days := []CalendarDay{}
	eventCount := map[string]int{}
	for _, event := range events {
		eventCount[event.StartDate]++
	}
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		date := d.Format("2006-01-02")
		days = append(days, CalendarDay{
			Date:       date,
			DayOfWeek:  int(d.Weekday()),
			IsToday:    date == now.Format("2006-01-02"),
			IsWeekend:  d.Weekday() == time.Saturday || d.Weekday() == time.Sunday,
			HasEvents:  eventCount[date] > 0,
			EventCount: eventCount[date],
		})
	}
	return &CalendarResponse{
		Month:    month,
		Year:     year,
		Days:     days,
		Events:   events,
		Holidays: []HolidayItem{},
		Statistics: &CalendarStats{
			TotalEvents: len(events),
			SchoolDays:  len(days),
			Holidays:    0,
			Weekends:    countWeekends(days),
		},
	}, nil
}

func (r *Repository) GetEvents(ctx context.Context, tenantID, userID, startDate, endDate, eventType string) ([]EventResponse, error) {
	if startDate == "" {
		startDate = time.Now().Format("2006-01-02")
	}
	if endDate == "" {
		endDate = time.Now().AddDate(0, 1, 0).Format("2006-01-02")
	}
	items, err := r.loadEventItems(ctx, tenantID, userID, startDate, endDate, eventType)
	if err != nil {
		return nil, err
	}
	grouped := map[string][]EventItem{}
	byType := map[string]int{}
	byChild := map[string]int{}
	for _, item := range items {
		grouped[item.StartDate] = append(grouped[item.StartDate], item)
		byType[item.Type]++
		if item.ChildName != "" {
			byChild[item.ChildName]++
		}
	}
	return []EventResponse{{
		Events:    items,
		GroupedBy: grouped,
		Summary: &EventsSummary{
			Total:    len(items),
			ByType:   byType,
			ByChild:  byChild,
			Upcoming: len(items),
		},
		ChildFilter: mapKeys(byChild),
	}}, nil
}

func (r *Repository) getChildName(ctx context.Context, tenantID, childID string) (string, error) {
	var name string
	err := r.db.QueryRow(ctx, `
		SELECT first_name || ' ' || last_name FROM students WHERE tenant_id = $1 AND id = $2
	`, tenantID, childID).Scan(&name)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", fmt.Errorf("child not found")
		}
		return "", err
	}
	return name, nil
}

func (r *Repository) loadEventItems(ctx context.Context, tenantID, userID, startDate, endDate, eventType string) ([]EventItem, error) {
	args := []interface{}{tenantID, userID, startDate, endDate}
	filter := ""
	if eventType != "" && eventType != "all" {
		args = append(args, eventType)
		filter = fmt.Sprintf(" AND se.type = $%d", len(args))
	}
	rows, err := r.db.Query(ctx, `
		SELECT se.id, se.title, COALESCE(se.description, ''), se.type,
		       TO_CHAR(se.start_date, 'YYYY-MM-DD'), TO_CHAR(se.end_date, 'YYYY-MM-DD'),
		       COALESCE(TO_CHAR(se.start_time, 'HH24:MI'), ''), COALESCE(TO_CHAR(se.end_time, 'HH24:MI'), ''),
		       COALESCE(se.location, ''), se.is_all_day, se.is_recurring,
		       COALESCE(s.first_name || ' ' || s.last_name, ''), se.category, se.priority, se.created_at
		FROM school_events se
		LEFT JOIN students s ON se.student_id = s.id
		WHERE se.tenant_id = $1
		  AND se.start_date BETWEEN $3::date AND $4::date
		  AND (
			  se.student_id IS NULL
			  OR se.student_id IN (
				  SELECT ps.student_id FROM parent_student ps
				  INNER JOIN students st ON st.id = ps.student_id
				  WHERE ps.parent_id = $2 AND st.tenant_id = $1 AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
			  )
		  )`+filter+`
		ORDER BY se.start_date, se.start_time
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []EventItem{}
	for rows.Next() {
		var item EventItem
		if err := rows.Scan(&item.ID, &item.Title, &item.Description, &item.Type, &item.StartDate, &item.EndDate, &item.StartTime, &item.EndTime, &item.Location, &item.IsAllDay, &item.IsRecurring, &item.ChildName, &item.Category, &item.Priority, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func periodOrCurrent(period string) string {
	if period == "" {
		return "current"
	}
	return period
}

func letterGrade(score float64) string {
	switch {
	case score >= 90:
		return "A"
	case score >= 80:
		return "B"
	case score >= 70:
		return "C"
	case score >= 60:
		return "D"
	case score > 0:
		return "F"
	default:
		return "-"
	}
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}

func gradeStats(scores []float64) (avg, high, low float64) {
	if len(scores) == 0 {
		return 0, 0, 0
	}
	low = scores[0]
	var total float64
	for _, score := range scores {
		total += score
		if score > high {
			high = score
		}
		if score < low {
			low = score
		}
	}
	return round2(total / float64(len(scores))), high, low
}

func passingRate(scores []float64) float64 {
	if len(scores) == 0 {
		return 0
	}
	passing := 0
	for _, score := range scores {
		if score >= 60 {
			passing++
		}
	}
	return round2(float64(passing) * 100 / float64(len(scores)))
}

func countWeekends(days []CalendarDay) int {
	count := 0
	for _, day := range days {
		if day.IsWeekend {
			count++
		}
	}
	return count
}

func mapKeys(values map[string]int) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		if strings.TrimSpace(key) != "" {
			keys = append(keys, key)
		}
	}
	return keys
}
