import React, { useState } from 'react';
import { CheckCircle, Clock, XCircle, Calendar, Filter, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Task {
  id: string;
  content: string;
  meetingName: string;
  meetingDate: string;
  status: 'pending' | 'completed' | 'postponed' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  deadline: string;
}

const TaskCenter: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock数据
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      content: '完成搜索功能需求文档',
      meetingName: '产品规划会议',
      meetingDate: '2024-01-15',
      status: 'pending',
      priority: 'high',
      assignee: '我',
      deadline: '2024-01-22',
    },
    {
      id: '2',
      content: '准备技术方案评审材料',
      meetingName: '技术架构讨论',
      meetingDate: '2024-01-14',
      status: 'pending',
      priority: 'high',
      assignee: '我',
      deadline: '2024-01-20',
    },
    {
      id: '3',
      content: '整理用户反馈并分类',
      meetingName: '用户需求分析会',
      meetingDate: '2024-01-13',
      status: 'completed',
      priority: 'medium',
      assignee: '我',
      deadline: '2024-01-18',
    },
    {
      id: '4',
      content: '更新项目进度表',
      meetingName: '周例会',
      meetingDate: '2024-01-12',
      status: 'pending',
      priority: 'low',
      assignee: '我',
      deadline: '2024-01-19',
    },
    {
      id: '5',
      content: '协调设计资源支持UI改版',
      meetingName: '产品规划会议',
      meetingDate: '2024-01-15',
      status: 'postponed',
      priority: 'medium',
      assignee: '我',
      deadline: '2024-01-25',
    },
    {
      id: '6',
      content: '编写API接口文档',
      meetingName: '技术架构讨论',
      meetingDate: '2024-01-14',
      status: 'pending',
      priority: 'medium',
      assignee: '我',
      deadline: '2024-01-21',
    },
  ]);

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    
    if (filter !== 'all') {
      filtered = filtered.filter(task => task.status === filter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.meetingName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getStatusConfig = (status: Task['status']) => {
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

  const getPriorityConfig = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: '高' };
      case 'medium':
        return { color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', label: '中' };
      case 'low':
        return { color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: '低' };
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', label: '未知' };
    }
  };

  // 按会议分组
  const groupedTasks = getFilteredTasks().reduce((acc, task) => {
    if (!acc[task.meetingName]) {
      acc[task.meetingName] = [];
    }
    acc[task.meetingName].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const filteredTasks = getFilteredTasks();
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    postponed: tasks.filter(t => t.status === 'postponed').length,
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              个人任务中心
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              查看和管理您的所有待办任务，按会议维度分组展示
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
              批量操作
            </button>
          </div>
        </div>

        {/* Stats */}
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

      {/* Filters and Search */}
      <div className="px-8 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          {/* Filter Tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: '全部' },
              { key: 'pending', label: '待处理' },
              { key: 'completed', label: '已完成' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
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

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索任务或会议..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>

          <button className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            筛选
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto p-8">
        <AnimatePresence>
          {Object.entries(groupedTasks).map(([meetingName, meetingTasks]) => (
            <motion.div
              key={meetingName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              {/* Meeting Header */}
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {meetingName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {meetingTasks[0]?.meetingDate} · {meetingTasks.length}个任务
                  </p>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                {meetingTasks.map(task => {
                  const statusConfig = getStatusConfig(task.status);
                  const priorityConfig = getPriorityConfig(task.priority);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      className={`${statusConfig.bg} border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Status Icon */}
                        <div className="mt-1">
                          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium mb-2 ${
                            task.status === 'completed' 
                              ? 'text-gray-500 dark:text-gray-400 line-through' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {task.content}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className={`px-2 py-0.5 rounded ${priorityConfig.bg} ${priorityConfig.color}`}>
                              {priorityConfig.label}优先级
                            </span>
                            <span>截止: {task.deadline}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        {task.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusChange(task.id, 'completed')}
                              className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              完成
                            </button>
                            <button
                              onClick={() => handleStatusChange(task.id, 'postponed')}
                              className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors flex items-center gap-1"
                            >
                              <Clock className="w-3 h-3" />
                              延期
                            </button>
                            <button
                              onClick={() => handleStatusChange(task.id, 'rejected')}
                              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              拒绝
                            </button>
                          </div>
                        )}

                        {task.status !== 'pending' && (
                          <button
                            onClick={() => handleStatusChange(task.id, 'pending')}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            重置
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无任务</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCenter;
