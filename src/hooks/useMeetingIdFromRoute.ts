import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { pathWithMeetingId, resolveMeetingId } from '../utils/meetingRoute';

/** 从 URL query（或 sessionStorage）解析 meeting_id，并回写到 URL */
export function useMeetingIdFromRoute(): string | null {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const meetingId = resolveMeetingId(searchParams);

  useEffect(() => {
    if (meetingId && !searchParams.get('meeting_id')) {
      navigate(pathWithMeetingId(location.pathname, meetingId), { replace: true });
    }
  }, [meetingId, searchParams, navigate, location.pathname]);

  return meetingId;
}
