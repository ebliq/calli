import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a phone number to storage format: 00{countryCode}{number}
 * Handles formats like:
 *   +49 123 456 789  → 0049123456789
 *   0049 123 456 789 → 0049123456789
 *   49 1232123123    → 0049123212312 3
 *   0171 1234567     → 004917112345 67 (assumes German +49 for local numbers)
 *   +43 1 234 5678   → 004312345678
 */
export function normalizePhone(raw: string): string {
  // Strip everything except digits and leading +
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");

  if (!digits) return raw;

  // Already has 00 prefix (e.g. 0049...)
  if (digits.startsWith("00") && digits.length > 4) {
    return digits;
  }

  // Had + prefix (e.g. +49...) or starts with country code without prefix
  if (hasPlus) {
    return "00" + digits;
  }

  // Starts with 0 but not 00 → local number, assume German (+49)
  // e.g. 0171 1234567 → strip leading 0, prepend 0049
  if (digits.startsWith("0")) {
    return "0049" + digits.slice(1);
  }

  // Bare digits starting with known country codes (49, 43, 41, 44, 1, 33, 39, 34, 31, 32, 48, 420, 421)
  const countryCodes = ["49", "43", "41", "44", "33", "39", "34", "31", "32", "48", "420", "421", "1"];
  for (const cc of countryCodes) {
    if (digits.startsWith(cc) && digits.length >= cc.length + 4) {
      return "00" + digits;
    }
  }

  // Fallback: assume German local number
  return "0049" + digits;
}

/**
 * Format a stored phone number (00...) for display: +{cc} {groups}
 * e.g. 0049171234567 → +49 171 234 567
 *      004312345678  → +43 123 456 78
 */
export function formatPhoneDisplay(stored: string): string {
  const digits = stored.replace(/[^\d]/g, "");

  // Must start with 00 and have country code
  if (!digits.startsWith("00") || digits.length < 6) {
    // Fallback: just group the raw digits
    return stored;
  }

  const withoutPrefix = digits.slice(2); // strip "00"

  // Detect country code length (1-3 digits)
  const countryCodes3 = ["420", "421"];
  const countryCodes1 = ["1"];

  let ccLen = 2; // default: 2-digit country code (49, 43, 41, 44, 33, etc.)
  for (const cc of countryCodes3) {
    if (withoutPrefix.startsWith(cc)) { ccLen = 3; break; }
  }
  for (const cc of countryCodes1) {
    if (withoutPrefix.startsWith(cc) && ccLen === 2) { ccLen = 1; break; }
  }

  const countryCode = withoutPrefix.slice(0, ccLen);
  const number = withoutPrefix.slice(ccLen);

  // Group remaining digits in blocks of 3, last block can be 2-4
  const groups: string[] = [];
  let i = 0;
  while (i < number.length) {
    const remaining = number.length - i;
    if (remaining <= 4) {
      groups.push(number.slice(i));
      break;
    }
    groups.push(number.slice(i, i + 3));
    i += 3;
  }

  return `+${countryCode} ${groups.join(" ")}`;
}
