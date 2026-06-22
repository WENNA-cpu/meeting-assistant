import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  fetchTaskCenter,
  fetchMeetingList,
  updateTaskStatus,
  deleteMeeting,
  formatMeetingLabel,
  type TaskCenterTask,
  type TaskCenterStatus,
  type MeetingListItem,
} from '../api/meeting';
import { dispatchMeetingDeleted } from '../utils/meetingEvents';
import { MEETING_ID_STORAGE_KEY, setStoredMeetingId } from '../utils/meetingRoute';

type StatusFilter = 'all' | 'pending' | 'completed';

const PRIORITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  'urgent-important': { label: '紧急重要', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  'important-not-urgent': { label: '重要', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'urgent-not-important': { label: '紧急', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  routine: { label: '常规', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
};

const TaskCenter: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [meetingFilter, setMeetingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<TaskCenterTask[]>([]);
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    postponed: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ meetingId: string; meetingName: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [data, meetingList] = await Promise.all([
        fetchTaskCenter(filter === 'all' ? undefined : filter),
        fetchMeetingList(),
      ]);
      setMeetings(meetingList);
      setTasks(data.tasks);
      setStats({
        total: data.total,
        pending: data.pending_count,
        completed: data.completed_count,
        postponed: data.postponed_count,
        rejected: data.rejected_count,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadTasks();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadTasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskCenterStatus) => {
    setUpdatingId(taskId);
    try {
      const updated = await updateTaskStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updated } : t)));
      setStats(prev => {
        const old = tasks.find(t => t.id === taskId);
        if (!old || old.status === newStatus) return prev;
        const next = { ...prev };
        if (old.status === 'pending') next.pending -= 1;
        if (old.status === 'completed') next.completed -= 1;
        if (old.status === 'postponed') next.postponed -= 1;
        if (old.status === 'rejected') next.rejected -= 1;
        if (newStatus === 'pending') next.pending += 1;
        if (newStatus === 'completed') next.completed += 1;
        if (newStatus === 'postponed') next.postponed += 1;
        if (newStatus === 'rejected') next.rejected += 1;
        return next;
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '更新状态失败');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { meetingId, meetingName } = deleteTarget;
    setDeletingId(meetingId);
    setErrorMessage(null);
    try {
      await deleteMeeting(meetingId);
      setMeetings(prev => prev.filter(m => m.meeting_id !== meetingId));
      setTasks(prev => prev.filter(t => t.meeting_id !== meetingId));
      if (meetingFilter === meetingId) {
        setMeetingFilter('all');
      }
      setStats(prev => {
        const removed = tasks.filter(t => t.meeting_id === meetingId);
        const next = { ...prev, total: prev.total - removed.length };
        for (const task of removed) {
          if (task.status === 'pending') next.pending -= 1;
          if (task.status === 'completed') next.completed -= 1;
          if (task.status === 'postponed') next.postponed -= 1;
          if (task.status === 'rejected') next.rejected -= 1;
        }
        return next;
      });
      dispatchMeetingDeleted(meetingId);
      const remaining = meetings.filter(m => m.meeting_id !== meetingId);
      if (remaining.length > 0) {
        setStoredMeetingId(remaining[0].meeting_id);
      } else {
        try {
          sessionStorage.removeItem(MEETING_ID_STORAGE_KEY);
        } catch {
          // ignore
        }
        navigate('/import', { replace: true });
      }
      setDeleteTarget(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : `删除会议「${meetingName}」失败`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (meetingFilter !== 'all') {
      result = result.filter(task => task.meeting_id === meetingFilter);
    }
    if (filter !== 'all') {
      result = result.filter(task => task.status === filter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        task =>
          task.content.toLowerCase().includes(q) ||
          task.meeting_name.toLowerCase().includes(q) ||
          (task.assignee || '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [tasks, meetingFilter, filter, searchQuery]);

  const groupedTasks = useMemo(() => {
    const tasksByMeeting: Record<string, TaskCenterTask[]> = {};
    for (const task of filteredTasks) {
      if (!tasksByMeeting[task.meeting_id]) {
        tasksByMeeting[task.meeting_id] = [];
      }
      tasksByMeeting[task.meeting_id].push(task);
    }

    const sourceMeetings =
      meetingFilter === 'all'
        ? meetings
        : meetings.filter(m => m.meeting_id === meetingFilter);

    return sourceMeetings.map(m => ({
      meetingId: m.meeting_id,
      meetingName: formatMeetingLabel(m),
      meetingDate: m.upload_time.split(' ')[0],
      tasks: tasksByMeeting[m.meeting_id] ?? [],
      taskCount: m.task_count,
      entryCount: m.entry_count,
    }));
  }, [meetings, filteredTasks, meetingFilter]);

  const getStatusConfig = (status: TaskCenterStatus) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', label: '待处理' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: '已完成' };
      case 'postponed':
        return { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', label: '已延期' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: '已拒绝' };
      default:
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800', label: '未知' };
    }
  };

  const getPriorityConfig = (priority: string) =>
    PRIORITY_LABELS[priority] || PRIORITY_LABELS.routine;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">正在加载任务...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">个人任务中心</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              查看和管理您的所有待办任务，按会议维度分组展示
            </p>
          </div>
          <button
            onClick={loadTasks}
            disabled={loading}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">总任务数</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70 mt-1">待处理</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">已完成</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.postponed}</p>
            <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">已延期</p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mx-8 mt-4 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="px-8 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-2">
            {(
              [
                { key: 'all', label: '全部' },
                { key: 'pending', label: '待处理' },
                { key: 'completed', label: '已完成' },
              ] as const
            ).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={meetingFilter}
            onChange={e => setMeetingFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部会议</option>
            {meetings.map(m => (
              <option key={m.meeting_id} value={m.meeting_id}>
                {formatMeetingLabel(m)}
              </option>
            ))}
          </select>

          <div className="flex-1 max-w-md min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索任务或会议..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <AnimatePresence>
          {groupedTasks.map(group => (
            <motion.div
              key={group.meetingId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {group.meetingName}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {group.meetingDate} · {group.tasks.length} 个任务
                      {group.entryCount > 0 && group.tasks.length !== group.entryCount && (
                        <span className="text-amber-600 dark:text-amber-400">
                          {' '}
                          · 纪要 {group.entryCount} 条（待同步）
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({ meetingId: group.meetingId, meetingName: group.meetingName })
                  }
                  disabled={deletingId === group.meetingId}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  title="删除会议"
                  aria-label={`删除会议 ${group.meetingName}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {group.tasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-4 py-6 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      该会议暂无任务，请先在智能纪要页生成任务
                    </p>
                  </div>
                ) : (
                  group.tasks.map(task => {
                  const statusConfig = getStatusConfig(task.status);
                  const priorityConfig = getPriorityConfig(task.priority);
                  const StatusIcon = statusConfig.icon;
                  const isUpdating = updatingId === task.id;

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      className={`${statusConfig.bg} border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow ${
                        isUpdating ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium mb-2 ${
                              task.status === 'completed'
                                ? 'text-gray-500 dark:text-gray-400 line-through'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {task.content}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                            <span className={`px-2 py-0.5 rounded ${priorityConfig.bg} ${priorityConfig.color}`}>
                              {priorityConfig.label}
                            </span>
                            {task.assignee && <span>负责人: {task.assignee}</span>}
                            {task.deadline && (
                              <span className={task.is_overdue ? 'text-red-500 font-medium' : ''}>
                                截止: {task.deadline}
                                {task.is_overdue && ' (逾期)'}
                              </span>
                            )}
                            <span className={`${statusConfig.color}`}>{statusConfig.label}</span>
                          </div>
                        </div>

                        {task.status === 'pending' && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleStatusChange(task.id, 'completed')}
                              disabled={isUpdating}
                              className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              <CheckCircle className="w-3 h-3" />
                              完成
                            </button>
                            <button
                              onClick={() => handleStatusChange(task.id, 'postponed')}
                              disabled={isUpdating}
                              className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              <Clock className="w-3 h-3" />
                              延期
                            </button>
                            <button
                              onClick={() => handleStatusChange(task.id, 'rejected')}
                              disabled={isUpdating}
                              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" />
                              拒绝
                            </button>
                          </div>
                        )}

                        {task.status !== 'pending' && (
                          <button
                            onClick={() => handleStatusChange(task.id, 'pending')}
                            disabled={isUpdating}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shrink-0 disabled:opacity-50"
                          >
                            重置
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {meetings.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无会议，请先在会议导入页上传会议</p>
          </div>
        )}

        {meetings.length > 0 && groupedTasks.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">没有符合筛选条件的任务</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => !deletingId && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">删除会议</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                确定要删除会议「{deleteTarget.meetingName}」及其所有纪要数据吗？此操作不可撤销。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={!!deletingId}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={!!deletingId}
                  className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  确认删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskCenter;
