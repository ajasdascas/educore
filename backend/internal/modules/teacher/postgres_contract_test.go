package teacher

import (
	"context"
	"errors"
	"os"
	"regexp"
	"strings"
	"testing"
)

func readTeacherSource(t *testing.T, name string) string {
	t.Helper()
	content, err := os.ReadFile(name)
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}

func TestTeacherRepositoryUsesPostgresContracts(t *testing.T) {
	source := readTeacherSource(t, "repository.go")
	for _, forbidden := range []string{`(?i)DATE_FORMAT\s*\(`, `(?i)TIME_FORMAT\s*\(`, `(?i)FIELD\s*\(`} {
		if regexp.MustCompile(forbidden).MatchString(source) {
			t.Fatalf("teacher repository contains MySQL-only SQL matching %q", forbidden)
		}
	}
	for _, required := range []string{
		"TO_CHAR(csb.start_time, 'HH24:MI')",
		"TO_CHAR(ar.date, 'YYYY-MM-DD')",
		"TO_CHAR(n.created_at, 'YYYY-MM-DD HH24:MI')",
		"ORDER BY CASE LOWER(csb.day)",
		"INNER JOIN students st ON st.id = gs.student_id AND st.tenant_id = $1",
		"WHERE n.user_id = $1 AND n.tenant_id = $2",
		"return nil, ErrTeacherAccessDenied",
		"gr.school_year = $3",
		"result.Summary.PassingThreshold = passingThreshold",
	} {
		if !strings.Contains(source, required) {
			t.Errorf("teacher PostgreSQL/tenant contract missing %q", required)
		}
	}
}

func TestTeacherReadsFailClosed(t *testing.T) {
	source := readTeacherSource(t, "repository.go")
	for _, forbidden := range []string{
		`(?s)if err := rows\.Scan\([^}]+\); err != nil \{\s*continue`,
		`return \[\][A-Za-z]+\{\}, nil`,
		`messages, _ :=`,
		`_ = r\.db\.QueryRow`,
		`PendingGrades = len\(classes\)`,
		`SenderName = "Profesor"`,
		`value >= 60`,
		`EXTRACT\(YEAR FROM CURRENT_DATE\)::text`,
	} {
		if regexp.MustCompile(forbidden).MatchString(source) {
			t.Fatalf("teacher repository still hides or fabricates data matching %q", forbidden)
		}
	}
}

func TestTeacherServiceRejectsInvalidWritesBeforeRepository(t *testing.T) {
	service := &Service{}
	ctx := context.Background()

	err := service.SaveAttendance(ctx, "tenant", "teacher", AttendanceRequest{
		GroupID: "group",
		Records: []AttendanceRecordRequest{{StudentID: "student", Status: "unrecorded"}},
	})
	if !errors.Is(err, ErrTeacherInvalidRequest) {
		t.Fatalf("invalid attendance status error = %v, want ErrTeacherInvalidRequest", err)
	}

	err = service.SaveGrades(ctx, "tenant", "teacher", GradesRequest{
		GroupID: "group",
		Grades:  []GradeRecordRequest{{StudentID: "student", SubjectID: "subject", Score: 101}},
	})
	if !errors.Is(err, ErrTeacherInvalidRequest) {
		t.Fatalf("out-of-range grade error = %v, want ErrTeacherInvalidRequest", err)
	}

	_, err = service.SendMessage(ctx, "tenant", "teacher", SendMessageRequest{
		RecipientID: "parent", Subject: "Subject", Content: "Content", Priority: "invalid",
	})
	if !errors.Is(err, ErrTeacherInvalidRequest) {
		t.Fatalf("invalid message priority error = %v, want ErrTeacherInvalidRequest", err)
	}
}
