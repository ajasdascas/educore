export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_BYTES = 72;

export interface PasswordPolicyState {
  longEnough: boolean;
  withinByteLimit: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  valid: boolean;
}

function hasAsciiSymbol(password: string): boolean {
  return Array.from(password).some((character) => {
    const code = character.codePointAt(0) || 0;
    return (code >= 33 && code <= 47)
      || (code >= 58 && code <= 64)
      || (code >= 91 && code <= 96)
      || (code >= 123 && code <= 126);
  });
}

export function evaluatePassword(password: string): PasswordPolicyState {
  const state = {
    longEnough: Array.from(password).length >= PASSWORD_MIN_LENGTH,
    withinByteLimit: new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
	  hasSymbol: hasAsciiSymbol(password),
  };
  return { ...state, valid: Object.values(state).every(Boolean) };
}

// Backwards-compatible names used by the Super Admin temporary-password UI.
export const TEMPORARY_PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;
export const TEMPORARY_PASSWORD_MAX_BYTES = PASSWORD_MAX_BYTES;
export const evaluateTemporaryPassword = evaluatePassword;
