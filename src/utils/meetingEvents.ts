export const MEETING_DELETED_EVENT = 'meeting-deleted';

export interface MeetingDeletedDetail {
  meetingId: string;
}

export function dispatchMeetingDeleted(meetingId: string): void {
  window.dispatchEvent(
    new CustomEvent<MeetingDeletedDetail>(MEETING_DELETED_EVENT, {
      detail: { meetingId },
    }),
  );
}

export function onMeetingDeleted(
  handler: (detail: MeetingDeletedDetail) => void,
): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<MeetingDeletedDetail>).detail;
    if (detail?.meetingId) {
      handler(detail);
    }
  };
  window.addEventListener(MEETING_DELETED_EVENT, listener);
  return () => window.removeEventListener(MEETING_DELETED_EVENT, listener);
}
