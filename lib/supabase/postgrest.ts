export function sanitizePostgrestSearch(value: string, maxLength = 80) {
  return value
    .normalize('NFKC')
    .replace(/[^A-Za-z0-9À-ÖØ-öø-ÿÑñ\s@._+-]/g, '')
    .trim()
    .slice(0, maxLength);
}
