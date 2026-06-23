import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Profile, LearningSession } from '../types';
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
  BookOpen
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
  const [session, setSession] = useState<LearningSession | null>(null);
  const [learnerProfile, setLearnerProfile] = useState<Profile | null>(null);
  const [mentorProfile, setMentorProfile] = useState<Profile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  // Shared Workspace Tabs: 'chat' | 'notes'
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  
  // Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Notes State
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Clipboard feedback
  const [copiedLink, setCopiedLink] = useState(false);

  // Dynamic Jitsi Join State
  const [videoActive, setVideoActive] = useState(true);

  // Ref for debounced notes saving timeout
  const saveTimeoutRef = useRef<any>(null);

  if (!profile) return null;

  // 1. Fetch Session Info & Validate Security
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!roomId || !profile) return;
      setLoading(true);

      try {
        if (isMock) {
          // --- Mock Flow ---
          const allSessions: LearningSession[] = JSON.parse(
            localStorage.getItem('skillswap-mock-sessions') || '[]'
          );
          const currentSession = allSessions.find(s => s.room_id === roomId);

          if (currentSession) {
            setSession(currentSession);
            
            // Check authorization
            const hasAccess =
              currentSession.learner_id === profile.id ||
              currentSession.mentor_id === profile.id;
            setIsAuthorized(hasAccess);

            if (hasAccess) {
              // Check Expiry
              const expiryTime = new Date(currentSession.expires_at).getTime();
              const now = Date.now();
              if (now > expiryTime) {
                setIsExpired(true);
                currentSession.status = 'expired';
                localStorage.setItem('skillswap-mock-sessions', JSON.stringify(allSessions));
              }

              // Hydrate participant profiles
              const allProfiles: Profile[] = JSON.parse(
                localStorage.getItem('skillswap-mock-profiles') || '[]'
              );
              const learner = allProfiles.find(p => p.id === currentSession.learner_id) || null;
              const mentor = allProfiles.find(p => p.id === currentSession.mentor_id) || null;
              setLearnerProfile(learner);
              setMentorProfile(mentor);

              // Load shared notes
              const savedNotes = localStorage.getItem(`skillswap-mock-session-notes-${roomId}`) || '';
              setNotes(savedNotes);
            }
          } else {
            // Session not found
            setSession(null);
            setIsAuthorized(false);
          }
        } else {
          // --- Real Supabase Flow ---
          const { data: currentSession, error: sessionErr } = await supabase
            .from('learning_sessions')
            .select('*')
            .eq('room_id', roomId)
            .maybeSingle();

          if (sessionErr) throw sessionErr;

          if (currentSession) {
            setSession(currentSession as LearningSession);

            // Check authorization
            const hasAccess =
              currentSession.learner_id === profile.id ||
              currentSession.mentor_id === profile.id;
            setIsAuthorized(hasAccess);

            if (hasAccess) {
              // Check Expiry
              const expiryTime = new Date(currentSession.expires_at).getTime();
              const now = Date.now();
              if (now > expiryTime) {
                setIsExpired(true);
              }

              // Fetch Profiles
              const { data: profiles, error: profilesErr } = await supabase
                .from('profiles')
                .select('*')
                .in('id', [currentSession.learner_id, currentSession.mentor_id]);

              if (profilesErr) throw profilesErr;

              if (profiles) {
                const learner = profiles.find(p => p.id === currentSession.learner_id) || null;
                const mentor = profiles.find(p => p.id === currentSession.mentor_id) || null;
                setLearnerProfile(learner);
                setMentorProfile(mentor);
              }

              // Load notes from DB
              setNotes((currentSession as any).shared_notes || '');
            }
          } else {
            setSession(null);
            setIsAuthorized(false);
          }
        }
      } catch (err) {
        console.error('Error fetching session details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [roomId, profile, isMock]);

  // 2. Poll/Sync Chat & Shared Notes
  useEffect(() => {
    if (!isAuthorized || isExpired || !roomId || !profile) return;

    if (isMock) {
      // Load initial chat
      const getChatKey = () => `skillswap-chat-messages-${roomId}`;
      
      const loadChat = () => {
        const allChats: ChatMessage[] = JSON.parse(localStorage.getItem(getChatKey()) || '[]');
        setChatMessages(allChats);
      };

      // Load initial notes
      const loadNotes = () => {
        const savedNotes = localStorage.getItem(`skillswap-mock-session-notes-${roomId}`) || '';
        setNotes(savedNotes);
      };

      loadChat();

      // Setup polling every 1.5 seconds for real-time synchronization between tabs
      const syncInterval = setInterval(() => {
        loadChat();
        loadNotes();
      }, 1500);

      return () => clearInterval(syncInterval);
    } else {
      // --- Real Supabase Flow ---
      // Fetch initial chat messages
      const fetchChatMessages = async () => {
        try {
          const { data, error } = await supabase
            .from('session_messages')
            .select('*, profiles:sender_id(full_name, avatar_url)')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

          if (error) throw error;
          if (data) {
            const formatted = data.map((msg: any) => ({
              id: msg.id,
              sender_id: msg.sender_id,
              sender_name: msg.profiles?.full_name || 'Anonymous',
              sender_avatar: msg.profiles?.avatar_url || null,
              content: msg.content,
              created_at: msg.created_at
            }));
            setChatMessages(formatted);
          }
        } catch (err) {
          console.error('Error fetching chat messages:', err);
        }
      };
      
      fetchChatMessages();

      // Subscribe to real-time chat messages
      const chatChannel = supabase
        .channel(`room_chat:${roomId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `room_id=eq.${roomId}`
        }, (payload) => {
          const newMsg = payload.new as any;
          const senderId = newMsg.sender_id;
          
          let senderName = 'Anonymous';
          let senderAvatar: string | null = null;
          
          if (senderId === profile.id) {
            senderName = profile.full_name || 'You';
            senderAvatar = profile.avatar_url;
          } else if (senderId === learnerProfile?.id) {
            senderName = learnerProfile?.full_name || 'Learner';
            senderAvatar = learnerProfile?.avatar_url || null;
          } else if (senderId === mentorProfile?.id) {
            senderName = mentorProfile?.full_name || 'Mentor';
            senderAvatar = mentorProfile?.avatar_url || null;
          }

          const formattedMsg: ChatMessage = {
            id: newMsg.id,
            sender_id: senderId,
            sender_name: senderName,
            sender_avatar: senderAvatar,
            content: newMsg.content,
            created_at: newMsg.created_at
          };

          setChatMessages(prev => {
            if (prev.some(m => m.id === formattedMsg.id)) return prev;
            return [...prev, formattedMsg];
          });
        })
        .subscribe();

      // Subscribe to collaborative notes
      const notesChannel = supabase
        .channel(`room_session:${roomId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'learning_sessions',
          filter: `room_id=eq.${roomId}`
        }, (payload) => {
          const updatedSession = payload.new as any;
          setNotes(prev => {
            if (prev !== updatedSession.shared_notes) {
              return updatedSession.shared_notes || '';
            }
            return prev;
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(chatChannel);
        supabase.removeChannel(notesChannel);
      };
    }
  }, [isAuthorized, isExpired, roomId, profile, learnerProfile, mentorProfile, isMock]);

  // 3. Countdown timer for session expiration
  useEffect(() => {
    if (!session || isExpired) return;

    const interval = setInterval(() => {
      const expiryTime = new Date(session.expires_at).getTime();
      const diff = expiryTime - Date.now();

      if (diff <= 0) {
        setIsExpired(true);
        clearInterval(interval);
        setTimeLeft('Expired');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const pad = (n: number) => n.toString().padStart(2, '0');
        setTimeLeft(`${hours > 0 ? hours + 'h ' : ''}${pad(minutes)}m ${pad(seconds)}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, isExpired]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const saveNotesToDb = async (val: string) => {
    if (isMock || !roomId) return;
    try {
      const { error } = await supabase
        .from('learning_sessions')
        .update({ shared_notes: val })
        .eq('room_id', roomId);
      if (error) console.error('Error saving notes to DB:', error);
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // 4. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || !roomId) return;

    if (isMock) {
      const chatMsg: ChatMessage = {
        id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        sender_id: profile.id,
        sender_name: profile.full_name || 'Anonymous',
        sender_avatar: profile.avatar_url,
        content: newMessage.trim(),
        created_at: new Date().toISOString()
      };

      const chatKey = `skillswap-chat-messages-${roomId}`;
      const allChats: ChatMessage[] = JSON.parse(localStorage.getItem(chatKey) || '[]');
      allChats.push(chatMsg);
      localStorage.setItem(chatKey, JSON.stringify(allChats));

      setChatMessages(prev => [...prev, chatMsg]);
      setNewMessage('');
    } else {
      try {
        const { error } = await supabase
          .from('session_messages')
          .insert({
            room_id: roomId,
            sender_id: profile.id,
            content: newMessage.trim()
          });

        if (error) {
          console.error('Error sending message to Supabase:', error);
        } else {
          setNewMessage('');
        }
      } catch (err) {
        console.error('Error sending message:', err);
      }
    }
  };

  // 5. Notes Editor Autosave handler
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setIsSavingNotes(true);

    if (isMock) {
      // Save to local storage
      localStorage.setItem(`skillswap-mock-session-notes-${roomId}`, val);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setIsSavingNotes(false);
      }, 800);
    } else {
      // Debounce saving notes to Supabase DB
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await saveNotesToDb(val);
        setIsSavingNotes(false);
      }, 1000);
    }
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}/session/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // --- RENDERING HANDLERS ---

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
        <p className="text-gray-500 dark:text-slate-400 font-medium animate-pulse">
          Connecting to private room...
        </p>
      </div>
    );
  }

  // Unauthorized screen
  if (!isAuthorized || !session) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/20 rounded-3xl p-8 shadow-xl text-center space-y-6 glass">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-heading font-extrabold text-2xl text-gray-950 dark:text-white">
              Access Denied
            </h2>
            <p className="text-sm text-gray-550 dark:text-slate-400">
              You are not registered as an approved participant for this private swapping room. Only the requester and receiver can join.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-primary-500/25"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Expired session screen
  if (isExpired) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-950/20 rounded-3xl p-8 shadow-xl text-center space-y-6 glass">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-heading font-extrabold text-2xl text-gray-950 dark:text-white">
              Room Expired
            </h2>
            <p className="text-sm text-gray-550 dark:text-slate-400">
              This learning room has completed its 24-hour availability window and has expired. You can propose a new swap to start another session.
            </p>
          </div>
          <button
            onClick={() => navigate('/requests')}
            className="w-full py-3 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold rounded-2xl transition-all"
          >
            Manage Swap Requests
          </button>
        </div>
      </div>
    );
  }

  // Get active roles
  const isLearner = profile?.id === session.learner_id;
  const partnerProfile = isLearner ? mentorProfile : learnerProfile;
  const selfProfile = isLearner ? learnerProfile : mentorProfile;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-6 h-[calc(100vh-5rem)]">
      
      {/* Session Header Panel */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 glass">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-tr from-primary-500 to-secondary-500 text-white rounded-xl shadow-md">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="font-heading font-bold text-lg text-gray-900 dark:text-white">
                Live SkillSwap Workspace
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                Connected
              </span>
            </div>
            
            {/* Partners info */}
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>
                Meeting with: <span className="font-semibold text-gray-700 dark:text-slate-350">{partnerProfile?.full_name || 'Partner'}</span>
              </span>
              <span className="mx-1">•</span>
              <span>
                Role: <span className="font-semibold text-primary-500">{isLearner ? 'Learner' : 'Mentor'}</span>
              </span>
            </p>
          </div>
        </div>

        {/* Header Controls: Time left, Copy Link, Leave Room */}
        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          {/* Expiry Counter */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-950/30 rounded-xl text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Time Left: {timeLeft}</span>
          </div>

          {/* Copy Link Button */}
          <button
            onClick={copySessionLink}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-gray-100 dark:border-slate-750"
            title="Copy meeting link to share with partner"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Leave Button */}
          <button
            onClick={() => navigate('/requests')}
            className="flex items-center space-x-1 px-4 py-1.5 bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Room</span>
          </button>
        </div>
      </div>

      {/* Workspace Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Left Side: Video Stream Room (2/3 width) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col relative h-[50vh] lg:h-auto min-h-[350px]">
          {videoActive ? (
            <iframe
              title="Jitsi Video Conference"
              src={`https://meet.jit.si/SkillSwap-${roomId}#userInfo.displayName="${selfProfile?.full_name || 'Swapper'}"&config.startWithAudioMuted=true&config.prejoinPageEnabled=false&config.toolbarButtons=["camera","microphone","chat","settings","hangup","desktop","fullscreen","videoquality","filmstrip","raisehand","tileview"]`}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; display-capture; autoplay"
            />
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400 space-y-4">
              <div className="p-4 bg-slate-850 rounded-full">
                <Video className="w-12 h-12 text-slate-500" />
              </div>
              <p className="font-semibold">Video Session Paused</p>
              <button
                onClick={() => setVideoActive(true)}
                className="px-4 py-2 bg-primary-500 text-white rounded-xl font-semibold text-sm"
              >
                Re-initialize Call
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Chat & Collaboration Hub (1/3 width) */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm min-h-[350px] lg:h-auto overflow-hidden">
          
          {/* Tab selector */}
          <div className="flex border-b border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3.5 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'chat'
                  ? 'border-primary-500 text-primary-500 bg-white dark:bg-slate-900'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-350'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
              {chatMessages.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-950/45 text-primary-500">
                  {chatMessages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3.5 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'notes'
                  ? 'border-primary-500 text-primary-500 bg-white dark:bg-slate-900'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-350'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Shared Pad</span>
              {notes && (
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
              )}
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
            
            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
                      <MessageSquare className="w-10 h-10 text-gray-300" />
                      <div>
                        <h4 className="font-semibold text-sm text-gray-600 dark:text-slate-350">Private Chat Room</h4>
                        <p className="text-xs text-gray-400 mt-0.5 max-w-[200px]">
                          Messages sent here are encrypted and visible only to you and your partner.
                        </p>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.sender_id === profile.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                        >
                          <img
                            src={msg.sender_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.sender_name}`}
                            alt={msg.sender_name}
                            className="w-8 h-8 rounded-full border border-gray-100 shrink-0 object-cover mt-0.5"
                          />
                          <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : ''}`}>
                            <span className="text-[10px] text-gray-450 dark:text-slate-450 font-medium px-1">
                              {isMe ? 'You' : msg.sender_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div
                              className={`mt-0.5 px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-sm font-sans ${
                                isMe
                                  ? 'bg-primary-500 text-white rounded-tr-none'
                                  : 'bg-gray-105 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-none border border-gray-100 dark:border-slate-750'
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input box */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-gray-150 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-900/40 flex items-center space-x-2"
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
                    className="p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all shadow-md shadow-primary-500/10 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}

            {/* NOTES TAB (Autosaving scratch pad) */}
            {activeTab === 'notes' && (
              <div className="flex-1 flex flex-col p-4 space-y-3 h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-slate-400">
                    <BookOpen className="w-3.5 h-3.5 text-primary-500" />
                    <span className="font-semibold">Collaborative Study Notepad</span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {isSavingNotes ? (
                      <span className="flex items-center text-primary-500 font-medium animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" /> Saving...
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-semibold">Saved locally</span>
                    )}
                  </div>
                </div>

                <textarea
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Draft project outlines, code snippets, reference URLs, and homework goals here during your session. This notepad updates in real time for both participants."
                  className="flex-1 w-full bg-gray-50/50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-xl p-3.5 text-xs font-mono text-gray-800 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none leading-relaxed"
                />
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
export default SessionPage;
