/**
 * Utility functions for user name formatting and deduplication
 */

export function formatFullName(name?: string, surname?: string): string {
  const cleanName = (name || '').trim();
  const cleanSurname = (surname || '').trim();

  if (!cleanSurname) return cleanName;
  if (!cleanName) return cleanSurname;

  // Check if cleanName already ends with or contains cleanSurname
  const nameWords = cleanName.split(/\s+/);
  const lastWord = nameWords[nameWords.length - 1];

  if (lastWord.toLowerCase() === cleanSurname.toLowerCase()) {
    return cleanName;
  }

  return `${cleanName} ${cleanSurname}`.trim();
}

export function sanitizeNameInputs(name: string, surname: string): { cleanFirstName: string; cleanSurname: string } {
  let cleanFirst = (name || '').trim();
  const cleanSur = (surname || '').trim();

  if (cleanSur && cleanFirst.toLowerCase().endsWith(cleanSur.toLowerCase())) {
    cleanFirst = cleanFirst.slice(0, -cleanSur.length).trim();
  }

  return {
    cleanFirstName: cleanFirst || name.trim(),
    cleanSurname: cleanSur
  };
}
