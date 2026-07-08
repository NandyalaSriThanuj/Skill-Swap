const fs = require('fs');
const uiCode = fs.readFileSync('src/pages/AssessmentPage.UI.tsx', 'utf-8');

const newCode = `import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { qualificationService } from '../lib/qualificationService';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useInterviewController } from '../hooks/useInterviewController';
import type { QualificationSession } from '../types';
import { 
  CheckCircle, XCircle, ArrowLeft, Key, Loader2, Bot, User as UserIcon, HelpCircle,
  AlertCircle, Volume2, Mic, MessageSquare, RefreshCw, TrendingUp, ThumbsUp, BookOpen,
  ChevronDown, Globe, Wifi, Clock, Award
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

const TIPS = [
  "Find a quiet room before starting.",
  "Speak clearly and naturally at a normal pace.",
  "Take a deep breath and think before answering."
];

const AssessmentPageInner: React.FC<{ initialSession: QualificationSession }> = ({ initialSession }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('skillswap-groq-api-key') || '');
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'transcript' | 'details'>('overview');

  const isTech = ['react', 'python', 'sql', 'node', 'javascript', 'aws', 'typescript', 'programming'].some(t => initialSession.skill_name.toLowerCase().includes(t));
  const totalQuestions = isTech ? 20 : 15;

  const controller = useInterviewController({
    currentSession: initialSession as any,
    selectedLanguage,
    totalQ: totalQuestions
  });

  const {
    session, progress, isListening, isPlaying: isSpeaking, isProcessing: isSending, 
    hasMicPermission: micPermission, transcript: spokenSubtitle, toggleMic: handleOrbClick,
    submitAnswer, startInterview, userAnswersCount, endInterview
  } = controller;

  const errorMsg = null;
  const isGeneratingReport = isSending;

  const handleRetry = () => {
    navigate('/dashboard');
  };

  const getProgressInfo = () => {
    return { current: userAnswersCount, total: totalQuestions, percentage: progress };
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return \`\${m}:\${s.toString().padStart(2, '0')}\`;
  };

  const getRunningScoreEstimate = () => {
    const userMessages = session.chat_history.filter((m: any) => m.role === 'user') || [];
    const charCount = userMessages.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0);
    return Math.min(98, Math.max(50, 70 + Math.floor(charCount / 100)));
  };

  const currentDifficulty = "Adaptive";
  const voiceWarning = "";
  const isOnline = navigator.onLine;
  const isWaitingForSilence = false;

  const requestMicPermission = async () => {};

  const getCurrentQuestionText = () => {
    if (!session || !session.chat_history) return "";
    const aiMsgs = session.chat_history.filter((m: any) => m.role === 'assistant');
    return aiMsgs.length > 0 ? aiMsgs[aiMsgs.length - 1].content : "";
  };

${uiCode}
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
`;
fs.writeFileSync('src/pages/AssessmentPage.tsx', newCode);
