/**
 * Dynamically generates initials from a shop's business name.
 * Extracts the first letter of each word in uppercase.
 * 
 * Examples:
 * - "Z Book Point" -> "ZBP"
 * - "ABC Print Shop" -> "APS"
 * - "Royal Xerox" -> "RX"
 * - "Campus Print Center" -> "CPC"
 * - "Campus" -> "C" (single-word fallback)
 */
export function getShopInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'PO';
  const clean = name.trim();
  if (!clean) return 'PO';

  // Split by whitespace
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 'PO';

  // Extract first letter of each word
  const initials = words
    .map(w => {
      const sanitized = w.replace(/[^a-zA-Z0-9]/g, '');
      return sanitized.length > 0 ? sanitized[0] : '';
    })
    .filter(Boolean)
    .join('')
    .toUpperCase();

  if (initials.length > 0) {
    return initials.slice(0, 4);
  }

  return 'PO';
}
