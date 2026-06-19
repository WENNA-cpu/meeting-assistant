import React, { useState, useRef } from 'react';
import { Edit3, Check, X, FileText, Lightbulb, Users, CheckSquare, AlertCircle, Download, CheckCheck, Sparkles, Play, Pause, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TranscriptSegment {
  id: string;
  speaker: string;
  content: string;
  timestamp: string;
}

interface StructuredItem {
  id: string;
  type: 'decision' | 'issue' | 'assignment' | 'todo';
  content: string;
  confirmed: boolean;
  sourceSegmentIds: string[];
}

type FilterType = 'all' | 'decision' | 'assignment' | 'todo' | 'issue';

const SmartSummary: React.FC = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [currentPlayingId, setCurrentPlayingId] = useState<string>('s4');
  const transcriptRefs = useRef<Record<string, HTMLDivElement>>({});

  // Mock会议信息
  const meetingInfo = {
    title: 'Q1产品规划周会',
    date: '2024-01-15 14:00',
    participants: ['张三', '李四', '王五'],
  };

  // Mock原始转写数据（带时间戳和发言人）
  const transcriptSegments: TranscriptSegment[] = [
    { id: 's1', speaker: '张三', content: '大家好，今天我们讨论一下Q1的产品规划。首先我想确认一下新功能的优先级。', timestamp: '00:02:15' },
    { id: 's2', speaker: '李四', content: '我觉得用户反馈最多的搜索功能应该优先做，这个已经拖了两个月了。', timestamp: '00:02:48' },
    { id: 's3', speaker: '王五', content: '我同意，但是技术架构重构也很重要，不然后续开发会很慢。', timestamp: '00:03:12' },
    { id: 's4', speaker: '张三', content: '那我们先定下来，搜索功能作为P0优先级，架构重构作为P1。', timestamp: '00:03:45' },
    { id: 's5', speaker: '李四', content: '好的，我来负责搜索功能的需求文档，预计下周完成。', timestamp: '00:04:02' },
    { id: 's6', speaker: '王五', content: '那我这边开始准备技术方案，需要两周时间。', timestamp: '00:04:28' },
    { id: 's7', speaker: '张三', content: '另外，关于UI改版的问题，设计团队说需要更多时间。', timestamp: '00:05:10' },
    { id: 's8', speaker: '李四', content: '那我们延期到3月中旬吧，先保证核心功能上线。', timestamp: '00:05:35' },
    { id: 's9', speaker: '王五', content: '还有一个问题，测试环境最近不太稳定，经常部署失败。', timestamp: '00:06:12' },
    { id: 's10', speaker: '张三', content: '这个问题需要运维团队介入，我来协调一下。', timestamp: '00:06:28' },
  ];

  const [structuredItems, setStructuredItems] = useState<StructuredItem[]>([
    {
      id: '1',
      type: 'decision',
      content: '搜索功能作为P0优先级，架构重构作为P1优先级',
      confirmed: true,
      sourceSegmentIds: ['s2', 's3', 's4'],
    },
    {
      id: '2',
      type: 'assignment',
      content: '李四负责搜索功能需求文档，预计下周完成',
      confirmed: true,
      sourceSegmentIds: ['s5'],
    },
    {
      id: '3',
      type: 'assignment',
      content: '王五准备技术方案，需要两周时间',
      confirmed: false,
      sourceSegmentIds: ['s6'],
    },
    {
      id: '4',
      type: 'issue',
      content: 'UI改版需要更多时间，建议延期到3月中旬',
      confirmed: false,
      sourceSegmentIds: ['s7', 's8'],
    },
    {
      id: '5',
      type: 'todo',
      content: '确保核心功能在3月初上线',
      confirmed: false,
      sourceSegmentIds: ['s8'],
    },
    {
      id: '6',
      type: 'issue',
      content: '测试环境不稳定，经常部署失败',
      confirmed: false,
      sourceSegmentIds: ['s9'],
    },
    {
      id: '7',
      type: 'assignment',
      content: '张三协调运维团队解决测试环境问题',
      confirmed: false,
      sourceSegmentIds: ['s10'],
    },
  ]);

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

  // 点击结构化条目时高亮左侧对应文本
  const handleItemClick = (item: StructuredItem) => {
    if (item.sourceSegmentIds.length > 0) {
      const firstSegmentId = item.sourceSegmentIds[0];
      setHighlightedSegmentId(firstSegmentId);
      
      const element = transcriptRefs.current[firstSegmentId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleEdit = (item: StructuredItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  const handleSave = (id: string) => {
    setStructuredItems(items =>
      items.map(item => (item.id === id ? { ...item, content: editContent } : item))
    );
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditContent('');
  };

  const toggleConfirm = (id: string) => {
    setStructuredItems(items =>
      items.map(item => (item.id === id ? { ...item, confirmed: !item.confirmed } : item))
    );
  };

  const confirmAll = () => {
    setStructuredItems(items =>
      items.map(item => ({ ...item, confirmed: true }))
    );
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

  // 根据筛选条件过滤
  const getFilteredItems = () => {
    if (activeFilter === 'all') return structuredItems;
    return structuredItems.filter(item => item.type === activeFilter);
  };

  const filteredItems = getFilteredItems();
  const confirmedCount = structuredItems.filter(i => i.confirmed).length;
  const totalCount = structuredItems.length;

  // 按类型分组用于展示
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
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header - 会议信息 */}
      <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10">
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
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            已确认 {confirmedCount}/{totalCount}
          </span>
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-2 gap-0">
          {/* Left: Raw Transcript */}
          <div className="border-r border-gray-200 dark:border-gray-700 overflow-auto bg-gray-50/30 dark:bg-gray-800/30">
            {/* Transcript Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  原始转写
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    REC
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">00:45:23</span>
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Transcript Segments */}
            <div className="p-6 space-y-3">
              {transcriptSegments.map((segment) => {
                const isHighlighted = highlightedSegmentId === segment.id;
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
              })}
            </div>
          </div>

          {/* Right: Structured Summary */}
          <div className="overflow-auto bg-white dark:bg-gray-900">
            {/* Summary Header with Filter Tabs */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700 z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  结构化纪要
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  点击条目查看原文
                </span>
              </div>
              
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
                                      {item.sourceSegmentIds.length > 0 && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                          · {item.sourceSegmentIds.length}处来源
                                        </span>
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
                                      {item.sourceSegmentIds.length > 0 && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                          · {item.sourceSegmentIds.length}处来源
                                        </span>
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
                                      {item.sourceSegmentIds.length > 0 && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                          · {item.sourceSegmentIds.length}处来源
                                        </span>
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
                                      {item.sourceSegmentIds.length > 0 && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                          · {item.sourceSegmentIds.length}处来源
                                        </span>
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
              <button className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
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
                    onClick={exportToMarkdown}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    导出纪要
                  </button>
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-600 transition-colors flex items-center gap-2">
                    生成任务
                    <span className="text-lg">→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartSummary;
