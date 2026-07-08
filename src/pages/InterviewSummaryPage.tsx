import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { qualificationService } from '../lib/qualificationService';
import { useAuth } from '../context/AuthContext';
import type { QualificationSession } from '../types';
import { certificateService } from '../lib/certificateService';
import { voiceService } from '../lib/VoiceService';
import { 
  ArrowLeft, Bot, User as UserIcon, MessageSquare, TrendingUp, ThumbsUp, BookOpen,
  ChevronDown, Award, AlertCircle, Calendar, Clock, BarChart2, Star,
  Play, Square, Volume2
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

const formatDuration = (secs: number) => {
  if (!secs) return "N/A";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function InterviewSummaryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  
  const [session, setSession] = useState<QualificationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'strengths' | 'weaknesses' | 'improvement'>('strengths');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const duration = location.state?.duration || 0;

  useEffect(() => {
    async function loadSession() {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }
      try {
        const data = await qualificationService.getSession(sessionId);
        if (data) {
          setSession(data);
        } else {
          setError('Session not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load session details');
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [sessionId]);

  // Clean up speech synthesis on page unmount
  useEffect(() => {
    return () => {
      voiceService.stop();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-xl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{error || 'Session not found'}</h3>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const badgeName = session.badge || (session.status === 'passed' ? 'Verified Mentor' : 'Not Eligible');
  const badgeStyle = getBadgeStyle(badgeName);
  const dateStr = session.updated_at ? new Date(session.updated_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : new Date().toLocaleDateString();

  const techScore = session.technical_score ?? session.score ?? 0;
  const commScore = session.communication_score ?? session.score ?? 0;
  const teachScore = session.teaching_score ?? session.score ?? 0;
  const confidenceScore = session.report?.detailed_scores?.confidence ?? session.score ?? 0;
  const overallScore = session.score || 0;

  const chatHistory = session.chat_history || [];
  // Calculate question-wise mock data if not directly available (group by assistant -> user pair)
  const qaPairs = [];
  let currentQ = null;
  for (const msg of chatHistory) {
    if (msg.role === 'assistant') {
      currentQ = msg;
    } else if (msg.role === 'user' && currentQ) {
      qaPairs.push({ q: currentQ.content, a: msg.content });
      currentQ = null;
    }
  }

  const detectLanguage = (): 'English' | 'Hindi' | 'Telugu' => {
    if (!session || !session.chat_history) return 'English';
    const text = session.chat_history.map(m => m.content).join(' ');
    if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
    if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
    return 'English';
  };

  const handleAudioPlayback = () => {
    if (isPlayingAudio) {
      voiceService.stop();
      setIsPlayingAudio(false);
    } else {
      const summaryText = session.report?.summary || session.recommendation || session.feedback || "Evaluation complete.";
      const cleanSummary = summaryText.replace(/\*\*+/g, ''); // Strip markdown bold markers for speaking
      
      setIsPlayingAudio(true);
      voiceService.speak({
        text: cleanSummary,
        language: detectLanguage(),
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false)
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
      
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 dark:border-slate-800 pb-6">
        <div className="space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center space-x-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-2 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-4xl font-heading font-black text-gray-900 dark:text-white tracking-tight">
            Interview Summary
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-primary-500" /> {session.skill_name}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {dateStr}</span>
            {duration > 0 && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {formatDuration(duration)}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {session.status === 'passed' && profile && (
            <button
              onClick={() => certificateService.generateCertificatePDF(profile, session)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl cursor-pointer transition-all flex items-center space-x-2 shadow-sm"
            >
              <Award className="w-4 h-4" />
              <span>View Certificate</span>
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 bg-gray-950 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center space-x-2"
          >
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Premium Badge Showcase Row */}
      <div className={`p-1 rounded-[2.5rem] bg-gradient-to-tr ${badgeStyle.gradient} shadow-2xl ${badgeStyle.glow} relative group transition-all duration-500 hover:scale-[1.01]`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-[2.5rem] pointer-events-none"></div>
        <div className="bg-white dark:bg-slate-900 rounded-[2.4rem] p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
          <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr ${badgeStyle.gradient} p-0.5 shadow-lg relative shrink-0`}>
            <div className="w-full h-full rounded-full bg-white dark:bg-slate-955 flex items-center justify-center text-4xl sm:text-5xl shadow-inner">
              {badgeStyle.icon}
            </div>
          </div>

          <div className="text-center md:text-left space-y-2 flex-grow">
            <span className={`text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${badgeStyle.bg} ${badgeStyle.text} border ${badgeStyle.border}`}>
              Mentor Eligibility
            </span>
            <h2 className="text-2xl sm:text-4xl font-heading font-black text-gray-900 dark:text-white tracking-tight mt-1.5">
              {badgeName}
            </h2>
            <p className="text-base text-gray-650 dark:text-slate-350 max-w-2xl leading-relaxed">
              {badgeStyle.description}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Summary Audio & Executive Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Playback Controls Card */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400">
              <Volume2 className="w-5 h-5" />
              <span className="text-xs font-extrabold uppercase tracking-wider">AI Voice Assessor</span>
            </div>
            
            <h4 className="text-lg font-black text-gray-900 dark:text-white leading-snug">
              Listen to your Mentor Evaluation Summary
            </h4>
            
            <p className="text-xs text-gray-505 dark:text-slate-400 leading-relaxed">
              Click play to hear your personal assessor speak the final summary, strengths, and recommendations aloud.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={handleAudioPlayback}
              className={`p-4 rounded-2xl flex items-center justify-center transition-all shadow-md cursor-pointer ${
                isPlayingAudio 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25' 
                  : 'bg-primary-505 hover:bg-primary-600 text-white shadow-primary-500/25'
              }`}
            >
              {isPlayingAudio ? <Square className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
            </button>

            <div className="flex-grow flex items-center gap-1 h-8">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isPlayingAudio 
                      ? 'bg-primary-500 dark:bg-primary-400 animate-bounce' 
                      : 'bg-gray-200 dark:bg-slate-800 h-1.5'
                  }`}
                  style={{
                    height: isPlayingAudio ? `${Math.floor(Math.random() * 24) + 6}px` : '6px',
                    animationDelay: `${i * 60}ms`,
                    animationDuration: '0.5s'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* AI Feedback Written text Card */}
        <div className="md:col-span-2 bg-gradient-to-r from-primary-500/5 to-purple-500/5 border border-primary-500/10 dark:border-primary-500/20 rounded-3xl p-6 md:p-8 flex flex-col justify-center space-y-4 shadow-sm">
          <h3 className="font-heading font-extrabold text-sm text-primary-700 dark:text-primary-400 uppercase tracking-wider flex items-center gap-2">
            <Bot className="w-5 h-5" /> AI Executive Summary
          </h3>
          <p className="text-base md:text-lg text-gray-800 dark:text-slate-250 leading-relaxed font-medium italic">
            "{session.report?.summary || session.recommendation || session.feedback || 'Evaluation completed successfully.'}"
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Circle Gauge (Overall Score) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
          <h3 className="font-heading font-extrabold text-sm text-gray-800 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary-500" /> Overall Score
          </h3>
          
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" className="stroke-gray-100 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
              <circle
                cx="50" cy="50" r="40"
                stroke={badgeStyle.hsl}
                style={{ strokeDasharray: '251.2', strokeDashoffset: 251.2 - (251.2 * overallScore) / 100 }}
                strokeWidth="8" strokeLinecap="round" fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                {overallScore}%
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-slate-400 max-w-[240px]">
            Comprehensive score reflecting all dimensions of your evaluation.
          </div>
        </div>

        {/* Sub-Category Scores Progress Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-8 flex flex-col justify-center space-y-8 shadow-sm">
          <h3 className="font-heading font-extrabold text-sm text-gray-800 dark:text-slate-300 uppercase tracking-wider">
            Detailed Performance Metrics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> Technical Knowledge
                </span>
                <span className="text-gray-900 dark:text-white">{techScore}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${techScore}%` }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-500" /> Communication
                </span>
                <span className="text-gray-900 dark:text-white">{commScore}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: `${commScore}%` }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-rose-500" /> Confidence
                </span>
                <span className="text-gray-900 dark:text-white">{confidenceScore}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${confidenceScore}%` }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" /> Teaching Ability
                </span>
                <span className="text-gray-900 dark:text-white">{teachScore}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${teachScore}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Tabs (Strengths / Weaknesses / Areas for Improvement) */}
      {session.report && (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="flex border-b border-gray-150 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <button
              onClick={() => setActiveReportTab('strengths')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                activeReportTab === 'strengths'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-450 bg-white dark:bg-slate-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              Strengths
            </button>
            <button
              onClick={() => setActiveReportTab('weaknesses')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                activeReportTab === 'weaknesses'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-450 bg-white dark:bg-slate-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              Weaknesses
            </button>
            <button
              onClick={() => setActiveReportTab('improvement')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                activeReportTab === 'improvement'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-450 bg-white dark:bg-slate-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              Action Plan
            </button>
          </div>

          <div className="p-6 md:p-10 min-h-[160px] leading-relaxed">
            {activeReportTab === 'strengths' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-455">
                  <ThumbsUp className="w-5 h-5" />
                  <span className="font-bold text-base">Key Strengths Identified</span>
                </div>
                <p className="text-base text-gray-700 dark:text-slate-350">
                  {session.report.strengths || "The candidate displayed adequate competency during responses."}
                </p>
              </div>
            )}

            {activeReportTab === 'weaknesses' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-455">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold text-base">Identified Skill Gaps</span>
                </div>
                <p className="text-base text-gray-700 dark:text-slate-355">
                  {session.report.weaknesses || "No critical weaknesses identified. Keep refining edge cases."}
                </p>
              </div>
            )}

            {activeReportTab === 'improvement' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-455">
                  <BookOpen className="w-5 h-5" />
                  <span className="font-bold text-base">Improvement Suggestions</span>
                </div>
                <p className="text-base text-gray-700 dark:text-slate-350">
                  {session.report.suggestions || session.report.areas_for_improvement || "Continue practicing advanced coding architectures and mentoring techniques."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question-wise Performance (Transcript) */}
      {qaPairs.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <details className="group" open>
            <summary className="px-6 md:px-8 py-6 font-heading font-extrabold text-base text-gray-900 dark:text-white hover:bg-gray-55 dark:hover:bg-slate-800/50 cursor-pointer list-none flex justify-between items-center transition-colors">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-primary-500" />
                <span>Question-wise Performance & Transcript</span>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform duration-200" />
            </summary>
            
            <div className="px-6 md:px-8 pb-8 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-6">
              {qaPairs.map((pair, idx) => (
                <div key={idx} className="space-y-4 bg-gray-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 p-2 rounded-lg shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="text-sm md:text-base text-gray-900 dark:text-white font-medium pt-1">
                      {pair.q.split('**').map((part: string, pIdx: number) => 
                        pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold">{part}</strong> : part
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pl-2 md:pl-10">
                    <div className="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 p-2 rounded-lg shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="text-sm md:text-base text-gray-700 dark:text-slate-350 pt-1">
                      {pair.a}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Footer Nav */}
      <div className="flex justify-center pt-4 pb-12">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-sm md:text-base rounded-2xl shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transition-all cursor-pointer flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Return to Dashboard</span>
        </button>
      </div>

    </div>
  );
}
