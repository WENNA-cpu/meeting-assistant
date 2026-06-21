import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Edit3, Check, X, FileText, Lightbulb, Users, CheckSquare, AlertCircle, Download, CheckCheck, Sparkles, Play, Search, Trash2, Loader2, ChevronDown, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchMeetingSummary,
  updateMeetingSummary,
  extractTasksFromSummary,
  fetchMeetingList,
  formatMeetingLabel,
  type TranscriptSegment,
  type StructuredItem,
  type MeetingListItem,
} from '../api/meeting';
import { pathWithMeetingId, setStoredMeetingId } from '../utils/meetingRoute';

type FilterType = 'all' | 'decision' | 'assignment' | 'todo' | 'issue';

const SmartSummary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMeetingId = searchParams.get('meeting_id');
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(urlMeetingId);
  const prevUrlMeetingIdRef = useRef(urlMeetingId);

  useEffect(() => {
    if (urlMeetingId !== prevUrlMeetingIdRef.current) {
      prevUrlMeetingIdRef.current = urlMeetingId;
      if (urlMeetingId) {
        setActiveMeetingId(urlMeetingId);
      }
    }
  }, [urlMeetingId]);

  const resetMeetingViewState = useCallback(() => {
    setErrorMessage(null);
    setEditingId(null);
    setActiveFilter('all');
    setTranscriptSearch('');
    setHighlightedSegmentIds([]);
    setHighlightedSegmentId(null);
    setStructuredItems([]);
    setTranscriptSegments([]);
    setMeetingInfo({ title: '', date: '', participants: [] });
    setCurrentPlayingId(null);
    setTaskCount(0);
  }, []);

  const [taskCount, setTaskCount] = useState(0);

  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const defaultMeetingApplied = useRef(false);
  const loadSeqRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [meetingInfo, setMeetingInfo] = useState({ title: '', date: '', participants: [] as string[] });
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [structuredItems, setStructuredItems] = useState<StructuredItem[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [highlightedSegmentIds, setHighlightedSegmentIds] = useState<string[]>([]);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [summaryModal, setSummaryModal] = useState<
    | { kind: 'confirm-all-prompt'; count: number }
    | { kind: 'confirm-all-info' }
    | { kind: 'generate-warning' }
    | { kind: 'generate-success'; confirmed: number; tasks: number }
    | null
  >(null);
  const transcriptRefs = useRef<Record<string, HTMLDivElement>>({});

  useEffect(() => {
    if (!activeMeetingId) {
      if (!meetingsLoading) {
        setLoading(false);
        setErrorMessage('缺少会议 ID，请从会议导入页进入');
      }
      return;
    }

    const seq = ++loadSeqRef.current;
    setStoredMeetingId(activeMeetingId);
    setLoading(true);
    resetMeetingViewState();

    (async () => {
      try {
        const data = await fetchMeetingSummary(activeMeetingId);
        if (seq !== loadSeqRef.current) return;
        setMeetingInfo(data.meeting_info);
        setTranscriptSegments(data.transcript_segments);
        setStructuredItems(data.structured_items);
        setTaskCount(data.task_count ?? 0);
        if (data.error) {
          setErrorMessage(data.error);
        }
        if (data.transcript_segments.length > 0) {
          setCurrentPlayingId(data.transcript_segments[0].id);
        }
      } catch (err) {
        if (seq !== loadSeqRef.current) return;
        setErrorMessage(err instanceof Error ? err.message : '加载纪要失败');
      } finally {
        if (seq === loadSeqRef.current) setLoading(false);
      }
    })();
  }, [activeMeetingId, resetMeetingViewState]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMeetingsLoading(true);
      try {
        const list = await fetchMeetingList();
        if (cancelled) return;
        setMeetings(list);
        if (!defaultMeetingApplied.current && list.length > 0) {
          const currentId = new URLSearchParams(window.location.search).get('meeting_id');
          if (!currentId) {
            defaultMeetingApplied.current = true;
            const latestId = list[0].meeting_id;
            setStoredMeetingId(latestId);
            navigate(pathWithMeetingId(location.pathname, latestId), { replace: true });
          }
        }
      } catch {
        if (!cancelled) setMeetings([]);
      } finally {
        if (!cancelled) setMeetingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (meetingsLoading || !activeMeetingId || meetings.length === 0) return;
    if (meetings.some(m => m.meeting_id === activeMeetingId)) return;
    const fallback = meetings.find(m => m.task_count > 0) ?? meetings[0];
    setActiveMeetingId(fallback.meeting_id);
    setStoredMeetingId(fallback.meeting_id);
    setSearchParams({ meeting_id: fallback.meeting_id }, { replace: true });
  }, [meetings, meetingsLoading, activeMeetingId, setSearchParams]);

  const handleMeetingChange = (newMeetingId: string) => {
    if (!newMeetingId || newMeetingId === activeMeetingId) return;
    setActiveMeetingId(newMeetingId);
    setStoredMeetingId(newMeetingId);
    setSearchParams({ meeting_id: newMeetingId });
    setLoading(true);
    resetMeetingViewState();
  };

  const persistItems = useCallback(async (items: StructuredItem[]) => {
    if (!activeMeetingId) return;
    try {
      await updateMeetingSummary(activeMeetingId, items);
    } catch {
      setErrorMessage('保存失败，请稍后重试');
    }
  }, [activeMeetingId]);

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'decision':
        return { icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', label: '决策' };
      case 'issue':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', label: '问题' };
      case 'assignment':
        return { icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', label: '分工' };
      case 'todo':
        return { icon: CheckSquare, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', label: '待办' };
      default:
        return { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', label: '其他' };
    }
  };

  // 解析条目关联的转写片段（无 sourceSegmentIds 时按内容模糊匹配）
  const resolveSourceSegmentIds = useCallback(
    (item: StructuredItem): string[] => {
      if (item.sourceSegmentIds?.length > 0) {
        return item.sourceSegmentIds;
      }
      const keywords = item.content
        .split(/[，。、；：!\s]+/)
        .map(k => k.trim())
        .filter(k => k.length >= 2);
      const matched = transcriptSegments.filter(
        seg =>
          keywords.some(k => seg.content.includes(k)) ||
          seg.content.split(/[，。、；：!\s]+/).some(k => k.length >= 4 && item.content.includes(k)),
      );
      return matched.map(seg => seg.id);
    },
    [transcriptSegments],
  );

  // 点击结构化条目时高亮左侧对应转写
  const handleItemClick = (item: StructuredItem) => {
    const segmentIds = resolveSourceSegmentIds(item);
    if (segmentIds.length === 0) return;

    setTranscriptSearch('');
    setHighlightedSegmentIds(segmentIds);
    setHighlightedSegmentId(segmentIds[0]);

    const element = transcriptRefs.current[segmentIds[0]];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleEdit = (item: StructuredItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  const handleSave = (id: string) => {
    const next = structuredItems.map(item =>
      item.id === id ? { ...item, content: editContent, manually_edited: true } : item
    );
    setStructuredItems(next);
    setEditingId(null);
    persistItems(next);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  const toggleConfirm = (id: string) => {
    const next = structuredItems.map(item =>
      item.id === id ? { ...item, confirmed: !item.confirmed } : item
    );
    setStructuredItems(next);
    persistItems(next);
  };

  const handleDelete = (id: string) => {
    const next = structuredItems.filter(item => item.id !== id);
    setStructuredItems(next);
    persistItems(next);
  };

  const executeConfirmAll = () => {
    const next = structuredItems.map(item => ({ ...item, confirmed: true }));
    setStructuredItems(next);
    persistItems(next);
    setSummaryModal(null);
  };

  const confirmAll = () => {
    if (structuredItems.length === 0) return;
    const unconfirmedCount = structuredItems.filter(item => !item.confirmed).length;
    if (unconfirmedCount === 0) {
      setSummaryModal({ kind: 'confirm-all-info' });
      return;
    }
    setSummaryModal({ kind: 'confirm-all-prompt', count: unconfirmedCount });
  };

  const handleGenerateTasks = async () => {
    if (!activeMeetingId) return;
    const confirmedItems = structuredItems.filter(item => item.confirmed);
    if (confirmedItems.length === 0) {
      setSummaryModal({ kind: 'generate-warning' });
      return;
    }
    setGeneratingTasks(true);
    try {
      await updateMeetingSummary(activeMeetingId, structuredItems);
      const data = await extractTasksFromSummary(activeMeetingId);
      setTaskCount(data.count);
      setSummaryModal({
        kind: 'generate-success',
        confirmed: confirmedItems.length,
        tasks: data.count,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '生成任务失败');
    } finally {
      setGeneratingTasks(false);
    }
  };

  const goToTaskPriority = () => {
    if (!activeMeetingId) return;
    setSummaryModal(null);
    navigate(pathWithMeetingId('/priority', activeMeetingId));
  };

  const handleAddManualItem = () => {
    const content = window.prompt('请输入纪要内容');
    if (!content?.trim()) return;
    const newItem: StructuredItem = {
      id: `manual-${Date.now()}`,
      type: 'todo',
      content: content.trim(),
      confirmed: false,
      sourceSegmentIds: [],
      manually_edited: true,
    };
    const next = [...structuredItems, newItem];
    setStructuredItems(next);
    persistItems(next);
  };

  const exportToMarkdown = () => {
    const confirmedItems = structuredItems.filter(item => item.confirmed);
    
    let markdown = `# ${meetingInfo.title}\n\n`;
    markdown += `时间：${meetingInfo.date}\n`;
    markdown += `参会人：${meetingInfo.participants.join(' / ')}\n\n`;
    markdown += '---\n\n';
    
    const groupedItems = {
      decision: confirmedItems.filter(i => i.type === 'decision'),
      issue: confirmedItems.filter(i => i.type === 'issue'),
      assignment: confirmedItems.filter(i => i.type === 'assignment'),
      todo: confirmedItems.filter(i => i.type === 'todo'),
    };

    if (groupedItems.decision.length > 0) {
      markdown += '## 💡 决策事项\n\n';
      groupedItems.decision.forEach(item => {
        markdown += `- ${item.content}\n`;
      });
      markdown += '\n';
    }

    if (groupedItems.issue.length > 0) {
      markdown += '## ⚠️ 待解决问题\n\n';
      groupedItems.issue.forEach(item => {
        markdown += `- ${item.content}\n`;
      });
      markdown += '\n';
    }

    if (groupedItems.assignment.length > 0) {
      markdown += '## 👥 任务分工\n\n';
      groupedItems.assignment.forEach(item => {
        markdown += `- ${item.content}\n`;
      });
      markdown += '\n';
    }

    if (groupedItems.todo.length > 0) {
      markdown += '## ✅ 待办事项\n\n';
      groupedItems.todo.forEach(item => {
        markdown += `- ${item.content}\n`;
      });
      markdown += '\n';
    }

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meetingInfo.title}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 根据筛选条件过滤结构化条目
  const getFilteredItems = () => {
    if (activeFilter === 'all') return structuredItems;
    return structuredItems.filter(item => item.type === activeFilter);
  };

  // 转写区域：按关键词搜索
  const getVisibleTranscriptSegments = () => {
    const query = transcriptSearch.trim().toLowerCase();
    if (!query) return transcriptSegments;

    return transcriptSegments.filter(
      seg =>
        seg.content.toLowerCase().includes(query) ||
        seg.speaker.toLowerCase().includes(query),
    );
  };

  const confirmedCount = structuredItems.filter(i => i.confirmed).length;
  const totalCount = structuredItems.length;
  const progressPercent = totalCount > 0 ? (confirmedCount / totalCount) * 100 : 0;

  if (loading || (!activeMeetingId && (meetingsLoading || meetings.length === 0))) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">
            {activeMeetingId ? '正在加载会议纪要...' : '正在加载会议列表...'}
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage && !meetingInfo.title) {
    const isMissingId = !activeMeetingId;
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {isMissingId
              ? '缺少会议 ID，请先上传会议或从会议导入页进入'
              : errorMessage}
          </p>
          {isMissingId && (
            <button
              onClick={() => navigate('/import')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              返回会议导入
            </button>
          )}
        </div>
      </div>
    );
  }

  // 根据筛选条件过滤
  const filteredItems = getFilteredItems();
  const visibleTranscriptSegments = getVisibleTranscriptSegments();
  const groupedItems = {
    decision: filteredItems.filter(i => i.type === 'decision'),
    issue: filteredItems.filter(i => i.type === 'issue'),
    assignment: filteredItems.filter(i => i.type === 'assignment'),
    todo: filteredItems.filter(i => i.type === 'todo'),
  };

  const filterTabs: { key: FilterType; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'all', label: '全部', icon: FileText, count: structuredItems.length },
    { key: 'decision', label: '决策', icon: Lightbulb, count: structuredItems.filter(i => i.type === 'decision').length },
    { key: 'assignment', label: '分工', icon: Users, count: structuredItems.filter(i => i.type === 'assignment').length },
    { key: 'todo', label: '待办', icon: CheckSquare, count: structuredItems.filter(i => i.type === 'todo').length },
    { key: 'issue', label: '问题', icon: AlertCircle, count: structuredItems.filter(i => i.type === 'issue').length },
  ];

  return (
    <div key={activeMeetingId ?? 'empty'} className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header - 会议信息 */}
      <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">选择会议</span>
          <div className="relative flex-1 max-w-md">
            <select
              value={activeMeetingId ?? ''}
              onChange={e => handleMeetingChange(e.target.value)}
              disabled={meetingsLoading || meetings.length === 0}
              className="w-full appearance-none pl-3 pr-9 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {meetingsLoading && <option value="">加载中...</option>}
              {!meetingsLoading && meetings.length === 0 && (
                <option value="">暂无会议，请先导入</option>
              )}
              {meetings.map(m => (
                <option key={m.meeting_id} value={m.meeting_id}>
                  {formatMeetingLabel(m)} · {m.upload_time}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {meetingInfo.title}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{meetingInfo.date}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                <span>参会人: {meetingInfo.participants.join(' / ')}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmAll}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <CheckCheck className="w-4 h-4" />
              一键确认全部
            </button>
            <button
              onClick={exportToMarkdown}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              导出纪要
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            已确认 {confirmedCount}/{totalCount}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            任务中心 {taskCount} 条
            {totalCount > 0 && taskCount !== totalCount && (
              <span className="text-amber-600 dark:text-amber-400 ml-1">
                （请确认纪要后点击「生成任务」同步）
              </span>
            )}
          </span>
          <div className="flex-1 min-w-[120px] h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mx-8 mt-4 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-2 gap-0">
          {/* Left: Raw Transcript */}
          <div className="border-r border-gray-200 dark:border-gray-700 overflow-auto bg-gray-50/30 dark:bg-gray-800/30">
            {/* Transcript Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700 z-10">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 shrink-0">
                  <FileText className="w-4 h-4" />
                  原始转写
                </h3>
                <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={transcriptSearch}
                      onChange={e => setTranscriptSearch(e.target.value)}
                      placeholder="搜索转写..."
                      className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>
                  {transcriptSearch && (
                    <button
                      type="button"
                      onClick={() => setTranscriptSearch('')}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors shrink-0"
                      aria-label="清除搜索"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    REC
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">00:45:23</span>
                </div>
              </div>
            </div>

            {/* Transcript Segments */}
            <div className="p-6 space-y-3">
              {visibleTranscriptSegments.length === 0 ? (
                <p className="text-sm text-center text-gray-400 dark:text-gray-500 py-8">
                  {transcriptSearch ? '未找到匹配的转写内容' : '暂无转写片段'}
                </p>
              ) : (
              visibleTranscriptSegments.map((segment) => {
                const isHighlighted =
                  highlightedSegmentIds.includes(segment.id) || highlightedSegmentId === segment.id;
                const isCurrentPlaying = currentPlayingId === segment.id;
                
                return (
                  <div
                    key={segment.id}
                    ref={(el) => {
                      if (el) transcriptRefs.current[segment.id] = el;
                    }}
                    className={`relative p-4 rounded-lg transition-all duration-300 ${
                      isHighlighted
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-400 dark:ring-yellow-500 shadow-md'
                        : isCurrentPlaying
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {/* Current Playing Indicator */}
                    {isCurrentPlaying && (
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                    
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isCurrentPlaying 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        }`}>
                          {segment.speaker.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                          {segment.timestamp}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {segment.speaker}
                          </p>
                          {isCurrentPlaying && (
                            <span className="text-xs text-blue-500 flex items-center gap-1">
                              <Play className="w-3 h-3" />
                              当前播放位置
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                          {segment.content}
                        </p>
                        {isHighlighted && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                            <div className="w-3 h-0.5 bg-yellow-500"></div>
                            高亮联动区域
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>

          {/* Right: Structured Summary */}
          <div className="overflow-auto bg-white dark:bg-gray-900">
            {/* Summary Header with Filter Tabs */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700 z-10">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-500" />
                结构化纪要
              </h3>
              
              {/* Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
                {filterTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                        isActive 
                          ? 'bg-white/20' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary Items */}
            <div className="p-6 space-y-4">
              {filteredItems.length === 0 && (
                <p className="text-sm text-center text-gray-400 dark:text-gray-500 py-8">
                  {activeFilter === 'all' ? '暂无结构化条目' : '该分类下暂无条目'}
                </p>
              )}
              <AnimatePresence>
                {/* Decisions */}
                {(activeFilter === 'all' || activeFilter === 'decision') && groupedItems.decision.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="space-y-2">
                      {groupedItems.decision.map(item => {
                        const config = getTypeConfig(item.type);
                        const Icon = config.icon;
                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.01, x: 2 }}
                            className={`${config.bg} border ${config.border} rounded-lg p-4 cursor-pointer transition-all ${
                              item.confirmed ? 'opacity-100' : 'opacity-70'
                            }`}
                            onClick={() => handleItemClick(item)}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={`w-5 h-5 ${config.color} mt-0.5 shrink-0`} />
                              <div className="flex-1 min-w-0">
                                {editingId === item.id ? (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      value={editContent}
                                      onChange={e => setEditContent(e.target.value)}
                                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                      rows={2}
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSave(item.id);
                                        }}
                                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        <Check className="inline w-3 h-3 mr-1" />
                                        保存
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancel();
                                        }}
                                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                      >
                                        <X className="inline w-3 h-3 mr-1" />
                                        取消
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm text-gray-900 dark:text-white leading-relaxed flex-1">
                                        {item.content}
                                      </p>
                                      {item.confirmed ? (
                                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                      ) : (
                                        <span className="text-xs text-orange-500 whitespace-nowrap flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          待确认
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(item);
                                        }}
                                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 flex items-center gap-1"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        编辑
                                      </button>
                                      {!item.confirmed && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleConfirm(item.id);
                                          }}
                                          className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 flex items-center gap-1"
                                        >
                                          <Check className="w-3 h-3" />
                                          确认
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(item.id);
                                        }}
                                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        删除
                                      </button>
                                      {resolveSourceSegmentIds(item).length > 0 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleItemClick(item);
                                          }}
                                          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
                                        >
                                          查看原文
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Issues */}
                {(activeFilter === 'all' || activeFilter === 'issue') && groupedItems.issue.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="space-y-2">
                      {groupedItems.issue.map(item => {
                        const config = getTypeConfig(item.type);
                        const Icon = config.icon;
                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.01, x: 2 }}
                            className={`${config.bg} border ${config.border} rounded-lg p-4 cursor-pointer transition-all ${
                              item.confirmed ? 'opacity-100' : 'opacity-70'
                            }`}
                            onClick={() => handleItemClick(item)}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={`w-5 h-5 ${config.color} mt-0.5 shrink-0`} />
                              <div className="flex-1">
                                {editingId === item.id ? (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      value={editContent}
                                      onChange={e => setEditContent(e.target.value)}
                                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                      rows={2}
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSave(item.id);
                                        }}
                                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        <Check className="inline w-3 h-3 mr-1" />
                                        保存
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancel();
                                        }}
                                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                      >
                                        <X className="inline w-3 h-3 mr-1" />
                                        取消
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm text-gray-900 dark:text-white leading-relaxed flex-1">
                                        {item.content}
                                      </p>
                                      {item.confirmed ? (
                                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                      ) : (
                                        <span className="text-xs text-orange-500 whitespace-nowrap flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          待确认
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(item);
                                        }}
                                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 flex items-center gap-1"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        编辑
                                      </button>
                                      {!item.confirmed && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleConfirm(item.id);
                                          }}
                                          className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 flex items-center gap-1"
                                        >
                                          <Check className="w-3 h-3" />
                                          确认
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(item.id);
                                        }}
                                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        删除
                                      </button>
                                      {resolveSourceSegmentIds(item).length > 0 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleItemClick(item);
                                          }}
                                          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
                                        >
                                          查看原文
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Assignments */}
                {(activeFilter === 'all' || activeFilter === 'assignment') && groupedItems.assignment.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="space-y-2">
                      {groupedItems.assignment.map(item => {
                        const config = getTypeConfig(item.type);
                        const Icon = config.icon;
                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.01, x: 2 }}
                            className={`${config.bg} border ${config.border} rounded-lg p-4 cursor-pointer transition-all ${
                              item.confirmed ? 'opacity-100' : 'opacity-70'
                            }`}
                            onClick={() => handleItemClick(item)}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={`w-5 h-5 ${config.color} mt-0.5 shrink-0`} />
                              <div className="flex-1">
                                {editingId === item.id ? (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      value={editContent}
                                      onChange={e => setEditContent(e.target.value)}
                                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                      rows={2}
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSave(item.id);
                                        }}
                                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        <Check className="inline w-3 h-3 mr-1" />
                                        保存
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancel();
                                        }}
                                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                      >
                                        <X className="inline w-3 h-3 mr-1" />
                                        取消
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm text-gray-900 dark:text-white leading-relaxed flex-1">
                                        {item.content}
                                      </p>
                                      {item.confirmed ? (
                                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                      ) : (
                                        <span className="text-xs text-orange-500 whitespace-nowrap flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          待确认
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(item);
                                        }}
                                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 flex items-center gap-1"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        编辑
                                      </button>
                                      {!item.confirmed && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleConfirm(item.id);
                                          }}
                                          className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 flex items-center gap-1"
                                        >
                                          <Check className="w-3 h-3" />
                                          确认
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(item.id);
                                        }}
                                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        删除
                                      </button>
                                      {resolveSourceSegmentIds(item).length > 0 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleItemClick(item);
                                          }}
                                          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
                                        >
                                          查看原文
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Todos */}
                {(activeFilter === 'all' || activeFilter === 'todo') && groupedItems.todo.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="space-y-2">
                      {groupedItems.todo.map(item => {
                        const config = getTypeConfig(item.type);
                        const Icon = config.icon;
                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.01, x: 2 }}
                            className={`${config.bg} border ${config.border} rounded-lg p-4 cursor-pointer transition-all ${
                              item.confirmed ? 'opacity-100' : 'opacity-70'
                            }`}
                            onClick={() => handleItemClick(item)}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={`w-5 h-5 ${config.color} mt-0.5 shrink-0`} />
                              <div className="flex-1">
                                {editingId === item.id ? (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      value={editContent}
                                      onChange={e => setEditContent(e.target.value)}
                                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                      rows={2}
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSave(item.id);
                                        }}
                                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        <Check className="inline w-3 h-3 mr-1" />
                                        保存
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancel();
                                        }}
                                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                      >
                                        <X className="inline w-3 h-3 mr-1" />
                                        取消
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm text-gray-900 dark:text-white leading-relaxed flex-1">
                                        {item.content}
                                      </p>
                                      {item.confirmed ? (
                                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                      ) : (
                                        <span className="text-xs text-orange-500 whitespace-nowrap flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          待确认
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEdit(item);
                                        }}
                                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 flex items-center gap-1"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        编辑
                                      </button>
                                      {!item.confirmed && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleConfirm(item.id);
                                          }}
                                          className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 flex items-center gap-1"
                                        >
                                          <Check className="w-3 h-3" />
                                          确认
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(item.id);
                                        }}
                                        className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        删除
                                      </button>
                                      {resolveSourceSegmentIds(item).length > 0 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleItemClick(item);
                                          }}
                                          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
                                        >
                                          查看原文
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add Manual Item Button */}
              <button
                onClick={handleAddManualItem}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-lg">+</span>
                手动添加条目
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    已确认 <span className="font-semibold text-gray-900 dark:text-white">{confirmedCount}</span>/{totalCount}
                  </span>
                  <button
                    onClick={confirmAll}
                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 font-medium"
                  >
                    一键确认全部
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateTasks}
                    disabled={!activeMeetingId || generatingTasks}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingTasks ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        生成任务
                        <span className="text-lg">→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {summaryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setSummaryModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {summaryModal.kind === 'confirm-all-prompt' && (
                <>
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20">
                        <CheckCheck className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          确认全部纪要
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          确定将{' '}
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {summaryModal.count}
                          </span>{' '}
                          条未确认纪要全部标记为已确认吗？
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSummaryModal(null)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                        aria-label="关闭"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSummaryModal(null)}
                      className="px-5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={executeConfirmAll}
                      className="px-5 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      确认全部
                    </button>
                  </div>
                </>
              )}

              {summaryModal.kind === 'confirm-all-info' && (
                <>
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          已全部确认
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          所有纪要条目均已确认，可直接点击「生成任务」同步到任务中心。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSummaryModal(null)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                        aria-label="关闭"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSummaryModal(null)}
                      className="px-5 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      知道了
                    </button>
                  </div>
                </>
              )}

              {summaryModal.kind === 'generate-warning' && (
                <>
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                        <AlertCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          无法生成任务
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          请先确认至少一条纪要，再点击「生成任务」同步到任务中心。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSummaryModal(null)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                        aria-label="关闭"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSummaryModal(null)}
                      className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      知道了
                    </button>
                  </div>
                </>
              )}

              {summaryModal.kind === 'generate-success' && (
                <>
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          任务生成成功
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          已从{' '}
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {summaryModal.confirmed}
                          </span>{' '}
                          条已确认纪要生成{' '}
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {summaryModal.tasks}
                          </span>{' '}
                          个任务，已写入任务中心。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSummaryModal(null)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                        aria-label="关闭"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSummaryModal(null)}
                      className="px-5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      留在本页
                    </button>
                    <button
                      type="button"
                      onClick={goToTaskPriority}
                      className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      前往任务优先级
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartSummary;
