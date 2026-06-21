import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, Mic, FileAudio, Play, Pause, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  uploadMeeting,
  validateAudioFile,
  fetchRecentMeetings,
  ensureTestMeeting,
  TEST_MEETING_ID,
  type RecentMeeting,
} from '../api/meeting';
import {
  pathWithMeetingId,
  setStoredMeetingId,
  SMART_SUMMARY_PATH,
} from '../utils/meetingRoute';

const MeetingImport: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadMode, setUploadMode] = useState<'file' | 'record'>('file');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing'>('uploading');
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadIndex, setUploadIndex] = useState({ current: 0, total: 0 });
  const [recentFiles, setRecentFiles] = useState<RecentMeeting[]>([]);
  const [testMeetingReady, setTestMeetingReady] = useState(false);

  const loadRecentFiles = useCallback(async () => {
    try {
      const data = await fetchRecentMeetings();
      setRecentFiles(data);
    } catch {
      // 后端未启动时静默失败，保留空列表
    }
  }, []);

  useEffect(() => {
    loadRecentFiles();
  }, [loadRecentFiles]);

  useEffect(() => {
    const initTestMeeting = async () => {
      try {
        await ensureTestMeeting();
        setTestMeetingReady(true);
        if (searchParams.get('stay') !== '1') {
          setStoredMeetingId(TEST_MEETING_ID);
          navigate(pathWithMeetingId(SMART_SUMMARY_PATH, TEST_MEETING_ID));
        }
      } catch {
        // 后端未启动时保留导入页，不阻断正常上传
      }
    };
    initTestMeeting();
  }, [navigate, searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const collectAudioFiles = (fileList: FileList | File[]): File[] => {
    return Array.from(fileList).filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return ['.mp3', '.wav', '.m4a'].includes(ext) || file.type.startsWith('audio/');
    });
  };

  const handleUploadFiles = async (files: File[]) => {
    if (files.length === 0) {
      setErrorMessage('请选择 MP3、WAV 或 M4A 格式的音频文件');
      return;
    }

    const validFiles: File[] = [];
    const validationErrors: string[] = [];
    for (const file of files) {
      const validationError = validateAudioFile(file);
      if (validationError) {
        validationErrors.push(`${file.name}：${validationError}`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setErrorMessage(validationErrors.join('；'));
      return;
    }

    setErrorMessage(validationErrors.length > 0 ? validationErrors.join('；') : null);
    setSuccessMessage(null);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadPhase('uploading');
    setUploadIndex({ current: 1, total: validFiles.length });

    const results: { meeting_id: string; file_name: string }[] = [];
    const uploadErrors: string[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadIndex({ current: i + 1, total: validFiles.length });
      setSelectedFileName(file.name);
      setUploadPhase('uploading');

      try {
        const result = await uploadMeeting(file, (percent) => {
          const overall = Math.round(((i + percent / 100) / validFiles.length) * 100);
          setUploadProgress(overall);
          if (percent >= 100) {
            setUploadPhase('processing');
          }
        });
        results.push(result);
      } catch (err) {
        uploadErrors.push(
          `${file.name}：${err instanceof Error ? err.message : '上传失败'}`,
        );
      }
    }

    setUploadProgress(100);
    await loadRecentFiles();
    setIsUploading(false);
    setSelectedFileName(null);
    setUploadIndex({ current: 0, total: 0 });

    if (uploadErrors.length > 0) {
      setErrorMessage(uploadErrors.join('；'));
    }

    if (results.length === 0) {
      return;
    }

    const lastId = results[results.length - 1].meeting_id;
    setStoredMeetingId(lastId);

    if (results.length === 1) {
      setTimeout(() => {
        navigate(pathWithMeetingId(SMART_SUMMARY_PATH, lastId));
      }, 400);
      return;
    }

    setSuccessMessage(`已成功导入 ${results.length} 个会议，可在下方「最近上传」中查看`);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = collectAudioFiles(event.target.files ?? []);
    if (files.length > 0) {
      handleUploadFiles(files);
    }
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = collectAudioFiles(event.dataTransfer.files);
    if (files.length > 0) {
      handleUploadFiles(files);
    } else if (event.dataTransfer.files.length > 0) {
      setErrorMessage('请上传 MP3、WAV 或 M4A 格式的音频文件');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const openFilePicker = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const canOpenSummary = (status: string) =>
    ['completed', 'transcribed', 'summarizing', 'confirmed', 'failed'].includes(status);

  const handleRecentClick = (meeting: RecentMeeting) => {
    if (canOpenSummary(meeting.status)) {
      setStoredMeetingId(meeting.meeting_id);
      navigate(pathWithMeetingId(SMART_SUMMARY_PATH, meeting.meeting_id));
    }
  };

  const goToTestSummary = () => {
    setStoredMeetingId(TEST_MEETING_ID);
    navigate(pathWithMeetingId(SMART_SUMMARY_PATH, TEST_MEETING_ID));
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
      <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          会议导入
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          上传录音文件或实时录制会议内容，支持一次选择多个音频，AI 将自动为您生成结构化纪要
        </p>
        {testMeetingReady && searchParams.get('stay') === '1' && (
          <button
            onClick={goToTestSummary}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            进入智能纪要（测试会议 {TEST_MEETING_ID}）
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-8">
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

        {uploadMode === 'file' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
              className="hidden"
              onChange={handleFileInputChange}
            />

            <div
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(e) => e.key === 'Enter' && openFilePicker()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800/50 ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
              } ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
            >
              <FileAudio className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                拖拽音频文件到此处，或点击上传
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                支持 MP3、WAV、M4A 格式，单文件最大 500MB，可一次选择多个文件
              </p>
            </div>

            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMessage}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {successMessage}
                </motion.div>
              )}
            </AnimatePresence>

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
                        {uploadPhase === 'uploading' ? '正在上传...' : '正在分析...'}
                        {uploadIndex.total > 1 && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">
                            ({uploadIndex.current}/{uploadIndex.total})
                          </span>
                        )}
                        {selectedFileName && (
                          <span className="ml-2 text-gray-500 font-normal truncate max-w-[200px] inline-block align-bottom">
                            {selectedFileName}
                          </span>
                        )}
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

            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                最近上传
              </h3>
              {recentFiles.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无上传记录</p>
              ) : (
                <div className="space-y-2">
                  {recentFiles.map((file) => (
                    <div
                      key={file.meeting_id}
                      onClick={() => handleRecentClick(file)}
                      className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors ${
                        canOpenSummary(file.status)
                          ? 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileAudio className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {file.file_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {file.upload_time}
                          </p>
                        </div>
                      </div>
                      {canOpenSummary(file.status) ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

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
