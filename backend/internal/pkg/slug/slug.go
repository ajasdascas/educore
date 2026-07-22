// Package slug normaliza y valida los slugs de escuela que se usan como
// etiqueta de subdominio (p. ej. kinder1 -> kinder1.onlineu.mx).
//
// Reglas: solo [a-z0-9-], 2..63 caracteres, sin guion inicial/final, sin
// guiones dobles y no puede ser una palabra reservada de infraestructura.
package slug

import (
	"errors"
	"regexp"
	"strings"
)

// Reserved son etiquetas de subdominio que NO pueden asignarse a una escuela.
// Debe mantenerse alineado con:
//   - frontend/lib/tenant.ts (EXCLUDED_SUBDOMAINS)
//   - frontend/htaccess-subdomain-root (lista de exclusión del router)
var Reserved = map[string]bool{
	"www": true, "api": true, "mail": true, "ftp": true, "smtp": true,
	"webmail": true, "admin": true, "dashboard": true, "app": true,
	"educore": true, "onlineu": true, "support": true, "status": true,
	"static": true, "assets": true, "cdn": true, "dev": true, "staging": true,
	"cpanel": true, "webdisk": true, "portal": true, "login": true,
	"auth": true, "public": true, "ns1": true, "ns2": true, "mx": true,
}

var (
	validRe        = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)
	spacesRe       = regexp.MustCompile(`[\s_]+`)
	invalidCharsRe = regexp.MustCompile(`[^a-z0-9-]`)
	multiHyphenRe  = regexp.MustCompile(`-{2,}`)
	accentReplacer = strings.NewReplacer(
		"á", "a", "à", "a", "ä", "a", "â", "a",
		"é", "e", "è", "e", "ë", "e", "ê", "e",
		"í", "i", "ì", "i", "ï", "i", "î", "i",
		"ó", "o", "ò", "o", "ö", "o", "ô", "o",
		"ú", "u", "ù", "u", "ü", "u", "û", "u",
		"ñ", "n", "ç", "c",
	)
)

// Normalize convierte un texto libre (nombre o slug tentativo) en un slug
// candidato: minúsculas, sin acentos, espacios/underscore -> guion, quita
// caracteres inválidos, colapsa guiones y recorta los de los extremos.
func Normalize(input string) string {
	s := strings.ToLower(strings.TrimSpace(input))
	s = accentReplacer.Replace(s)
	s = spacesRe.ReplaceAllString(s, "-")
	s = invalidCharsRe.ReplaceAllString(s, "")
	s = multiHyphenRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

// Validate verifica que un slug ya normalizado sea válido y no reservado.
func Validate(s string) error {
	if len(s) < 2 {
		return errors.New("el subdominio debe tener al menos 2 caracteres")
	}
	if len(s) > 63 {
		return errors.New("el subdominio no puede exceder 63 caracteres")
	}
	if strings.Contains(s, "--") {
		return errors.New("el subdominio no puede tener guiones dobles")
	}
	if !validRe.MatchString(s) {
		return errors.New("usa solo minúsculas, números y guiones (sin guion inicial o final)")
	}
	if Reserved[s] {
		return errors.New("ese subdominio está reservado, elige otro")
	}
	return nil
}

// IsReserved indica si una etiqueta está reservada.
func IsReserved(s string) bool {
	return Reserved[strings.ToLower(strings.TrimSpace(s))]
}
