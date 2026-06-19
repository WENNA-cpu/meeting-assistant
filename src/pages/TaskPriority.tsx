import React, { useState } from 'react';
import { GripVertical, User, Calendar, AlertCircle, ChevronDown, RefreshCw, CheckSquare, Plus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface Task {
  id: string;
  content: string;
  quadrant: 'urgent-important' | 'important-not-urgent' | 'urgent-not-important' | 'routine';
  assignee?: string;
  deadline?: string;
  isOverdue?: boolean;
  isAISuggestion?: boolean;
}

const TaskPriority: React.FC = () => {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      content: '修复搜索功能的核心bug，影响用户正常使用',
      quadrant: 'urgent-important',
      assignee: '李四',
      deadline: '2024-01-20',
    },
    {
      id: '2',
      content: '完成Q1产品规划文档',
      quadrant: 'important-not-urgent',
      assignee: '张三',
      deadline: '2024-02-01',
    },
    {
      id: '3',
      content: '回复客户邮件确认需求细节',
      quadrant: 'urgent-not-important',
      assignee: '王五',
      deadline: '2024-01-18',
      isAISuggestion: true,
    },
    {
      id: '4',
      content: '整理会议纪要并发送给参会人员',
      quadrant: 'routine',
      assignee: '赵六',
      deadline: '2024-01-17',
    },
    {
      id: '5',
      content: '准备下周的技术分享材料',
      quadrant: 'important-not-urgent',
      assignee: '李四',
      deadline: '2024-01-25',
    },
    {
      id: '6',
      content: '处理服务器告警通知',
      quadrant: 'urgent-important',
      assignee: '王五',
      deadline: '2024-01-17',
      isOverdue: true,
    },
  ]);

  const quadrants = {
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

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, quadrant: Task['quadrant']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, quadrant } : task
    ));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toggleSelect = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const getTasksByQuadrant = (quadrant: Task['quadrant']) => {
    return tasks.filter(task => task.quadrant === quadrant);
  };

  // 统计
  const stats = {
    total: tasks.length,
    'urgent-important': tasks.filter(t => t.quadrant === 'urgent-important').length,
    'important-not-urgent': tasks.filter(t => t.quadrant === 'important-not-urgent').length,
    'urgent-not-important': tasks.filter(t => t.quadrant === 'urgent-not-important').length,
    routine: tasks.filter(t => t.quadrant === 'routine').length,
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                任务优先级看板
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                来源: Q1产品规划周会
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              同步至飞书
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            📊 任务统计:
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            总计 {stats.total} 项
          </span>
          <span className="w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
          <span className="text-sm text-red-600 dark:text-red-400">
            🔴 紧急且重要 {stats['urgent-important']}
          </span>
          <span className="text-sm text-blue-600 dark:text-blue-400">
            🔵 重要不紧急 {stats['important-not-urgent']}
          </span>
          <span className="text-sm text-orange-600 dark:text-orange-400">
            🟠 紧急不重要 {stats['urgent-not-important']}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            ⚪ 常规 {stats.routine}
          </span>
        </div>
      </div>

      {/* Content - Four Quadrants */}
      <div className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-2 gap-6 h-full">
          {Object.entries(quadrants).map(([key, config]) => {
            const quadrantTasks = getTasksByQuadrant(key as Task['quadrant']);
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-gradient-to-br ${config.color} border-2 ${config.borderColor} rounded-xl flex flex-col`}
                onDrop={(e) => handleDrop(e, key as Task['quadrant'])}
                onDragOver={handleDragOver}
              >
                {/* Quadrant Header */}
                <div className={`${config.headerBg} px-4 py-3 rounded-t-lg flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <h3 className={`font-semibold text-sm ${config.headerText}`}>
                      {config.title}
                    </h3>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${config.headerBg} ${config.headerText} font-medium`}>
                    {quadrantTasks.length}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="flex-1 p-4 space-y-3 overflow-auto">
                  {quadrantTasks.map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      draggable
                      onDragStart={(e) => handleDragStart(e as any, task.id)}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-move border-2 ${
                        selectedTasks.includes(task.id)
                          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                          : 'border-transparent'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileDrag={{ scale: 1.05, zIndex: 10 }}
                      onClick={() => toggleSelect(task.id)}
                    >
                      {/* Checkbox */}
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={() => toggleSelect(task.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        <GripVertical className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed mb-2">
                            {task.content}
                          </p>
                          
                          {/* Task Meta */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                            {task.assignee && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{task.assignee}</span>
                              </div>
                            )}
                            {task.deadline && (
                              <div className={`flex items-center gap-1 ${task.isOverdue ? 'text-red-500' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                <span>{task.deadline}</span>
                                {task.isOverdue && (
                                  <span className="text-red-500 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    逾期
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* AI Suggestion Badge */}
                          {task.isAISuggestion && (
                            <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                AI建议，请确认
                              </span>
                            </div>
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

      {/* Bottom Action Bar */}
      <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              手动添加任务
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              已选择 {selectedTasks.length} 项
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={selectedTasks.length === 0}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              批量指派
            </button>
            <button 
              disabled={selectedTasks.length === 0}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              批量设截止日期
            </button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              确认并同步
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskPriority;
