import { supabase } from '../db/supabase';

/**
 * Computes SHA-256 hexadecimal digest for passwords.
 * Never stores or compares plaintext passwords.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
  checks: {
    length: boolean;
    letters: boolean;
    numbers: boolean;
    symbols: boolean;
    noRepeating: boolean;
    noSequential: boolean;
  };
  suggestions: string[];
}

/**
 * Strict password complexity validation per PrintOn24 security rules:
 * - Minimum 8 characters
 * - Must contain letters (a-z, A-Z)
 * - Must contain numbers (0-9)
 * - Must contain symbols (@ or # only)
 * - Must not be trivial repeating (e.g. 000000, 111111)
 * - Must not be sequential sequences (e.g. 12345678)
 */
export function validatePasswordRules(password: string): PasswordValidationResult {
  const pwd = password || '';

  const hasLength = pwd.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(pwd);
  const hasNumbers = /[0-9]/.test(pwd);
  const hasAllowedSymbols = /[@#]/.test(pwd);

  // Check repeating characters (e.g. 000000, aaaaaa, 111111)
  const hasRepeating = /(.)\1{3,}/.test(pwd);

  // Check simple sequential digit or letter patterns (e.g. 123456, 012345, 654321, abcdef)
  const isSequential = (str: string): boolean => {
    const clean = str.toLowerCase();
    const sequences = [
      '0123456789',
      '9876543210',
      'abcdefghijklmnopqrstuvwxyz',
      'zyxwvutsrqponmlkjihgfedcba',
      '12345678',
      '87654321',
      '1234567890'
    ];
    for (const seq of sequences) {
      for (let i = 0; i <= seq.length - 4; i++) {
        const sub = seq.substring(i, i + 4);
        if (clean.includes(sub)) return true;
      }
    }
    return false;
  };

  const hasSequential = isSequential(pwd);

  const checks = {
    length: hasLength,
    letters: hasLetters,
    numbers: hasNumbers,
    symbols: hasAllowedSymbols,
    noRepeating: !hasRepeating,
    noSequential: !hasSequential
  };

  const suggestions: string[] = [];
  if (!hasLength) suggestions.push('Use at least 8 characters');
  if (!hasLetters) suggestions.push('Add both uppercase/lowercase letters (e.g. A-Z, a-z)');
  if (!hasNumbers) suggestions.push('Add numeric digits (0-9)');
  if (!hasAllowedSymbols) suggestions.push('Add a symbol: use @ or # only');
  if (hasRepeating) suggestions.push('Avoid repetitive characters like "000000"');
  if (hasSequential) suggestions.push('Avoid sequential sequences like "12345678"');

  let error: string | undefined;
  if (!hasLength) {
    error = 'Password must be at least 8 characters long.';
  } else if (!hasLetters) {
    error = 'Password must contain alphabets (letters).';
  } else if (!hasNumbers) {
    error = 'Password must contain numbers (0-9).';
  } else if (!hasAllowedSymbols) {
    error = 'Password must contain symbols (@ or # only).';
  } else if (hasRepeating) {
    error = 'Password cannot be repetitive characters (e.g. 000000).';
  } else if (hasSequential) {
    error = 'Password cannot be sequential numbers or letters (e.g. 12345678).';
  }

  const isValid =
    hasLength &&
    hasLetters &&
    hasNumbers &&
    hasAllowedSymbols &&
    !hasRepeating &&
    !hasSequential;

  return { isValid, error, checks, suggestions };
}
