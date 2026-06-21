export interface ImportMeetingResponse {
  meeting_id: string;
  file_name: string;
  file_size: number;
  file_format: string;
  format_valid: boolean;
  status: string;
  message: string;
}

export interface RecentMeeting {
  meeting_id: string;
  file_name: string;
  upload_time: string;
  status: string;
  file_size: number;
}

export interface MeetingListItem {
  meeting_id: string;
  title: string;
  file_name: string;
  upload_time: string;
  status: string;
  file_size: number;
  task_count: number;
  entry_count: number;
  is_seed: boolean;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  content: string;
  timestamp: string;
}

export interface StructuredItem {
  id: string;
  type: 'decision' | 'issue' | 'assignment' | 'todo';
  content: string;
  confirmed: boolean;
  sourceSegmentIds: string[];
  manually_edited?: boolean;
}

export interface MeetingSummaryResponse {
  meeting_id: string;
  meeting_info: {
    title: string;
    date: string;
    participants: string[];
  };
  transcript_segments: TranscriptSegment[];
  structured_items: StructuredItem[];
  task_count?: number;
  status: string;
  summary_generated?: boolean;
  generation_source?: string;
  error?: string;
}

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];
const MAX_FILE_SIZE = 500 * 1024 * 1024;

export const TEST_MEETING_ID = 'test_001';
export const TEST_MEETING_2_ID = 'test_002';
export const TEST_MEETING_3_ID = 'test_003';

export async function ensureTestMeeting(): Promise<{ meeting_id: string; title: string; status: string }> {
  const response = await fetch('/api/meeting/test', { method: 'POST' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '创建测试会议失败');
  }
  return response.json();
}

export function validateAudioFile(file: File): string | null {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return '请上传 MP3、WAV 或 M4A 格式文件';
  }
  if (file.size > MAX_FILE_SIZE) {
    return '文件超过 500MB，请压缩后重试';
  }
  if (file.size === 0) {
    return '文件内容为空';
  }
  return null;
}

export function uploadMeeting(
  file: File,
  onProgress?: (percent: number) => void,
  title?: string,
): Promise<ImportMeetingResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as ImportMeetingResponse);
        } catch {
          reject(new Error('响应解析失败'));
        }
        return;
      }
      try {
        const errorBody = JSON.parse(xhr.responseText);
        reject(new Error(errorBody.detail || '上传失败，请检查网络后重试'));
      } catch {
        reject(new Error('上传失败，请检查网络后重试'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('上传失败，请检查网络后重试'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('上传已取消'));
    });

    xhr.open('POST', '/api/meeting/import');
    xhr.send(formData);
  });
}

export async function fetchRecentMeetings(): Promise<RecentMeeting[]> {
  const response = await fetch('/api/meeting/recent');
  if (!response.ok) {
    throw new Error('获取最近上传记录失败');
  }
  return response.json();
}

export function formatMeetingLabel(meeting: MeetingListItem): string {
  return `${meeting.title} · ${meeting.file_name}`;
}

export async function fetchMeetingList(): Promise<MeetingListItem[]> {
  const response = await fetch('/api/meeting/list', { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '获取会议列表失败');
  }
  return response.json();
}

export async function fetchMeetingSummary(meetingId: string): Promise<MeetingSummaryResponse> {
  const response = await fetch(`/api/meeting/summary/${encodeURIComponent(meetingId)}?_=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '获取会议纪要失败');
  }
  return response.json();
}

export async function updateMeetingSummary(
  meetingId: string,
  structuredItems: StructuredItem[],
): Promise<MeetingSummaryResponse> {
  const response = await fetch(`/api/meeting/summary/${meetingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structured_items: structuredItems }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '保存纪要失败');
  }
  return response.json();
}

export type TaskPriorityQuadrant =
  | 'urgent-important'
  | 'important-not-urgent'
  | 'urgent-not-important'
  | 'routine';

export interface MeetingTask {
  id: string;
  meeting_id: string;
  title: string;
  description: string;
  priority: TaskPriorityQuadrant;
  assignee?: string | null;
  due_date?: string | null;
  status: string;
  is_overdue: boolean;
  is_ai_suggestion: boolean;
  source_item_id?: string | null;
}

export interface MeetingTasksResponse {
  meeting_id: string;
  meeting_title: string;
  tasks: MeetingTask[];
  count: number;
}

export interface TaskUpdatePayload {
  id: string;
  title?: string;
  description?: string;
  priority?: TaskPriorityQuadrant;
  assignee?: string | null;
  due_date?: string | null;
  status?: string;
}

export async function fetchMeetingTasks(meetingId: string): Promise<MeetingTasksResponse> {
  const response = await fetch(`/api/meeting/tasks/${meetingId}`, { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '获取任务列表失败');
  }
  return response.json();
}

export async function updateMeetingTasks(
  meetingId: string,
  tasks: TaskUpdatePayload[],
): Promise<MeetingTasksResponse> {
  const response = await fetch('/api/meeting/tasks/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meeting_id: meetingId, tasks }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '更新任务失败');
  }
  return response.json();
}

export async function extractTasksFromSummary(meetingId: string): Promise<MeetingTasksResponse> {
  const response = await fetch('/api/meeting/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meeting_id: meetingId }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '生成任务失败');
  }
  return response.json();
}

export type ReportScenario = 'project-progress' | 'weekly-report' | 'monthly-report';
export type ReportAudience = 'direct-manager' | 'team' | 'executive' | 'client';
export type ReportStyle = 'concise' | 'data-driven' | 'storytelling';

export interface ReportHighlight {
  type: string;
  icon?: string;
  label: string;
  desc: string;
}

export interface OptimizeReportResponse {
  optimized_text: string;
  highlights: ReportHighlight[];
  original_word_count: number;
  optimized_word_count: number;
  change_percent: number;
  scenario: string;
  audience: string;
  style: string;
  generation_source?: string;
}

export interface MeetingConclusionsResponse {
  meeting_id: string;
  meeting_title: string;
  conclusions_text: string;
}

export async function fetchMeetingConclusions(
  meetingId: string,
): Promise<MeetingConclusionsResponse> {
  const response = await fetch(`/api/meeting/report/conclusions/${meetingId}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '获取会议结论失败');
  }
  return response.json();
}

export async function optimizeReport(params: {
  original_text: string;
  scenario: ReportScenario;
  audience?: ReportAudience;
  style?: ReportStyle;
}): Promise<OptimizeReportResponse> {
  const response = await fetch('/api/meeting/report/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      original_text: params.original_text,
      scenario: params.scenario,
      audience: params.audience ?? 'direct-manager',
      style: params.style ?? 'concise',
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '汇报优化失败');
  }
  return response.json();
}

export type TaskCenterStatus = 'pending' | 'completed' | 'postponed' | 'rejected';

export interface TaskCenterTask {
  id: string;
  meeting_id: string;
  title: string;
  description: string;
  content: string;
  priority: string;
  assignee?: string | null;
  due_date?: string | null;
  deadline?: string | null;
  status: TaskCenterStatus;
  is_overdue: boolean;
  is_ai_suggestion: boolean;
  meeting_name: string;
  meeting_date: string;
  quadrant?: string | null;
}

export interface TaskCenterResponse {
  tasks: TaskCenterTask[];
  total: number;
  pending_count: number;
  completed_count: number;
  postponed_count: number;
  rejected_count: number;
}

export async function fetchTaskCenter(status?: string): Promise<TaskCenterResponse> {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  const response = await fetch(`/api/meeting/tasks/center${query}`, { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '获取任务列表失败');
  }
  return response.json();
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskCenterStatus,
): Promise<TaskCenterTask> {
  const response = await fetch('/api/meeting/tasks/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, status }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || '更新任务状态失败');
  }
  return response.json();
}
