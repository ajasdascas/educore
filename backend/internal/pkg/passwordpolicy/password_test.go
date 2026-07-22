package passwordpolicy

import (
	"strings"
	"testing"
)

func TestValidate(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{name: "strong", password: "Temporal-Segura-2026!"},
		{name: "short", password: "Adm1n!", wantErr: true},
		{name: "missing uppercase", password: "temporal-segura-2026!", wantErr: true},
		{name: "missing lowercase", password: "TEMPORAL-SEGURA-2026!", wantErr: true},
		{name: "missing number", password: "Temporal-Segura-SinNumero!", wantErr: true},
		{name: "missing symbol", password: "TemporalSegura2026", wantErr: true},
		{name: "non ASCII letter is not a symbol", password: "ContrasenaSegura2026ñ", wantErr: true},
		{name: "bcrypt byte limit", password: "Aa1!" + strings.Repeat("x", 69), wantErr: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if err := Validate(test.password); (err != nil) != test.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}
