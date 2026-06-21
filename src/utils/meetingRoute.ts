export const MEETING_ID_STORAGE_KEY = 'current_meeting_id';

export function getStoredMeetingId(): string | null {
  try {
    return sessionStorage.getItem(MEETING_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredMeetingId(meetingId: string): void {
  try {
    sessionStorage.setItem(MEETING_ID_STORAGE_KEY, meetingId);
  } catch {
    // ignore
  }
}

/** 从 URL query 读取 meeting_id，并同步到 sessionStorage */
export function resolveMeetingId(searchParams: URLSearchParams): string | null {
  const fromQuery = searchParams.get('meeting_id');
  if (fromQuery) {
    setStoredMeetingId(fromQuery);
    return fromQuery;
  }
  return getStoredMeetingId();
}

/** 构建带 meeting_id 的路径（导入页不附带） */
export function pathWithMeetingId(path: string, meetingId: string | null): string {
  if (!meetingId || path === '/import' || path === '/') {
    return path;
  }
  return `${path}?meeting_id=${encodeURIComponent(meetingId)}`;
}

export const SMART_SUMMARY_PATH = '/smart-summary';
