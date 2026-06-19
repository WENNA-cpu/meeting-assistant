import React, { useState, useEffect } from 'react';
import {
  FileUp,
  FileText,
  ListTodo,
  Sparkles,
  CheckSquare,
  Moon,
  Sun
} from 'lucide-react';
import MeetingImport from './pages/MeetingImport';
import SmartSummary from './pages/SmartSummary';
import TaskPriority from './pages/TaskPriority';
import ReportOptimize from './pages/ReportOptimize';
import TaskCenter from './pages/TaskCenter';

type TabKey = 'import' | 'summary' | 'priority' | 'report' | 'tasks';
type Theme = 'light' | 'dark';

interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const tabs: TabItem[] = [
  { key: 'import', label: '会议导入', icon: FileUp },
  { key: 'summary', label: '智能纪要', icon: FileText },
  { key: 'priority', label: '任务优先级', icon: ListTodo },
  { key: 'report', label: '汇报优化', icon: Sparkles },
  { key: 'tasks', label: '任务中心', icon: CheckSquare },
];

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    // 从 localStorage 或默认值初始化
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    }
    return 'light';
  });
  const [activeTab, setActiveTab] = useState<TabKey>('import');

  // 同步主题到 DOM 和 localStorage
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const renderContent = () => {
    switch (activeTab) {
      case 'import':
        return <MeetingImport />;
      case 'summary':
        return <SmartSummary />;
      case 'priority':
        return <TaskPriority />;
      case 'report':
        return <ReportOptimize />;
      case 'tasks':
        return <TaskCenter />;
      default:
        return <MeetingImport />;
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-900" data-theme={theme}>
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shrink-0">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              AI智能会议助手
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              让会议更高效，让工作更清晰
            </p>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="切换主题"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
          <div className="p-4 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : ''}`} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Info */}
          <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                💡 使用提示
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                从会议导入开始，AI将自动为您生成结构化纪要和任务清单
              </p>
            </div>
          </div>
        </nav>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
