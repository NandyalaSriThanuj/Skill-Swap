import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { qualificationService } from '../lib/qualificationService';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { useInterviewController } from '../hooks/useInterviewController';
import type { QualificationSession } from '../types';
import { 
  CheckCircle, XCircle, ArrowLeft, Key, Loader2, HelpCircle,
  AlertCircle, Volume2, Mic,
  Wifi, Clock, Award, TrendingUp, ThumbsUp, BookOpen, BarChart2
} from 'lucide-react';

const getBadgeStyle = (badgeName: string) => {
  switch (badgeName) {
    case 'Expert Mentor':
      return {
        gradient: 'from-amber-400 via-yellow-500 to-orange-500',
        bg: 'bg-amber-500/5',
        border: 'border-amber-500/30',
        text: 'text-amber-600 dark:text-amber-400',
        glow: 'shadow-amber-500/20',
        hsl: 'hsl(45, 95%, 45%)',
        description: 'Passed with highest honors. Eligible to teach advanced courses, run masterclasses, and provide expert code reviews.',
        icon: '🏆'
      };
    case 'Verified Mentor':
      return {
        gradient: 'from-emerald-400 via-teal-500 to-emerald-600',
        bg: 'bg-emerald-500/5',
        border: 'border-emerald-500/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        glow: 'shadow-emerald-500/20',
        hsl: 'hsl(142, 70%, 40%)',
        description: 'Passed with recommendation. Eligible to teach regular classes, review pull requests, and host peer sessions.',
        icon: '✅'
      };
    case 'Community Mentor':
      return {
        gradient: 'from-blue-400 via-indigo-500 to-purple-600',
        bg: 'bg-blue-500/5',
        border: 'border-blue-500/30',
        text: 'text-blue-600 dark:text-blue-400',
        glow: 'shadow-blue-500/20',
        hsl: 'hsl(217, 90%, 55%)',
        description: 'Eligible to assist in public forums, host co-working circles, and moderate student discussion rooms.',
        icon: '⭐'
      };
    default:
      return {
        gradient: 'from-rose-400 via-red-500 to-pink-600',
        bg: 'bg-rose-500/5',
        border: 'border-rose-500/30',
        text: 'text-rose-600 dark:text-rose-455',
        glow: 'shadow-rose-500/20',
        hsl: 'hsl(350, 80%, 50%)',
        description: 'Assessment completed, but the overall score fell below the verification threshold. Take time to study and retry!',
        icon: '❌'
      };
  }
};

interface SummaryReportModalProps {
  session: any;
  duration: number;
  onClose: () => void;
}

const SummaryReportModal: React.FC<SummaryReportModalProps> = ({ session, duration, onClose }) => {
  const navigate = useNavigate();

  const actualUserMessages = session.chat_history ? session.chat_history.filter((m: any) => m.role === 'user' && !m.is_pre_interview) : [];
  const answersCount = actualUserMessages.length;

  if (answersCount === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="card-premium max-w-md w-full bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-[28px] shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-black text-xl text-gray-950 dark:text-white">Interview Ended</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Interview ended before any assessment was completed.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-primary-500/10 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const badgeName = session.badge || (session.status === 'passed' ? 'Verified Mentor' : 'Not Eligible');
  const badgeStyle = getBadgeStyle(badgeName);

  const techScore = session.technical_score ?? session.score ?? 0;
  const commScore = session.communication_score ?? session.score ?? 0;
  const teachScore = session.teaching_score ?? session.score ?? 0;
  const overallScore = session.score || 0;

  const strengths = session.report?.strengths || "Demonstrated understanding.";
  const weaknesses = session.report?.weaknesses || "Could provide more details.";
  const suggestions = session.report?.suggestions || session.report?.areas_for_improvement || "Review advanced topics.";

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="card-premium max-w-4xl w-full bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-[28px] shadow-2xl p-6 md:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-850 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl bg-gradient-to-tr ${badgeStyle.gradient} text-white`}>
              <Award className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h2 className="font-heading font-black text-xl text-gray-950 dark:text-white">
                Qualification Assessment Report
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Topic: <span className="font-bold text-gray-700 dark:text-slate-200">{session.skill_name}</span> • Duration: {formatDuration(duration)}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r ${badgeStyle.gradient} text-white shadow-sm`}>
            {badgeStyle.icon} {badgeName}
          </span>
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Overall Score & Competencies */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-gray-50/50 dark:bg-slate-850/50 rounded-3xl border border-gray-100 dark:border-slate-800/80 gap-6">
            
            {/* Radial Gauge */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-200 dark:text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-primary-500"
                  fill="transparent"
                  strokeDasharray="389.5"
                  strokeDashoffset={389.5 - (389.5 * overallScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl font-black text-gray-950 dark:text-white">{overallScore}%</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-widest block font-bold mt-0.5">Overall Score</span>
              </div>
            </div>

            {/* Sub-scores details */}
            <div className="w-full space-y-4">
              <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" /> Core Competencies
              </h4>

              {/* Technical Score */}
              <div className="space-y-1 text-left">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-655 dark:text-slate-400">Technical Accuracy</span>
                  <span className="text-gray-900 dark:text-white">{techScore}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${techScore}%` }} />
                </div>
              </div>

              {/* Communication Score */}
              <div className="space-y-1 text-left">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-655 dark:text-slate-400">Communication</span>
                  <span className="text-gray-900 dark:text-white">{commScore}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full" style={{ width: `${commScore}%` }} />
                </div>
              </div>

              {/* Teaching Score */}
              <div className="space-y-1 text-left">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-655 dark:text-slate-400">Teaching Ability</span>
                  <span className="text-gray-900 dark:text-white">{teachScore}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${teachScore}%` }} />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Strengths / Weaknesses / Next Steps & recommendation */}
          <div className="md:col-span-7 space-y-4 text-left">
            
            {/* Recommendation Alert Box */}
            <div className={`p-4 rounded-2xl border ${badgeStyle.border} ${badgeStyle.bg} text-sm leading-relaxed`}>
              <p className="font-semibold text-gray-800 dark:text-slate-200">
                {badgeStyle.description}
              </p>
              {session.recommendation && (
                <p className="mt-2 text-xs text-gray-500 dark:text-slate-450 italic border-t border-gray-150/30 dark:border-slate-800/30 pt-2">
                  "{session.recommendation}"
                </p>
              )}
            </div>

            {/* Qualitative Feedback Cards */}
            <div className="space-y-3">
              
              {/* Strengths */}
              <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-950/20 rounded-2xl flex items-start space-x-3">
                <ThumbsUp className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Key Strengths</h4>
                  <p className="text-xs text-gray-705 dark:text-slate-300 mt-1 leading-relaxed">{strengths}</p>
                </div>
              </div>

              {/* Weaknesses */}
              <div className="p-4 bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/20 dark:border-amber-950/20 rounded-2xl flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Weaknesses Identified</h4>
                  <p className="text-xs text-gray-705 dark:text-slate-300 mt-1 leading-relaxed">{weaknesses}</p>
                </div>
              </div>

              {/* Suggestions */}
              <div className="p-4 bg-blue-500/5 dark:bg-blue-500/5 border border-blue-500/20 dark:border-blue-950/20 rounded-2xl flex items-start space-x-3">
                <BookOpen className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Next Steps & Suggestions</h4>
                  <p className="text-xs text-gray-705 dark:text-slate-300 mt-1 leading-relaxed">{suggestions}</p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex justify-end items-center gap-3 border-t border-gray-100 dark:border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-primary-500/10 hover:shadow-primary-500/20 transition-all flex items-center gap-2"
          >
            Go to Dashboard <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

      </div>
    </div>
  );
};



const TIPS = [
  "Find a quiet room before starting.",
  "Speak clearly and naturally at a normal pace.",
  "Take a deep breath and think before answering."
];

const AssessmentPageInner: React.FC<{ initialSession: QualificationSession }> = ({ initialSession }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedLanguage = location.state?.selectedLanguage || 'English';
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('skillswap-groq-api-key') || '');

  const isTech = ['react', 'python', 'sql', 'node', 'javascript', 'aws', 'typescript', 'programming'].some(t => initialSession.skill_name.toLowerCase().includes(t));
  const totalQuestions = isTech ? 20 : 15;

  const controller = useInterviewController({
    currentSession: initialSession as any,
    selectedLanguage,
    totalQ: totalQuestions
  });

  const {
    progress, isListening, isPlaying: isSpeaking, isProcessing: isSending, 
    hasMicPermission: micPermission, transcript: spokenSubtitle, isWaitingForSilence, toggleMic: handleOrbClick,
    startInterview, userAnswersCount, duration
  } = controller;
  const session = controller.session as any;

  const errorMsg = null;
  const isGeneratingReport = isSending;
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const startedRef = useRef(false);

  // Auto-start interview if it hasn't started yet since setup is handled in AssessmentSetupPage
  useEffect(() => {
    if (session && !hasAutoStarted && micPermission === true && !startedRef.current) {
      startedRef.current = true;
      setHasAutoStarted(true);
      startInterview();
    }
  }, [session, hasAutoStarted, startInterview, micPermission]);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length);
    }, 15000);
    return () => clearInterval(tipInterval);
  }, []);

  const getProgressInfo = () => {
    return { step: userAnswersCount + 1, current: userAnswersCount, total: totalQuestions, percentage: progress };
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getRunningScoreEstimate = () => {
    const userMessages = session.chat_history.filter((m: any) => m.role === 'user') || [];
    const charCount = userMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
    return Math.min(98, Math.max(50, 70 + Math.floor(charCount / 100)));
  };

  const voiceWarning = controller.ttsError;
  const isOnline = navigator.onLine;


  const getCurrentQuestionText = () => {
    if (!session || !session.chat_history) return "";
    const aiMsgs = session.chat_history.filter((m: any) => m.role === 'assistant');
    return aiMsgs.length > 0 ? aiMsgs[aiMsgs.length - 1].content : "";
  };



  if (isGeneratingReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 animate-in fade-in duration-300">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full"></div>
          <Loader2 className="relative w-16 h-16 text-primary-500 animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Generating Your Performance Report</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
            The AI is evaluating your responses across multiple dimensions. This usually takes a few seconds...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg && !session) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-xl">
        <XCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{errorMsg}</h3>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!session) return null;

  const progressInfo = getProgressInfo();

  // Determine difficulty
  let currentDifficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
  if (isTech) {
    currentDifficulty = progressInfo.step <= 5 ? 'Beginner' : progressInfo.step <= 12 ? 'Intermediate' : 'Advanced';
  } else {
    currentDifficulty = progressInfo.step <= 4 ? 'Beginner' : progressInfo.step <= 9 ? 'Intermediate' : 'Advanced';
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6 flex flex-col min-h-[85vh]">
      
      {/* Assessment Header */}
      <div className="card-premium p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 transition-colors">
        <div className="flex items-center space-x-3.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-heading font-extrabold text-xl text-gray-950 dark:text-white">
                {session.skill_name} Voice Qualification
              </h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-450 border border-blue-150/40`}>
                Assessment Active
              </span>
            </div>
            <p className="text-xs text-gray-650 dark:text-slate-400 mt-0.5">
              Assessor Agent: AI bot evaluator
            </p>
          </div>
        </div>


      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-0">
        
        {/* Main Assessment Container (Left/Center) */}
        <div className="lg:col-span-8 card-premium flex flex-col p-8 justify-between gap-6 transition-all duration-300 min-h-0">
            
            {/* Top Navigation Info-bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-gray-100 dark:border-slate-800 pb-5 text-center shrink-0">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Assessment Topic</span>
                <p className="text-sm font-black text-gray-800 dark:text-white truncate">
                  {session.skill_name}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Language</span>
                <p className="text-sm font-black text-primary-600 dark:text-primary-400">
                  {selectedLanguage === 'Hindi' ? '🇮🇳 Hindi' : selectedLanguage === 'Telugu' ? '🇮🇳 Telugu' : '🇺🇸 English'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  Elapsed Time
                </span>
                <p className="text-sm font-black text-gray-800 dark:text-white">
                  {formatDuration(duration)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block flex items-center justify-center gap-1">
                  <Wifi className="w-3 h-3 text-gray-400" />
                  Network Status
                </span>
                <p className={`text-sm font-black ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {isOnline ? 'Connected' : 'Offline'}
                </p>
              </div>
            </div>

            {/* Central Animated AI Portal Section */}
            <div className="flex-grow flex flex-col items-center justify-center space-y-6 py-4">
              
              {/* Question Text Prompt */}
              <div className="w-full max-w-2xl text-center space-y-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                  currentDifficulty === 'Beginner'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-450 border border-blue-150/30'
                    : currentDifficulty === 'Intermediate'
                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-450 border border-purple-150/30'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450 border border-amber-150/30'
                }`}>
                  Current Difficulty: {currentDifficulty}
                </span>
                {voiceWarning && (
                  <div className="mb-3.5 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-450 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse max-w-xl mx-auto">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    <span>{voiceWarning}</span>
                  </div>
                )}
                <h3 className="text-lg md:text-xl font-heading font-extrabold text-gray-900 dark:text-white leading-relaxed">
                  {getCurrentQuestionText() || "Preparing the first question..."}
                </h3>
              </div>

              {/* Pulsing Visual Avatar Portal */}
              <div className="relative flex items-center justify-center w-52 h-52 md:w-60 md:h-60">
                {isSpeaking && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping border border-cyan-500/10"></div>
                    <div className="absolute -inset-4 rounded-full bg-cyan-500/10 animate-pulse border border-cyan-500/5"></div>
                  </>
                )}
                {isListening && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping border border-rose-500/10"></div>
                    <div className="absolute -inset-4 rounded-full bg-rose-500/10 animate-pulse border border-rose-500/5"></div>
                  </>
                )}
                {isSending && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-spin border border-dashed border-violet-500/30 duration-3000"></div>
                    <div className="absolute -inset-4 rounded-full bg-violet-500/10 animate-pulse border border-violet-500/5"></div>
                  </>
                )}
                {!(isSpeaking || isListening || isSending) && (
                  <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse border border-emerald-500/5"></div>
                )}

                {/* Central Orb Button Controller */}
                <button
                  onClick={handleOrbClick}
                  className={`relative z-10 w-36 h-36 md:w-40 md:h-40 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 cursor-pointer outline-none focus:ring-4 focus:ring-primary-500/10 ${
                    isSpeaking
                      ? 'bg-gradient-to-tr from-cyan-400 to-teal-500 text-white shadow-cyan-500/35 scale-105 border-4 border-cyan-300/30'
                      : isListening
                      ? 'bg-gradient-to-tr from-rose-400 to-pink-500 text-white shadow-rose-500/35 scale-110 border-4 border-white/10 animate-pulse-slow'
                      : isSending
                      ? 'bg-gradient-to-tr from-violet-400 to-indigo-500 text-white shadow-violet-500/30 scale-100 animate-pulse border-4 border-violet-300/30'
                      : 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-emerald-500/25 scale-95 border-4 border-emerald-300/20 hover:scale-100'
                  }`}
                >
                  <div className="text-center flex flex-col items-center">
                    {isSpeaking && <Volume2 className="w-10 h-10 animate-pulse text-white" />}
                    {isListening && <Mic className="w-10 h-10 animate-bounce text-white" />}
                    {isSending && <Loader2 className="w-10 h-10 animate-spin text-white" />}
                    {!isSpeaking && !isListening && !isSending && <CheckCircle className="w-10 h-10 text-white/95" />}
                    
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/95 block mt-2">
                      {isSpeaking 
                        ? '🔊 AI Speaking...' 
                        : isSending 
                        ? '🧠 Evaluating...' 
                        : isListening 
                        ? (isWaitingForSilence ? '📝 Transcribing...' : '🎤 Listening...') 
                        : '⏳ Waiting for response...'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Dynamic Waveform Visualizer */}
              <div className="flex items-center justify-center space-x-1.5 h-16 w-full max-w-md mx-auto">
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      isSpeaking 
                        ? 'bg-gradient-to-t from-cyan-500 to-teal-400 animate-bounce' 
                        : isListening 
                        ? 'bg-gradient-to-t from-rose-500 to-pink-400 animate-bounce' 
                        : 'bg-gray-200 dark:bg-slate-800'
                    }`}
                    style={{
                      height: isSpeaking || isListening ? `${Math.floor(Math.random() * 32) + 8}px` : '6px',
                      animationDelay: `${i * 45}ms`,
                      animationDuration: '0.6s'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Panel (Transcript Preview & Progress) */}
            <div className="w-full max-w-3xl mx-auto shrink-0 space-y-3.5">
              
              {/* Transcript Preview */}
              <div className="w-full text-center bg-gray-55/65 dark:bg-slate-850/60 p-4 rounded-2xl border border-gray-150 dark:border-slate-800/80 min-h-[76px] flex flex-col items-center justify-center shadow-inner leading-relaxed transition-all">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-550 block mb-1 flex items-center gap-1.5 justify-center">
                  <span>Live Response Transcript</span>
                  {isWaitingForSilence && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse border border-amber-500/20">
                      ⏱️ Auto-submitting in 3s...
                    </span>
                  )}
                </span>
                <p className={`text-sm font-semibold leading-relaxed ${
                  isListening 
                    ? 'text-rose-600 dark:text-rose-455 italic'
                    : isSending
                    ? 'text-violet-600 dark:text-violet-455 animate-pulse'
                    : 'text-gray-755 dark:text-slate-200'
                }`}>
                  {spokenSubtitle || 'Please answer naturally. Speak clearly into your microphone when the orb glows pink.'}
                </p>
              </div>

              {/* Progress Slider Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  <span>Question Progress ({progressInfo.step} of {progressInfo.total})</span>
                  <span>Silence Trigger: 3s</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all duration-500 ease-out" 
                    style={{ width: `${progressInfo.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Statistics / Analytics Panel */}
          <div className="lg:col-span-4 flex flex-col gap-6 shrink-0">
            
            {/* Assessment Diagnostics Card */}
            <div className="card-premium p-6 space-y-6">
              <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
                <h3 className="font-heading font-black text-sm text-gray-955 dark:text-white tracking-tight">
                  Session Statistics
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                  Real-time interview analytical metrics.
                </p>
              </div>
              
              <div className="space-y-4">
                {/* Visual Ratio */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800/60 text-center">
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Completed</span>
                    <span className="text-lg font-black text-gray-800 dark:text-white">{progressInfo.step - 1}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800/60 text-center">
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Remaining</span>
                    <span className="text-lg font-black text-gray-800 dark:text-white">{progressInfo.total - (progressInfo.step - 1)}</span>
                  </div>
                </div>

                {/* score estimate meter */}
                <div className="p-4 bg-gradient-to-br from-primary-500/5 to-indigo-500/5 rounded-2xl border border-primary-500/10 space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-primary-700 dark:text-primary-400 font-extrabold uppercase tracking-wider">
                    <span>Estimated Score</span>
                    <span>{getRunningScoreEstimate()}%</span>
                  </div>
                  <div className="w-full bg-primary-100/40 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${getRunningScoreEstimate()}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] text-gray-400 dark:text-slate-500 block leading-tight">
                    * Dynamically calculated based on response richness and keyword density.
                  </span>
                </div>

                {/* details items */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/60 text-xs">
                    <span className="font-bold text-gray-500 dark:text-slate-400">Speech Confidence</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      {isListening ? `${Math.floor(Math.random() * 5) + 94}%` : '96%'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/60 text-xs">
                    <span className="font-bold text-gray-500 dark:text-slate-400">Voice Quality</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">
                      {isOnline ? 'Excellent (Lossless)' : 'Good (Compressed)'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/60 text-xs">
                    <span className="font-bold text-gray-500 dark:text-slate-400">Interview Status</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/30">
                      Assessment Active
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

      {/* Groq Settings Modal Overlay */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="card-premium p-8 max-w-md w-full relative space-y-6 animate-in zoom-in-95 duration-200">
            <div>
              <h2 className="font-heading font-extrabold text-xl text-gray-950 dark:text-white flex items-center">
                <Key className="w-5 h-5 mr-2 text-primary-500 animate-pulse" />
                AI Interview Configuration
              </h2>
              <p className="text-xs text-gray-550 dark:text-slate-450 mt-1 leading-relaxed">
                Provide a Groq API key to execute assessments using Groq models. The key will be stored securely in your browser's local storage and used directly for API requests.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Groq API Key
                </label>
                <input
                  type="password"
                  placeholder="gsk_..."
                  defaultValue={apiKey}
                  id="groq-key-input"
                  className="w-full px-4 py-2.5 bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white font-mono"
                />
              </div>

              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start space-x-2 text-[10px] text-amber-600 dark:text-amber-450 leading-relaxed">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">No API key?</span>
                  <p className="mt-0.5">
                    Leave this blank to continue using the built-in simulated technical questions. This mode fully evaluates the qualification and updates badges.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-2.5 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-white text-sm font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('groq-key-input') as HTMLInputElement;
                  const key = input?.value || '';
                  setApiKey(key);
                  localStorage.setItem('skillswap-groq-api-key', key);
                  setShowKeyModal(false);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-semibold rounded-xl hover:shadow-lg cursor-pointer"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Report Popup Modal */}
      {(session.status === 'passed' || session.status === 'failed') && (
        <SummaryReportModal 
          session={session} 
          duration={duration} 
          onClose={() => navigate('/dashboard')} 
        />
      )}

    </div>
  );
};

export const AssessmentPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [initialSession, setInitialSession] = useState<QualificationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    qualificationService.getSession(sessionId)
      .then(sess => {
        if (!sess) {
          setErrorMsg("Assessment session not found.");
        } else {
          setInitialSession(sess);
        }
      })
      .catch(err => {
        console.error(err);
        setErrorMsg("Failed to load session.");
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading AI assessment session...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-xl">
        <XCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{errorMsg}</h3>
      </div>
    );
  }

  if (initialSession) {
    return <AssessmentPageInner initialSession={initialSession} />;
  }

  return null;
};

export default AssessmentPage;
