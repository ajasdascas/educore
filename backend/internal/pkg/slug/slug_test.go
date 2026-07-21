package slug

import "testing"

func TestNormalize(t *testing.T) {
	cases := map[string]string{
		"Kinder Uno":        "kinder-uno",
		"  Colegio_La Paz ": "colegio-la-paz",
		"Niños Felices":     "ninos-felices",
		"--weird--slug--":   "weird-slug",
		"UPPER":             "upper",
		"a  b":             "a-b",
		"café":              "cafe",
	}
	for in, want := range cases {
		if got := Normalize(in); got != want {
			t.Errorf("Normalize(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestValidate(t *testing.T) {
	valid := []string{"kinder1", "colegio-la-paz", "ab", "a1", "escuela-2026"}
	for _, s := range valid {
		if err := Validate(s); err != nil {
			t.Errorf("Validate(%q) inesperadamente inválido: %v", s, err)
		}
	}

	invalid := []string{
		"",             // vacío
		"a",            // muy corto
		"-abc",         // guion inicial
		"abc-",         // guion final
		"a--b",         // guion doble
		"Abc",          // mayúscula
		"esc uela",     // espacio
		"www",          // reservado
		"api",          // reservado
		"educore",      // reservado
		"onlineu",      // reservado
		"dashboard",    // reservado
	}
	for _, s := range invalid {
		if err := Validate(s); err == nil {
			t.Errorf("Validate(%q) debería ser inválido pero pasó", s)
		}
	}
}
