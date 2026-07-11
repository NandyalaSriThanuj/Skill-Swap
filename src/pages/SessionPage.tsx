import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { sessionService } from '../lib/sessionService';
import { notificationService } from '../lib/notificationService';
import type { Profile } from '../types';
import {
  Video,
  MessageSquare,
  FileText,
  Clock,
  LogOut,
  ShieldAlert,
  Send,
  Loader2,
  Users,
  Copy,
  Check,
  BookOpen,
  Play,
  CheckCircle,
  Star,
  ExternalLink,
  Code,
  Image,
  Paperclip,
  Award,
  AlertCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

export const SessionPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { profile, isMock } = useAuth();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any | null>(null);
  const [learnerProfile, setLearnerProfile] = useState<Profile | null>(null);
  const [mentorProfile, setMentorProfile] = useState<Profile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Workspace layout tabs: 'chat' | 'notes'
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');

  // Chat/Notes states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  // Active status/timer states
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);

  // Attachment overlay states
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  
  // Rating/Feedback modal state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  if (!profile) return null;

  // 1. Fetch Session Info & Validate Access
  const fetchSessionDetails = async () => {
    if (!roomId || !profile) return;
    try {
      const data = await sessionService.fetchSessionByRoomId(roomId);
      if (data) {
        setSession(data);
        const hasAccess = data.learner_id === profile.id || data.mentor_id === profile.id;
        setIsAuthorized(hasAccess);
        
        if (hasAccess) {
          setLearnerProfile(data.learner);
          setMentorProfile(data.mentor);
          setNotes(data.shared_notes || '');
          setProgress(data.progress || 0);

          // If session is completed and user is learner and rating not filled, open modal
          if (data.status === 'completed' && data.learner_id === profile.id && !data.mentor_rating) {
            setIsFeedbackOpen(true);
          }
        }
      } else {
        setSession(null);
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error('Error fetching session details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionDetails();
  }, [roomId, profile]);

  // 2. Real-time Synced Channels & Polling
  useEffect(() => {
    if (!isAuthorized || !roomId || !profile) return;

    if (isMock) {
      const loadChat = () => {
        const chatKey = `skillswap-chat-messages-${roomId}`;
        const allChats: ChatMessage[] = JSON.parse(localStorage.getItem(chatKey) || '[]');
        setChatMessages(allChats);
      };

      const loadNotesAndProgress = () => {
        const mockSessions = JSON.parse(localStorage.getItem('skillswap-mock-sessions') || '[]');
        const current = mockSessions.find((s: any) => s.room_id === roomId);
        if (current) {
          setNotes(current.shared_notes || '');
          setProgress(current.progress || 0);
          
          if (current.status !== session?.status) {
            setSession(current);
            if (current.status === 'completed' && current.learner_id === profile.id && !current.mentor_rating) {
              setIsFeedbackOpen(true);
            }
          }
        }
      };

      loadChat();
      const interval = setInterval(() => {
        loadChat();
        loadNotesAndProgress();
      }, 2000);

      return () => clearInterval(interval);
    } else {
      // Supabase Live Subscriptions
      const fetchChatMessages = async () => {
        const { data } = await supabase
          .from('session_messages')
          .select('*, profiles:sender_id(full_name, avatar_url)')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });
        
        if (data) {
          setChatMessages(
            data.map((msg: any) => ({
              id: msg.id,
              sender_id: msg.sender_id,
              sender_name: msg.profiles?.full_name || 'Anonymous',
              sender_avatar: msg.profiles?.avatar_url || null,
              content: msg.content,
              created_at: msg.created_at
            }))
          );
        }
      };
      
      fetchChatMessages();

      const chatChannel = supabase
        .channel(`session_chat:${roomId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `room_id=eq.${roomId}`
        }, () => {
          fetchChatMessages();
        })
        .subscribe();

      const notesChannel = supabase
        .channel(`session_updates:${roomId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'learning_sessions',
          filter: `room_id=eq.${roomId}`
        }, (payload) => {
          const updated = payload.new as any;
          setSession(updated);
          setNotes(updated.shared_notes || '');
          setProgress(updated.progress || 0);
          if (updated.status === 'completed' && updated.learner_id === profile.id && !updated.mentor_rating) {
            setIsFeedbackOpen(true);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(chatChannel);
        supabase.removeChannel(notesChannel);
      };
    }
  }, [isAuthorized, roomId, profile, session?.status]);

  // 3. Elapsed Duration Timer
  useEffect(() => {
    if (session?.status !== 'active' || !session?.started_at) return;

    const updateTimer = () => {
      const start = new Date(session.started_at).getTime();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setElapsedTime(elapsed > 0 ? elapsed : 0);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [session?.status, session?.started_at]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const saveNotesToDb = async (val: string) => {
    if (isMock || !roomId) return;
    try {
      await supabase
        .from('learning_sessions')
        .update({ shared_notes: val })
        .eq('room_id', roomId);
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setIsSavingNotes(true);

    if (isMock) {
      localStorage.setItem(`skillswap-mock-session-notes-${roomId}`, val);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setIsSavingNotes(false), 800);
    } else {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await saveNotesToDb(val);
        setIsSavingNotes(false);
      }, 1000);
    }
  };

  const handleStartSession = async () => {
    try {
      setLoading(true);
      await sessionService.startSession(roomId!);
      await fetchSessionDetails();

      // Trigger Start Notification
      await notificationService.createNotification({
        user_id: session.learner_id,
        type: 'swap',
        title: 'Session Started!',
        message: `${profile.full_name || 'Your mentor'} has started the session. Join now!`,
        priority: 'High',
        action_url: `/session/${roomId}`
      });
    } catch (err) {
      console.error('Error starting session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    const confirmComplete = window.confirm("Are you sure you want to complete this learning session?");
    if (!confirmComplete) return;

    try {
      setLoading(true);
      // Completes session. Learner rating is collected in feedback modal next.
      if (isMock) {
        const mockSessions = JSON.parse(localStorage.getItem('skillswap-mock-sessions') || '[]');
        const idx = mockSessions.findIndex((s: any) => s.room_id === roomId);
        if (idx !== -1) {
          mockSessions[idx].status = 'completed';
          mockSessions[idx].completed_at = new Date().toISOString();
          mockSessions[idx].duration_seconds = elapsedTime;
          localStorage.setItem('skillswap-mock-sessions', JSON.stringify(mockSessions));
        }
      } else {
        await supabase
          .from('learning_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_seconds: elapsedTime
          })
          .eq('room_id', roomId);
      }

      // Notify Learner to rate
      await notificationService.createNotification({
        user_id: session.learner_id,
        type: 'swap',
        title: 'Session Completed - Feedback Requested',
        message: 'Your session has ended. Please provide feedback and rate your mentor.',
        priority: 'Medium',
        action_url: `/session/${roomId}`
      });

      await fetchSessionDetails();
    } catch (err) {
      console.error('Error completing session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setProgress(val);
    try {
      await sessionService.updateProgress(roomId!, val);
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleSendChatMessage = async (text: string) => {
    if (!text.trim() || !roomId) return;
    if (isMock) {
      const chatMsg: ChatMessage = {
        id: `chat-${Date.now()}`,
        sender_id: profile.id,
        sender_name: profile.full_name || 'You',
        sender_avatar: profile.avatar_url,
        content: text,
        created_at: new Date().toISOString()
      };
      const chatKey = `skillswap-chat-messages-${roomId}`;
      const all: ChatMessage[] = JSON.parse(localStorage.getItem(chatKey) || '[]');
      all.push(chatMsg);
      localStorage.setItem(chatKey, JSON.stringify(all));
      setChatMessages(prev => [...prev, chatMsg]);
    } else {
      await supabase
        .from('session_messages')
        .insert({
          room_id: roomId,
          sender_id: profile.id,
          content: text
        });
    }
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeContent.trim()) return;
    handleSendChatMessage(`[Code:${codeContent}]`);
    setCodeContent('');
    setShowCodeInput(false);
  };

  const handleSendMockFile = (name: string, type: 'File' | 'Image') => {
    handleSendChatMessage(`[${type}:${name}]`);
  };

  const handleSendMockResource = () => {
    const url = window.prompt("Enter resource URL:");
    if (url) {
      handleSendChatMessage(`[Resource:${url}]`);
    }
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingFeedback(true);
      await sessionService.completeSession(roomId!, {
        duration_seconds: session.duration_seconds || elapsedTime || 3600,
        progress,
        mentor_rating: ratingScore,
        learner_feedback: feedbackComment
      });

      // Notify Mentor that review has been left
      await notificationService.createNotification({
        user_id: session.mentor_id,
        type: 'swap',
        title: 'Review Received!',
        message: `${profile.full_name || 'Learner'} gave you a rating of ${ratingScore}/5.`,
        priority: 'Medium',
        action_url: `/profile`
      });

      setIsFeedbackOpen(false);
      await fetchSessionDetails();
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}/session/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${hours > 0 ? hours + ':' : ''}${pad(minutes)}:${pad(seconds)}`;
  };

  const renderChatMessageContent = (content: string) => {
    if (content.startsWith('[Code:')) {
      const code = content.slice(6, -1);
      return (
        <div className="space-y-1 mt-1 text-left">
          <div className="flex items-center justify-between text-[9px] text-slate-400 border-b border-slate-700/60 pb-1">
            <span>SHARED CODE SNIPPET</span>
            <button onClick={() => navigator.clipboard.writeText(code)} className="hover:text-white font-bold">Copy</button>
          </div>
          <pre className="bg-slate-950 p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto text-emerald-400 leading-relaxed max-w-full">
            <code>{code}</code>
          </pre>
        </div>
      );
    }
    if (content.startsWith('[File:') || content.startsWith('[Image:')) {
      const isImg = content.startsWith('[Image:');
      const name = content.slice(isImg ? 7 : 6, -1);
      return (
        <div className="flex items-center space-x-2 bg-slate-950/20 p-2 rounded-xl border border-slate-800/80 mt-1 text-left">
          {isImg ? <Image className="w-5 h-5 text-amber-500 shrink-0" /> : <Paperclip className="w-5 h-5 text-blue-500 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-200 truncate">{name}</p>
            <p className="text-[8px] text-slate-500">{isImg ? 'Image attachment' : 'Document file'}</p>
          </div>
          <button className="text-[10px] font-bold text-primary-400 hover:text-primary-500">View</button>
        </div>
      );
    }
    if (content.startsWith('[Resource:')) {
      const link = content.slice(10, -1);
      return (
        <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1.5 text-blue-450 dark:text-blue-400 hover:underline mt-1 text-left">
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-xs">{link}</span>
        </a>
      );
    }
    return <p className="text-left whitespace-pre-wrap">{content}</p>;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
        <p className="text-gray-505 dark:text-slate-400 font-medium animate-pulse">Connecting to live room...</p>
      </div>
    );
  }

  if (!isAuthorized || !session) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/20 rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-heading font-extrabold text-2xl text-gray-950 dark:text-white">Access Denied</h2>
            <p className="text-sm text-gray-500">You are not registered as an approved participant for this private room.</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl transition-all shadow-md">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isUserMentor = profile.id === session.mentor_id;
  const partnerProfile = isUserMentor ? learnerProfile : mentorProfile;
  const partnerName = partnerProfile?.full_name || 'Learning Partner';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-6 h-[calc(100vh-5rem)]">
      
      {/* Session Header Panel */}
      <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-tr from-primary-500 to-secondary-500 text-white rounded-xl shadow-md">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="font-heading font-bold text-lg text-gray-950 dark:text-white">
                Live SkillSwap Workspace
              </h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                session.status === 'completed'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400'
                  : session.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-450 animate-pulse'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
              } border`}>
                {session.status}
              </span>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Partner: <span className="font-semibold text-gray-800 dark:text-slate-200">{partnerName}</span></span>
              <span className="mx-1">•</span>
              <span>Role: <span className="font-semibold text-primary-500">{isUserMentor ? 'Mentor' : 'Learner'}</span></span>
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {session.status === 'active' && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-950/30 rounded-xl text-xs font-black">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Timer: {formatTimer(elapsedTime)}</span>
            </div>
          )}

          {isUserMentor && session.status === 'scheduled' && (
            <button
              onClick={handleStartSession}
              className="flex items-center space-x-1 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Session</span>
            </button>
          )}

          {isUserMentor && session.status === 'active' && (
            <button
              onClick={handleCompleteSession}
              className="flex items-center space-x-1 px-4 py-1.5 bg-blue-500 hover:bg-blue-650 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Complete Session</span>
            </button>
          )}

          <button
            onClick={copySessionLink}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-gray-150 dark:border-slate-700 transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            onClick={() => navigate('/sessions')}
            className="flex items-center space-x-1 px-4 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Dashboard</span>
          </button>
        </div>
      </div>

      {/* Progress Tracker Slider (Always Visible) */}
      <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-primary-500" /> Learning Progress Tracker
            </span>
            <span className="font-black text-primary-500">{progress}% Completed</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-gray-200 dark:border-slate-800">
            <div className="bg-primary-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {session.status === 'active' && (
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">Update (Mentor):</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={handleProgressChange}
              disabled={!isUserMentor}
              className="w-36 accent-primary-500 cursor-pointer disabled:opacity-50"
            />
          </div>
        )}
      </div>

      {/* Workspace Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Left Side: Video call Integration */}
        <div className="lg:col-span-2 bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col relative h-[50vh] lg:h-auto min-h-[350px]">
          {session.status === 'completed' ? (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400 space-y-4 p-8 text-center bg-slate-900/60">
              <Award className="w-16 h-16 text-amber-500 animate-bounce" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-100">Learning Session Completed!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Thank you for participating! Review ratings and feedback have been applied to user profiles. You can close this tab safely.
                </p>
              </div>
            </div>
          ) : session.status === 'active' ? (
            <iframe
              title="Jitsi Video Conference"
              src={`https://meet.jit.si/SkillSwap-${roomId}#userInfo.displayName="${profile.full_name || 'User'}"&config.startWithAudioMuted=true&config.prejoinPageEnabled=false`}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; display-capture; autoplay"
            />
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400 space-y-4 p-8 text-center bg-slate-900/40">
              <Clock className="w-12 h-12 text-amber-500" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">Scheduled Learning Room</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {isUserMentor
                    ? "Click the 'Start Session' button above to initialize Jitsi meeting streams for your learner."
                    : "Waiting for your mentor to start the session. Once started, the video stream will load here automatically."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Chat & Scratch Pad Hub */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm min-h-[350px] lg:h-auto overflow-hidden">
          {/* Tab selector */}
          <div className="flex border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'border-primary-500 text-primary-500 bg-white dark:bg-slate-900'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-350'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'notes'
                  ? 'border-primary-500 text-primary-500 bg-white dark:bg-slate-900'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-350'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Study Notes</span>
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === 'chat' && (
              <>
                {/* Chat window */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                  {chatMessages.map((msg) => {
                    const isMe = msg.sender_id === profile.id;
                    return (
                      <div key={msg.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <img
                          src={msg.sender_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.sender_name}`}
                          alt={msg.sender_name}
                          className="w-8 h-8 rounded-full border border-gray-150 shrink-0 mt-0.5"
                        />
                        <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : ''}`}>
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 px-1 font-semibold">
                            {isMe ? 'You' : msg.sender_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className={`mt-0.5 px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isMe ? 'bg-primary-500 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-none border border-gray-150 dark:border-slate-750'
                          }`}>
                            {renderChatMessageContent(msg.content)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat attachments drawer */}
                <div className="flex items-center space-x-1.5 px-3 py-1.5 border-t border-gray-150 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30">
                  <button
                    onClick={() => handleSendMockFile('Project_Outline.pdf', 'File')}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-350 cursor-pointer"
                    title="Share PDF Document"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleSendMockFile('dashboard_design.png', 'Image')}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-350 cursor-pointer"
                    title="Share Design Screenshot"
                  >
                    <Image className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleSendMockResource}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-350 cursor-pointer"
                    title="Share External Reference link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowCodeInput(true)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-350 cursor-pointer"
                    title="Share Code Block"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Input panel */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage(newMessage);
                    setNewMessage('');
                  }}
                  className="p-3 border-t border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center space-x-2"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 min-w-0 bg-white dark:bg-slate-950 text-xs text-gray-800 dark:text-white border border-gray-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all shadow-md shadow-primary-500/10 shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}

            {activeTab === 'notes' && (
              <div className="flex-1 flex flex-col p-4 space-y-3 h-full">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="font-bold flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-primary-500" /> Study Notepad</span>
                  <span>{isSavingNotes ? 'Saving...' : 'Saved'}</span>
                </div>
                <textarea
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Draft outlines, reference resources, shared links, and code blocks here during the swap."
                  className="flex-1 w-full bg-gray-55/30 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-xl p-3.5 text-xs font-mono text-gray-800 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code Sharing input overlay modal */}
      {showCodeInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSendCode} className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="font-heading font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
              <Code className="w-4.5 h-4.5 text-primary-500" /> Share Code Snippet
            </h3>
            <textarea
              value={codeContent}
              onChange={(e) => setCodeContent(e.target.value)}
              placeholder={`// Write your code snippet here...\nfunction hello() {\n  console.log("Hello, Swapper!");\n}`}
              rows={8}
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-250 dark:border-slate-800 rounded-xl p-3.5 text-xs font-mono text-gray-800 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCodeInput(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-primary-500/10"
              >
                Send Code
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Post-Session Feedback & Review Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={submitFeedback} className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="font-heading font-black text-xl text-gray-950 dark:text-white">Session Completed!</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Please leave feedback on your swap learning experience with **{partnerName}**.
              </p>
            </div>

            {/* Stars Selector */}
            <div className="flex justify-center space-x-1.5 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingScore(star)}
                  className="focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= ratingScore ? 'text-amber-500 fill-amber-500' : 'text-gray-300 dark:text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Qualitative textarea */}
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-extrabold uppercase text-gray-500 dark:text-slate-400 tracking-wider">
                Feedback Comments
              </label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Share what went well or how they can improve..."
                rows={3}
                required
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={submittingFeedback}
              className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-primary-500/10 disabled:opacity-50"
            >
              {submittingFeedback ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Submit Feedback & Complete Profile Stats</span>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

export default SessionPage;
