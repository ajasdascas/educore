package passwordpolicy

import "fmt"

const (
	MinCharacters = 12
	MaxBytes      = 72
)

// Validate applies the password policy shared by recovery, first-login
// changes and administrator-created temporary credentials.
func Validate(password string) error {
	if len([]rune(password)) < MinCharacters {
		return fmt.Errorf("la contraseña debe tener al menos %d caracteres", MinCharacters)
	}
	if len([]byte(password)) > MaxBytes {
		return fmt.Errorf("la contraseña no puede exceder %d bytes", MaxBytes)
	}
	var upper, lower, number, symbol bool
	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			upper = true
		case char >= 'a' && char <= 'z':
			lower = true
		case char >= '0' && char <= '9':
			number = true
		case isASCIISymbol(char):
			symbol = true
		}
	}
	if !upper || !lower || !number || !symbol {
		return fmt.Errorf("la contraseña requiere mayúscula, minúscula, número y símbolo")
	}
	return nil
}

func isASCIISymbol(char rune) bool {
	return char >= '!' && char <= '/' || char >= ':' && char <= '@' || char >= '[' && char <= '`' || char >= '{' && char <= '~'
}
