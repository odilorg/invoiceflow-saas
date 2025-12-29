/**
 * Input Normalization Utilities
 *
 * Professional input handling for forms:
 * - Trim whitespace
 * - Normalize decimals
 * - Format phone numbers
 * - Clean invoice numbers
 */

/**
 * Trim whitespace from string input
 */
export function trimInput(value: string): string {
  return value.trim();
}

/**
 * Normalize amount/decimal input
 * - Trim whitespace
 * - Parse as float
 * - Format to specified decimal places
 * - Return empty string if invalid
 */
export function normalizeAmount(
  value: string,
  decimals: number = 2
): string {
  const trimmed = value.trim();

  if (trimmed === '' || trimmed === '-') {
    return '';
  }

  const parsed = parseFloat(trimmed);

  if (isNaN(parsed)) {
    return '';
  }

  return parsed.toFixed(decimals);
}

/**
 * Validate and normalize email
 * - Trim whitespace
 * - Convert to lowercase
 * - Validate basic format
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Normalize invoice number
 * - Trim whitespace
 * - Convert to uppercase
 * - Remove special characters (optional)
 */
export function normalizeInvoiceNumber(
  value: string,
  removeSpecialChars: boolean = false
): string {
  let normalized = value.trim().toUpperCase();

  if (removeSpecialChars) {
    // Keep only alphanumeric and hyphens
    normalized = normalized.replace(/[^A-Z0-9-]/g, '');
  }

  return normalized;
}

/**
 * Normalize phone number
 * - Trim whitespace
 * - Remove all non-numeric characters (except +)
 */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();

  // Keep + at start if present
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }

  return trimmed.replace(/\D/g, '');
}

/**
 * Normalize date to ISO format (YYYY-MM-DD)
 * Accepts various input formats:
 * - ISO: 2024-01-15
 * - US: 01/15/2024
 * - EU: 15/01/2024
 * - Timestamp: 1705305600000
 * - Date object
 */
export function normalizeDate(value: string | number | Date): string | null {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else if (typeof value === 'string') {
    // Try parsing as ISO first
    date = new Date(value);

    // If invalid, try other formats
    if (isNaN(date.getTime())) {
      // Try US format (MM/DD/YYYY)
      const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (usMatch) {
        const [, month, day, year] = usMatch;
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Try EU format (DD/MM/YYYY)
      const euMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (euMatch) {
        const [, day, month, year] = euMatch;
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }
  } else {
    return null;
  }

  // Validate date
  if (isNaN(date.getTime())) {
    return null;
  }

  // Return ISO format (YYYY-MM-DD)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format ISO date to readable format
 * Input: 2024-01-15
 * Output: January 15, 2024 (default) or custom format
 */
export function formatDate(
  isoDate: string,
  format: 'long' | 'short' | 'medium' = 'long'
): string {
  const date = new Date(isoDate);

  if (isNaN(date.getTime())) {
    return isoDate; // Return original if invalid
  }

  const optionsMap: Record<'long' | 'short' | 'medium', Intl.DateTimeFormatOptions> = {
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    short: { year: '2-digit', month: 'numeric', day: 'numeric' },
  };

  const options = optionsMap[format];
  return date.toLocaleDateString('en-US', options);
}

/**
 * Normalize URL
 * - Trim whitespace
 * - Add https:// if missing protocol
 * - Convert to lowercase
 */
export function normalizeUrl(value: string): string {
  let normalized = value.trim().toLowerCase();

  // Add https:// if no protocol
  if (normalized && !normalized.match(/^https?:\/\//)) {
    normalized = `https://${normalized}`;
  }

  return normalized;
}

/**
 * Normalize name (client name, user name)
 * - Trim whitespace
 * - Capitalize first letter of each word
 * - Remove extra spaces
 */
export function normalizeName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generic form data normalizer
 * Apply normalization rules to entire form object
 */
export function normalizeFormData<T extends Record<string, any>>(
  data: T,
  rules: Partial<Record<keyof T, (value: any) => any>>
): T {
  const normalized = { ...data };

  for (const field in rules) {
    if (field in normalized) {
      const normalizer = rules[field];
      if (normalizer) {
        normalized[field] = normalizer(normalized[field]);
      }
    }
  }

  return normalized;
}
