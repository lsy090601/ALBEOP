/** 열린국회정보 API의 날짜 문자열을 Postgres date용 'YYYY-MM-DD'로 정규화한다. */
export function normalizeDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(trimmed)) return trimmed.replace(/\./g, '-');
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  return null;
}
