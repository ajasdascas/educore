package school_admin

import (
	"context"
	"errors"
	"testing"
)

func TestNormalizeManualPaymentMethod(t *testing.T) {
	tests := []struct {
		input string
		want  string
		ok    bool
	}{
		{"cash", "cash", true},
		{" Efectivo ", "cash", true},
		{"transfer", "transfer", true},
		{"TRANSFERENCIA", "transfer", true},
		{"card", "", false},
		{"tarjeta", "", false},
	}
	for _, test := range tests {
		got, ok := normalizeManualPaymentMethod(test.input)
		if got != test.want || ok != test.ok {
			t.Fatalf("normalizeManualPaymentMethod(%q) = (%q, %v), want (%q, %v)", test.input, got, ok, test.want, test.ok)
		}
	}
}

func TestMoneyUsesIntegerCents(t *testing.T) {
	for _, value := range []float64{0.01, 10.25, 999999.99} {
		if got := centsToMoney(moneyToCents(value)); got != value {
			t.Fatalf("money round trip for %.2f = %.2f", value, got)
		}
	}
}

func TestNextManualPaymentStateUsesRemainingBalance(t *testing.T) {
	paid, status, err := nextManualPaymentState(1000, 0, 250.25)
	if err != nil || paid != 250.25 || status != "partial" {
		t.Fatalf("first partial payment = %.2f, %q, %v", paid, status, err)
	}
	paid, status, err = nextManualPaymentState(1000, paid, 749.75)
	if err != nil || paid != 1000 || status != "paid" {
		t.Fatalf("final payment = %.2f, %q, %v", paid, status, err)
	}
	if _, _, err = nextManualPaymentState(1000, 900, 100.01); err == nil {
		t.Fatal("expected an overpayment against the remaining balance to be rejected")
	}
}

func TestIdempotencyAndPeriodValidation(t *testing.T) {
	if !validIdempotencyKey("manual:7c40f234-1234-4567-89ab-123456789abc") {
		t.Fatal("expected UUID-based idempotency key to be valid")
	}
	for _, invalid := range []string{"short", "contains spaces", "../../unsafe", string(make([]byte, 121))} {
		if validIdempotencyKey(invalid) {
			t.Fatalf("expected idempotency key %q to be rejected", invalid)
		}
	}
	if !validReportPeriod("2026-2027 P1") || validReportPeriod("2026/2027") || validReportPeriod("") {
		t.Fatal("report period validation did not enforce the safe character contract")
	}
}

func TestProviderBackedCapabilitiesFailClosed(t *testing.T) {
	service := &Service{}
	if _, err := service.CreateStudentDocument(context.Background(), "tenant", "user", CreateStudentDocumentRequest{}); !errors.Is(err, ErrDocumentStorageUnavailable) {
		t.Fatalf("document creation must fail closed, got %v", err)
	}
	if _, err := service.CreateStripeCheckoutSession(context.Background(), "tenant", "user", "payment", CreateCardCheckoutSessionRequest{}); !errors.Is(err, ErrCardPaymentsUnavailable) {
		t.Fatalf("card checkout must fail closed, got %v", err)
	}
	if _, err := service.GenerateReportCard(context.Background(), "tenant", "user", GenerateReportCardRequest{StudentID: "student", PersistAsDocument: true}); !errors.Is(err, ErrDocumentStorageUnavailable) {
		t.Fatalf("report-card document persistence must fail closed, got %v", err)
	}
}
