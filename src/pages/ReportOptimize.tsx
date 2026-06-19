import React, { useState } from 'react';
import { Copy, Sparkles, FileText, Mail, Presentation, ChevronDown, RefreshCw, FileEdit, PlusCircle, MinusCircle, Repeat, Download } from 'lucide-react';
import { motion } from 'framer-motion';

type ReportScenario = 'project-progress' | 'weekly-report' | 'quarterly-review' | 'incident-report';
type TargetAudience = 'direct-manager' | 'team' | 'executive' | 'client';
type StyleType = 'concise' | 'data-driven' | 'storytelling';

const ReportOptimize: React.FC = () => {
  const [scenario, setScenario] = useState<ReportScenario>('project-progress');
  const [audience, setAudience] = useState<TargetAudience>('direct-manager');
  const [style, setStyle] = useState<StyleType>('concise');
  const [originalText, setOriginalText] = useState(`大家好，今天我们讨论了一下Q1的产品规划。我觉得搜索功能应该优先做，因为用户反馈很多，已经拖了两个月了。王五说架构重构也重要，不然后面开发会很慢。最后我们定下来搜索功能是P0，架构重构是P1。李四做需求文档，下周完成。王五做技术方案，两周。UI改版可能要到3月中旬了。`);
  const [optimizedText, setOptimizedText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const scenarioOptions: { value: ReportScenario; label: string }[] = [
    { value: 'project-progress', label: '项目进展' },
    { value: 'weekly-report', label: '周报' },
    { value: 'quarterly-review', label: '季度复盘' },
    { value: 'incident-report', label: '事故报告' },
  ];

  const audienceOptions: { value: TargetAudience; label: string }[] = [
    { value: 'direct-manager', label: '直属上级' },
    { value: 'team', label: '团队成员' },
    { value: 'executive', label: '高层管理' },
    { value: 'client', label: '客户' },
  ];

  const styleOptions: { value: StyleType; label: string; icon: string }[] = [
    { value: 'concise', label: '简洁型', icon: '📝' },
    { value: 'data-driven', label: '数据型', icon: '📊' },
    { value: 'storytelling', label: '故事型', icon: '📖' },
  ];

  const handleOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setOptimizedText(`【Q1 产品规划进展汇报】

一、核心进展
1. 经会议确认，Q1功能优先级已明确：搜索功能为P0，架构重构为P1。

二、任务分工
· 李四：搜索功能需求文档，交付时间 1月22日
· 王五：技术方案设计，交付时间 1月29日

三、风险与应对
· UI改版存在延期风险，已调整至3月中旬，优先保障核心功能3月初上线

四、下一步计划
· 本周完成需求文档评审
· 下周启动技术方案评审`);
      setIsOptimizing(false);
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const originalWordCount = originalText.length;
  const optimizedWordCount = optimizedText.length;
  const wordCountChange = optimizedWordCount > 0 
    ? ((optimizedWordCount - originalWordCount) / originalWordCount * 100).toFixed(0)
    : 0;

  const changeHighlights = [
    { type: 'structure', icon: '✏️', label: '结构调整', desc: '按「进展→分工→风险→计划」四段式重组' },
    { type: 'add', icon: '➕', label: '新增内容', desc: '补充具体交付日期（1月22日、1月29日）' },
    { type: 'remove', icon: '➖', label: '删减内容', desc: '去除口语赘词「我觉得」「已经拖了两个月」等' },
    { type: 'enhance', icon: '🔄', label: '语义强化', desc: '「定下来」→「经会议确认」' },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          汇报话术优化
        </h1>

        {/* Configuration Bar */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Scenario */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">汇报场景:</span>
            <button className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              {scenarioOptions.find(s => s.value === scenario)?.label}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Audience */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">目标受众:</span>
            <button className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              {audienceOptions.find(a => a.value === audience)?.label}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Style */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">风格:</span>
            <div className="flex gap-1.5">
              {styleOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setStyle(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1 ${
                    style === option.value
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source Meeting */}
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FileText className="w-4 h-4" />
            来源会议: Q1产品规划周会
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-2 gap-0">
          {/* Left: Original Text */}
          <div className="border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50/30 dark:bg-gray-800/30">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                优化前（会议原文）
              </h3>
            </div>
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              className="flex-1 w-full p-6 resize-none focus:outline-none bg-transparent text-sm text-gray-900 dark:text-gray-100 leading-relaxed"
              placeholder="在此输入您的原始汇报内容..."
            />
          </div>

          {/* Right: Optimized Text */}
          <div className="flex flex-col bg-white dark:bg-gray-900">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                优化后（汇报话术）
              </h3>
              <button
                onClick={() => copyToClipboard(optimizedText)}
                disabled={!optimizedText}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 flex items-center gap-1 disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                复制
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {isOptimizing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">AI正在优化您的汇报内容...</p>
                  </div>
                </div>
              ) : optimizedText ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full"
                >
                  <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 leading-relaxed h-full overflow-auto">
                    {optimizedText}
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">点击"重新生成"按钮优化汇报文案</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Highlights */}
      {optimizedText && (
        <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <FileEdit className="w-4 h-4" />
            变更说明
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {changeHighlights.map((item, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-base">{item.icon}</span>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{item.label}:</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleOptimize}
              disabled={isOptimizing || !originalText.trim()}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
              重新生成
            </button>
            <button
              onClick={() => copyToClipboard(optimizedText)}
              disabled={!optimizedText}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Copy className="w-4 h-4" />
              复制优化结果
            </button>
            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出 Word
            </button>
            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              <Presentation className="w-4 h-4" />
              插入飞书文档
            </button>
          </div>
          
          {optimizedText && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">字数:</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{originalWordCount}</span>
              <span className="text-gray-400">→</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{optimizedWordCount}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                Number(wordCountChange) > 0 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>
                {Number(wordCountChange) > 0 ? '+' : ''}{wordCountChange}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportOptimize;
