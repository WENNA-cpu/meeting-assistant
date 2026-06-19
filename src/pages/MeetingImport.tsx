import React, { useState } from 'react';
import { Upload, Mic, FileAudio, Play, Pause, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MeetingImport: React.FC = () => {
  const [uploadMode, setUploadMode] = useState<'file' | 'record'>('file');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // 模拟录音计时
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 模拟上传进度
  const handleFileUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setRecordingTime(0);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          会议导入
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          上传录音文件或实时录制会议内容，AI将自动为您生成结构化纪要
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Mode Switcher */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setUploadMode('file')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              uploadMode === 'file'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Upload className="inline-block w-4 h-4 mr-2" />
            文件上传
          </button>
          <button
            onClick={() => setUploadMode('record')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              uploadMode === 'record'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Mic className="inline-block w-4 h-4 mr-2" />
            实时录音
          </button>
        </div>

        {/* File Upload Area */}
        {uploadMode === 'file' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-800/50"
              onClick={handleFileUpload}
            >
              <FileAudio className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                拖拽音频文件到此处，或点击上传
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                支持 MP3、WAV、M4A 格式，最大 500MB
              </p>
            </div>

            {/* Upload Progress */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6"
                >
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        正在转写...
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recent Files */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                最近上传
              </h3>
              <div className="space-y-2">
                {[
                  { name: '产品评审会议.mp3', date: '2024-01-15 14:30', status: 'completed' },
                  { name: '周会记录.wav', date: '2024-01-14 10:00', status: 'completed' },
                  { name: '客户沟通.m4a', date: '2024-01-13 16:45', status: 'processing' },
                ].map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <FileAudio className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{file.date}</p>
                      </div>
                    </div>
                    {file.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Recording Area */}
        {uploadMode === 'record' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-12 text-center">
              <div className="relative inline-block mb-6">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center ${
                    isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                  }`}
                >
                  <Mic className="w-12 h-12 text-white" />
                </div>
                {isRecording && (
                  <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-20" />
                )}
              </div>

              <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white mb-2">
                {formatTime(recordingTime)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                {isRecording ? '正在录音...' : '点击下方按钮开始录音'}
              </p>

              <button
                onClick={toggleRecording}
                className={`px-8 py-3 rounded-lg font-medium transition-all ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isRecording ? (
                  <>
                    <Pause className="inline-block w-5 h-5 mr-2" />
                    停止录音
                  </>
                ) : (
                  <>
                    <Play className="inline-block w-5 h-5 mr-2" />
                    开始录音
                  </>
                )}
              </button>
            </div>

            {/* Recording Tips */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { icon: '🎤', title: '保持安静', desc: '确保环境噪音较小' },
                { icon: '📱', title: '靠近设备', desc: '建议距离麦克风1米内' },
                { icon: '⏱️', title: '时长限制', desc: '单次最长2小时' },
              ].map((tip, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center"
                >
                  <div className="text-2xl mb-2">{tip.icon}</div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {tip.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tip.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default MeetingImport;
