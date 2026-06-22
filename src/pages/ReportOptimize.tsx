import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Sparkles,
  FileText,
  ChevronDown,
  RefreshCw,
  FileEdit,
  Download,
  AlertCircle,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  optimizeReport,
  fetchMeetingList,
  type ReportScenario,
  type ReportAudience,
  type ReportStyle,
  type ReportHighlight,
} from '../api/meeting';
import { fetchSettingSource } from '../api/setting';
import { useMeetingIdFromRoute } from '../hooks/useMeetingIdFromRoute';
import { onMeetingDeleted } from '../utils/meetingEvents';
import { pathWithMeetingId } from '../utils/meetingRoute';

const DEFAULT_ORIGINAL = `【决策】搜索功能作为P0优先级，架构重构作为P1优先级
【分工】李四负责搜索功能需求文档，预计下周完成
【分工】王五准备技术方案，需要两周时间
【问题】UI改版需要更多时间，建议延期到3月中旬
【待办】协调运维团队解决测试环境部署失败问题`;

const ReportOptimize: React.FC = () => {
  const navigate = useNavigate();
  const meetingId = useMeetingIdFromRoute();

  const [scenario, setScenario] = useState<ReportScenario>('project-progress');
  const [audience, setAudience] = useState<ReportAudience>('direct-manager');
  const [style, setStyle] = useState<ReportStyle>('concise');
  const [originalText, setOriginalText] = useState(DEFAULT_ORIGINAL);
  const [optimizedText, setOptimizedText] = useState('');
  const [highlights, setHighlights] = useState<ReportHighlight[]>([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);

  const scenarioOptions: { value: ReportScenario; label: string }[] = [
    { value: 'project-progress', label: '项目进展' },
    { value: 'weekly-report', label: '周报' },
    { value: 'monthly-report', label: '月报' },
  ];

  const audienceOptions: { value: ReportAudience; label: string }[] = [
    { value: 'direct-manager', label: '直属上级' },
    { value: 'team', label: '团队成员' },
    { value: 'executive', label: '高层管理' },
    { value: 'client', label: '客户' },
  ];

  const styleOptions: { value: ReportStyle; label: string; icon: string }[] = [
    { value: 'concise', label: '简洁型', icon: '📝' },
    { value: 'data-driven', label: '数据型', icon: '📊' },
    { value: 'storytelling', label: '故事型', icon: '📖' },
  ];

  const loadConclusions = useCallback(async () => {
    try {
      const data = await fetchSettingSource(meetingId);
      setOriginalText(data.conclusions_text);
      setMeetingTitle(data.meeting_title);
    } catch {
      // 接口不可用时保留默认文本
    }
  }, [meetingId]);

  useEffect(() => {
    loadConclusions();
  }, [loadConclusions]);

  useEffect(() => {
    return onMeetingDeleted(async ({ meetingId: deletedId }) => {
      if (deletedId !== meetingId) return;
      try {
        const list = await fetchMeetingList();
        if (list.length === 0) {
          navigate('/import', { replace: true });
          return;
        }
        navigate(pathWithMeetingId('/report', list[0].meeting_id), { replace: true });
      } catch {
        navigate('/import', { replace: true });
      }
    });
  }, [meetingId, navigate]);

  const handleOptimize = async () => {
    if (!originalText.trim()) return;
    setIsOptimizing(true);
    setErrorMessage(null);
    try {
      const result = await optimizeReport({
        original_text: originalText,
        scenario,
        audience,
        style,
      });
      setOptimizedText(result.optimized_text);
      setHighlights(result.highlights);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '优化失败，请稍后重试');
    } finally {
      setIsOptimizing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage('复制失败，请手动选择文本复制');
    }
  };

  const originalWordCount = originalText.length;
  const optimizedWordCount = optimizedText.length;
  const wordCountChange =
    optimizedWordCount > 0 && originalWordCount > 0
      ? Math.round(((optimizedWordCount - originalWordCount) / originalWordCount) * 100)
      : 0;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">汇报话术优化</h1>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">汇报场景:</span>
            <button
              onClick={() => setShowScenarioMenu(v => !v)}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              {scenarioOptions.find(s => s.value === scenario)?.label}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showScenarioMenu && (
              <div className="absolute top-full left-16 mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                {scenarioOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setScenario(option.value);
                      setShowScenarioMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      scenario === option.value
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">目标受众:</span>
            <select
              value={audience}
              onChange={e => setAudience(e.target.value as ReportAudience)}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {audienceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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

          {meetingTitle && (
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <FileText className="w-4 h-4" />
              来源会议: {meetingTitle}
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mx-8 mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-2 gap-0">
          <div className="border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50/30 dark:bg-gray-800/30">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                原始会议结论
              </h3>
            </div>
            <textarea
              value={originalText}
              onChange={e => setOriginalText(e.target.value)}
              className="flex-1 w-full p-6 resize-none focus:outline-none bg-transparent text-sm text-gray-900 dark:text-gray-100 leading-relaxed"
              placeholder="在此输入原始会议结论，或通过 ?meeting_id= 自动加载纪要..."
            />
          </div>

          <div className="flex flex-col bg-white dark:bg-gray-900">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                AI 优化后话术
              </h3>
              <button
                onClick={() => copyToClipboard(optimizedText)}
                disabled={!optimizedText}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 flex items-center gap-1 disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-500">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    一键复制
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {isOptimizing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">AI 正在优化汇报话术...</p>
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
                    <p className="text-sm">点击「开始优化」生成汇报话术</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <FileEdit className="w-4 h-4" />
            变更说明
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {highlights.map((item, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-base">{item.icon || '·'}</span>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{item.label}:</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleOptimize}
              disabled={isOptimizing || !originalText.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isOptimizing ? 'animate-pulse' : ''}`} />
              {optimizedText ? '重新生成' : '开始优化'}
            </button>
            <button
              onClick={() => copyToClipboard(optimizedText)}
              disabled={!optimizedText}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制优化结果'}
            </button>
            <button
              onClick={() => {
                if (!optimizedText) return;
                const blob = new Blob([optimizedText], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `汇报优化_${new Date().toISOString().split('T')[0]}.txt`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              disabled={!optimizedText}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              导出文本
            </button>
          </div>

          {optimizedText && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">字数:</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{originalWordCount}</span>
              <span className="text-gray-400">→</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{optimizedWordCount}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  wordCountChange > 0
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {wordCountChange > 0 ? '+' : ''}
                {wordCountChange}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportOptimize;
