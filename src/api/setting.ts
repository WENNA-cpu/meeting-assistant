import type { MeetingConclusionsResponse, TaskCenterResponse } from './meeting';

const MOCK_SOURCE_TEXT = `【决策】搜索功能作为P0优先级，架构重构作为P1优先级
【分工】李四负责搜索功能需求文档，预计下周完成
【分工】王五准备技术方案，需要两周时间
【问题】UI改版需要更多时间，建议延期到3月中旬
【待办】协调运维团队解决测试环境部署失败问题`;

const MOCK_SOURCE_RESPONSE: MeetingConclusionsResponse = {
  meeting_id: 'test_001',
  meeting_title: 'Q1产品规划会（测试）',
  conclusions_text: MOCK_SOURCE_TEXT,
};

const MOCK_TASK_CENTER_RESPONSE: TaskCenterResponse = {
  tasks: [],
  total: 0,
  pending_count: 0,
  completed_count: 0,
  postponed_count: 0,
  rejected_count: 0,
};

/** 将 meeting_id 规范为 setting 接口路径参数（缺省时用 1） */
export function toSettingId(meetingId?: string | null): string {
  if (!meetingId) return '1';
  if (meetingId === 'test_001') return '1';
  return meetingId;
}

/** GET /api/setting/source/{id} — 汇报优化原文来源 */
export async function fetchSettingSource(
  meetingId?: string | null,
): Promise<MeetingConclusionsResponse> {
  const id = toSettingId(meetingId);
  try {
    const response = await fetch(`/api/setting/source/${id}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return {
        meeting_id: data.meeting_id,
        meeting_title: data.meeting_title,
        conclusions_text: data.conclusions_text ?? data.source_text,
      };
    }
  } catch {
    // 网络异常时使用 Mock
  }
  return MOCK_SOURCE_RESPONSE;
}

/** GET /api/setting/task/center/{userId} — 任务中心列表 */
export async function fetchSettingTaskCenter(
  userId: string = '1',
  status?: string,
): Promise<TaskCenterResponse> {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  try {
    const response = await fetch(`/api/setting/task/center/${userId}${query}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      return response.json();
    }
  } catch {
    // 网络异常时使用 Mock
  }
  return MOCK_TASK_CENTER_RESPONSE;
}
