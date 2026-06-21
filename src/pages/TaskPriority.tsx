import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GripVertical,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
  CheckSquare,
  Plus,
  Sparkles,
  Edit3,
  Check,
  X,
  Loader2,
  Cloud,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  updateMeetingTasks,
  extractTasksFromSummary,
  type MeetingTask,
  type TaskPriorityQuadrant,
} from '../api/meeting';
import { pathWithMeetingId } from '../utils/meetingRoute';
import { useMeetingIdFromRoute } from '../hooks/useMeetingIdFromRoute';

const QUADRANTS: Record<
  TaskPriorityQuadrant,
  {
    title: string;
    icon: string;
    color: string;
    borderColor: string;
    headerBg: string;
    headerText: string;
  }
> = {
  'urgent-important': {
    title: '紧急且重要',
    icon: '🔴',
    color: 'from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10',
    borderColor: 'border-red-200 dark:border-red-800',
    headerBg: 'bg-red-50 dark:bg-red-900/30',
    headerText: 'text-red-700 dark:text-red-300',
  },
  'important-not-urgent': {
    title: '重要不紧急',
    icon: '🔵',
    color: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10',
    borderColor: 'border-blue-200 dark:border-blue-800',
    headerBg: 'bg-blue-50 dark:bg-blue-900/30',
    headerText: 'text-blue-700 dark:text-blue-300',
  },
  'urgent-not-important': {
    title: '紧急不重要',
    icon: '🟠',
    color: 'from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10',
    borderColor: 'border-orange-200 dark:border-orange-800',
    headerBg: 'bg-orange-50 dark:bg-orange-900/30',
    headerText: 'text-orange-700 dark:text-orange-300',
  },
  routine: {
    title: '常规任务',
    icon: '⚪',
    color: 'from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30',
    borderColor: 'border-gray-200 dark:border-gray-700',
    headerBg: 'bg-gray-50 dark:bg-gray-800',
    headerText: 'text-gray-700 dark:text-gray-300',
  },
};

const QUADRANT_KEYS = Object.keys(QUADRANTS) as TaskPriorityQuadrant[];

interface EditForm {
  description: string;
  assignee: string;
  due_date: string;
}

const TaskPriority: React.FC = () => {
  const navigate = useNavigate();
  const meetingId = useMeetingIdFromRoute();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [tasks, setTasks] = useState<MeetingTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ description: '', assignee: '', due_date: '' });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!meetingId) {
      setErrorMessage('缺少会议 ID，请从智能纪要页生成任务');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await extractTasksFromSummary(meetingId);
      setMeetingTitle(data.meeting_title);
      setTasks(data.tasks);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const persistUpdates = async (updates: Parameters<typeof updateMeetingTasks>[1]) => {
    if (!meetingId) return;
    setSaving(true);
    try {
      const data = await updateMeetingTasks(meetingId, updates);
      setTasks(data.tasks);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '保存失败');
      await loadTasks();
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggingId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDrop = async (e: React.DragEvent, priority: TaskPriorityQuadrant) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setDraggingId(null);
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.priority === priority) return;

    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, priority } : t)));
    await persistUpdates([{ id: taskId, priority }]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toggleSelect = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId],
    );
  };

  const startEdit = (task: MeetingTask) => {
    setEditingId(task.id);
    setEditForm({
      description: task.description,
      assignee: task.assignee || '',
      due_date: task.due_date || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ description: '', assignee: '', due_date: '' });
  };

  const saveEdit = async (taskId: string) => {
    const description = editForm.description.trim();
    if (!description) return;

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              description,
              title: description.length > 50 ? description.slice(0, 49) + '…' : description,
              assignee: editForm.assignee || null,
              due_date: editForm.due_date || null,
            }
          : t,
      ),
    );
    setEditingId(null);
    await persistUpdates([
      {
        id: taskId,
        description,
        title: description.length > 50 ? description.slice(0, 49) + '…' : description,
        assignee: editForm.assignee || null,
        due_date: editForm.due_date || null,
      },
    ]);
  };

  const handleAddManualTask = () => {
    setErrorMessage('请先在智能纪要中确认纪要条目，再点击「生成任务」');
  };

  const getTasksByQuadrant = (priority: TaskPriorityQuadrant) =>
    tasks.filter(task => task.priority === priority);

  const stats = QUADRANT_KEYS.reduce(
    (acc, key) => {
      acc[key] = tasks.filter(t => t.priority === key).length;
      return acc;
    },
    { total: tasks.length } as Record<string, number>,
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">正在加载任务列表...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && tasks.length === 0 && !meetingTitle) {
    const isMissingId = !meetingId;
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {isMissingId ? '缺少会议 ID，请先从会议导入页上传或选择会议' : errorMessage}
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

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">任务优先级看板</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              来源: {meetingTitle || '未知会议'} · 共 {tasks.length} 项任务（来自已确认纪要）
              {saving && <span className="ml-2 text-blue-500">保存中...</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadTasks}
              disabled={loading || saving}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-400">📊 任务统计:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            总计 {stats.total} 项
          </span>
          <span className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
          {QUADRANT_KEYS.map(key => (
            <span
              key={key}
              className={`text-sm ${QUADRANTS[key].headerText}`}
            >
              {QUADRANTS[key].icon} {QUADRANTS[key].title} {stats[key] ?? 0}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-2 gap-6 min-h-[400px]">
          {QUADRANT_KEYS.map(key => {
            const config = QUADRANTS[key];
            const quadrantTasks = getTasksByQuadrant(key);
            const isDropTarget = draggingId !== null;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-gradient-to-br ${config.color} border-2 ${config.borderColor} rounded-xl flex flex-col transition-shadow ${
                  isDropTarget ? 'ring-2 ring-blue-300 dark:ring-blue-700' : ''
                }`}
                onDrop={e => handleDrop(e, key)}
                onDragOver={handleDragOver}
              >
                <div
                  className={`${config.headerBg} px-4 py-3 rounded-t-lg flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <h3 className={`font-semibold text-sm ${config.headerText}`}>{config.title}</h3>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${config.headerBg} ${config.headerText} font-medium`}
                  >
                    {quadrantTasks.length}
                  </span>
                </div>

                <div className="flex-1 p-4 space-y-3 overflow-auto min-h-[120px]">
                  {quadrantTasks.map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      draggable={editingId !== task.id}
                      onDragStart={e => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all border-2 ${
                        editingId === task.id
                          ? 'cursor-default border-blue-400'
                          : 'cursor-move border-transparent'
                      } ${
                        selectedTasks.includes(task.id)
                          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                          : ''
                      } ${draggingId === task.id ? 'opacity-50' : ''}`}
                      whileHover={editingId !== task.id ? { scale: 1.02 } : undefined}
                      onClick={() => editingId !== task.id && toggleSelect(task.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={() => toggleSelect(task.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                        <GripVertical className="w-4 h-4 text-gray-400 mt-1 shrink-0" />

                        <div className="flex-1 min-w-0">
                          {editingId === task.id ? (
                            <div onClick={e => e.stopPropagation()} className="space-y-2">
                              <textarea
                                value={editForm.description}
                                onChange={e =>
                                  setEditForm(prev => ({ ...prev, description: e.target.value }))
                                }
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                rows={3}
                                placeholder="任务描述"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editForm.assignee}
                                  onChange={e =>
                                    setEditForm(prev => ({ ...prev, assignee: e.target.value }))
                                  }
                                  className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                  placeholder="责任人"
                                />
                                <input
                                  type="date"
                                  value={editForm.due_date}
                                  onChange={e =>
                                    setEditForm(prev => ({ ...prev, due_date: e.target.value }))
                                  }
                                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEdit(task.id)}
                                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  保存
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed mb-2">
                                {task.description}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{task.assignee || '待指派'}</span>
                                </div>
                                {task.due_date && (
                                  <div
                                    className={`flex items-center gap-1 ${task.is_overdue ? 'text-red-500' : ''}`}
                                  >
                                    <Calendar className="w-3 h-3" />
                                    <span>{task.due_date}</span>
                                    {task.is_overdue && (
                                      <span className="text-red-500 font-medium flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        逾期
                                      </span>
                                    )}
                                  </div>
                                )}
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    startEdit(task);
                                  }}
                                  className="text-xs text-gray-500 hover:text-blue-500 flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  编辑
                                </button>
                              </div>
                              {task.is_ai_suggestion && (
                                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                                  <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    AI 从纪要提取，请确认
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {quadrantTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">拖拽任务到此处</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddManualTask}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              手动添加任务
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              已选择 {selectedTasks.length} 项
            </span>
          </div>
          <button
            onClick={() => setShowSyncModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            确认并同步
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSyncModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSyncModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                    <Cloud className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      第三方同步即将上线
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      该功能将在 <span className="font-medium text-blue-600 dark:text-blue-400">v1.1</span> 版本接入飞书/钉钉同步，敬请期待。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSyncModal(false)}
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
                  onClick={() => setShowSyncModal(false)}
                  className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  知道了
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskPriority;
