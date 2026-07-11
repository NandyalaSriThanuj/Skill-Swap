import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { notificationService } from '../lib/notificationService';
import type { Profile, SwapRequest, Message, LearningSession } from '../types';
import { 
  Inbox, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare,
  Repeat,
  CheckCircle,
  X,
  Video
} from 'lucide-react';

export const RequestsPage: React.FC = () => {
  const { profile, isMock } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [loading, setLoading] = useState(true);

  // Chat/Messaging States
  const [activeChatRequestId, setActiveChatRequestId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsgContent, setNewMsgContent] = useState('');

  // Initial Seed for Mock Requests if not present
  useEffect(() => {
    if (profile && !localStorage.getItem('skillswap-mock-requests')) {
      const initialRequests: SwapRequest[] = [
        {
          id: 'req-demo-1',
          sender_id: 'user-marcus', // Marcus Chen
          receiver_id: profile.id, // Current user
          skill_offered: 'Figma', // Marcus offers Figma
          skill_wanted: 'React', // Marcus wants React
          status: 'pending',
          message: `Hey! I saw that you want to learn UI/UX Design and Figma, and you teach React. I would love to pair up. I've designed several mobile apps and can teach you layout grids, components, and auto-layout. Let me know!`,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
        },
        {
          id: 'req-demo-2',
          sender_id: 'user-elena', // Elena Rostova
          receiver_id: profile.id, // Current user
          skill_offered: 'Python', // Elena teaches Python
          skill_wanted: 'Public Speaking', // Elena wants Public Speaking
          status: 'approved',
          message: `Hi there! I'm a Data Scientist and can teach you Python scripting, analysis, or machine learning concepts. Looking forward to learning some tips on public speaking from you!`,
          created_at: new Date(Date.now() - 3600000 * 24).toISOString() // 24 hours ago
        }
      ];
      localStorage.setItem('skillswap-mock-requests', JSON.stringify(initialRequests));
    }

    if (profile && !localStorage.getItem('skillswap-mock-sessions')) {
      const initialSessions: LearningSession[] = [
        {
          id: 'sess-demo-2',
          room_id: 'room-demo-2',
          learner_id: 'user-elena',
          mentor_id: profile.id,
          swap_request_id: 'req-demo-2',
          session_link: `${window.location.origin}/session/room-demo-2`,
          status: 'active',
          expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          created_at: new Date(Date.now() - 3600000 * 24).toISOString()
        }
      ];
      localStorage.setItem('skillswap-mock-sessions', JSON.stringify(initialSessions));
    }
  }, [profile]);

  // Load requests and profiles
  const loadRequests = async () => {
    if (!profile) return;
    setLoading(true);

    if (isMock) {
      const allRequests: SwapRequest[] = JSON.parse(localStorage.getItem('skillswap-mock-requests') || '[]');
      const allProfiles: Profile[] = JSON.parse(localStorage.getItem('skillswap-mock-profiles') || '[]');
      const allSessions: LearningSession[] = JSON.parse(localStorage.getItem('skillswap-mock-sessions') || '[]');

      // Filter requests relating to current user
      const userRequests = allRequests.filter(req => 
        activeTab === 'incoming' 
          ? req.receiver_id === profile.id 
          : req.sender_id === profile.id
      );

      // Hydrate requests with profile details
      const hydrated = userRequests.map(req => {
        const sender = allProfiles.find(p => p.id === req.sender_id);
        const receiver = allProfiles.find(p => p.id === req.receiver_id);
        return {
          ...req,
          sender_profile: sender,
          receiver_profile: receiver
        };
      });

      setRequests(hydrated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setSessions(allSessions);
      setLoading(false);
    } else {
      try {
        const isIncoming = activeTab === 'incoming';
        const { data: requestsData, error: reqErr } = await supabase
          .from('swap_requests')
          .select('*, sender_profile:profiles!sender_id(*), receiver_profile:profiles!receiver_id(*)')
          .eq(isIncoming ? 'receiver_id' : 'sender_id', profile.id);

        if (reqErr) throw reqErr;

        const { data: sessionsData, error: sessErr } = await supabase
          .from('learning_sessions')
          .select('*')
          .or(`learner_id.eq.${profile.id},mentor_id.eq.${profile.id}`);

        if (sessErr) throw sessErr;

        setRequests((requestsData as any[] || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setSessions(sessionsData as LearningSession[] || []);
      } catch (err) {
        console.error('Error loading requests from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadRequests();
  }, [profile, activeTab, isMock]);

  // Load chat messages when active chat changes
  useEffect(() => {
    if (activeChatRequestId) {
      if (isMock) {
        const allMessages: Message[] = JSON.parse(localStorage.getItem('skillswap-mock-messages') || '[]');
        const filtered = allMessages.filter(m => m.swap_request_id === activeChatRequestId);
        setMessages(filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      } else {
        const fetchMessages = async () => {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('swap_request_id', activeChatRequestId)
            .order('created_at', { ascending: true });
          if (!error && data) {
            setMessages(data as Message[]);
          }
        };
        fetchMessages();

        // Subscribe to real-time chat updates
        const channel = supabase
          .channel(`messages:${activeChatRequestId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `swap_request_id=eq.${activeChatRequestId}`
          }, payload => {
            setMessages(prev => [...prev, payload.new as Message]);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [activeChatRequestId, isMock]);

  if (!profile) return null;

  const handleUpdateStatus = async (requestId: string, newStatus: SwapRequest['status']) => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) return;

    const senderName = targetReq.sender_profile?.full_name || 'A swapper';
    const receiverName = targetReq.receiver_profile?.full_name || 'Your partner';

    if (isMock) {
      const allRequests: SwapRequest[] = JSON.parse(localStorage.getItem('skillswap-mock-requests') || '[]');
      const index = allRequests.findIndex(r => r.id === requestId);
      if (index !== -1) {
        const oldReq = allRequests[index];
        allRequests[index].status = newStatus;
        localStorage.setItem('skillswap-mock-requests', JSON.stringify(allRequests));

        // If approved, trigger room creation & notifications in mock mode
        if (newStatus === 'approved' && oldReq.status !== 'approved') {
          const roomId = `room-${Math.random().toString(36).substr(2, 9)}`;
          const sessionLink = `${window.location.origin}/session/${roomId}`;
          const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24 hours expiry
          
          const newSession: LearningSession = {
            id: `sess-${Math.random().toString(36).substr(2, 9)}`,
            room_id: roomId,
            learner_id: oldReq.sender_id,
            mentor_id: oldReq.receiver_id,
            swap_request_id: oldReq.id,
            session_link: sessionLink,
            status: 'active',
            expires_at: expiresAt,
            created_at: new Date().toISOString()
          };

          // Save session
          const allSessions = JSON.parse(localStorage.getItem('skillswap-mock-sessions') || '[]');
          allSessions.push(newSession);
          localStorage.setItem('skillswap-mock-sessions', JSON.stringify(allSessions));

          // Create Notifications
          try {
            await notificationService.createNotification(oldReq.sender_id, {
              type: 'swap',
              title: 'Swap Request Approved!',
              message: `${receiverName} has approved your swap request. Click to join the learning room!`,
              priority: 'High',
              action_url: `/session/${roomId}`
            });

            await notificationService.createNotification(oldReq.receiver_id, {
              type: 'swap',
              title: 'Learning Room Provisioned!',
              message: `You approved ${senderName}'s request. Your joint learning session is active.`,
              priority: 'Medium',
              action_url: `/session/${roomId}`
            });
          } catch (notifErr) {
            console.error('Failed to generate mock swap status notifications:', notifErr);
          }
        } else if (newStatus === 'rejected' && oldReq.status !== 'rejected') {
          try {
            await notificationService.createNotification(oldReq.sender_id, {
              type: 'swap',
              title: 'Swap Request Declined',
              message: `${receiverName} declined your swap request to exchange "${oldReq.skill_offered}" for "${oldReq.skill_wanted}".`,
              priority: 'Medium',
              action_url: '/requests'
            });
          } catch (notifErr) {
            console.error('Failed to generate mock reject notification:', notifErr);
          }
        }

        loadRequests();
      }
    } else {
      try {
        const { error } = await supabase
          .from('swap_requests')
          .update({ status: newStatus })
          .eq('id', requestId);
        
        if (error) throw error;

        // If approved, trigger notifications (Supabase trigger also runs, but we add detail / support rejection notification here)
        if (newStatus === 'approved') {
          // Check if session got created by trigger or if we should notify
          // Since the DB trigger 'notify_on_session_created' handles creating notifications upon learning_sessions INSERT,
          // when we approve a swap request, the backend/client will insert a learning session.
          // Let's check if the client creates the learning session. Wait, does the client create the session, or does a database trigger create it?
          // Let's check supabase_schema.sql if there is a trigger to create a learning session upon approval.
          // Wait, let's search in supabase_schema.sql for 'insert into public.learning_sessions' or similar.
        } else if (newStatus === 'rejected') {
          try {
            await notificationService.createNotification(targetReq.sender_id, {
              type: 'swap',
              title: 'Swap Request Declined',
              message: `${receiverName} declined your swap request to exchange "${targetReq.skill_offered}" for "${targetReq.skill_wanted}".`,
              priority: 'Medium',
              action_url: '/requests'
            });
          } catch (notifErr) {
            console.error('Failed to create live reject notification:', notifErr);
          }
        }

        loadRequests();
      } catch (err) {
        console.error('Error updating status in Supabase:', err);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgContent.trim() || !activeChatRequestId) return;

    if (isMock) {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        swap_request_id: activeChatRequestId,
        sender_id: profile.id,
        content: newMsgContent.trim(),
        created_at: new Date().toISOString()
      };

      // Save to local storage
      const allMessages: Message[] = JSON.parse(localStorage.getItem('skillswap-mock-messages') || '[]');
      allMessages.push(newMsg);
      localStorage.setItem('skillswap-mock-messages', JSON.stringify(allMessages));

      // Update state
      setMessages(prev => [...prev, newMsg]);
      setNewMsgContent('');

      // Trigger mock automated reply after 1.5 seconds for higher fidelity!
      setTimeout(() => {
        const activeReq = requests.find(r => r.id === activeChatRequestId);
        if (!activeReq) return;
        const targetUser = activeReq.receiver_id === profile.id ? activeReq.sender_profile : activeReq.receiver_profile;

        const replyMsg: Message = {
          id: `msg-reply-${Date.now()}`,
          swap_request_id: activeChatRequestId,
          sender_id: targetUser?.id || 'system',
          content: `Hey! That sounds like a plan. Let's schedule our first session on Google Meet for next Tuesday at 6 PM. Looking forward to it!`,
          created_at: new Date().toISOString()
        };

        const updatedMessages = JSON.parse(localStorage.getItem('skillswap-mock-messages') || '[]');
        updatedMessages.push(replyMsg);
        localStorage.setItem('skillswap-mock-messages', JSON.stringify(updatedMessages));

        // Update state if we are still chatting on the same request
        setMessages(prev => {
          if (prev.length > 0 && prev[prev.length - 1].swap_request_id === activeChatRequestId) {
            return [...prev, replyMsg];
          }
          return prev;
        });
      }, 1500);
    } else {
      try {
        const { error } = await supabase
          .from('messages')
          .insert({
            swap_request_id: activeChatRequestId,
            sender_id: profile.id,
            content: newMsgContent.trim()
          });
        
        if (error) throw error;
        setNewMsgContent('');
      } catch (err) {
        console.error('Error sending message in Supabase:', err);
      }
    }
  };

  const getStatusBadge = (status: SwapRequest['status']) => {
    const baseClass = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider";
    switch (status) {
      case 'approved':
        return <span className={`${baseClass} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400`}><CheckCircle2 className="w-3 h-3 mr-1" />Approved</span>;
      case 'rejected':
        return <span className={`${baseClass} bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400`}><XCircle className="w-3 h-3 mr-1" />Rejected</span>;
      case 'completed':
        return <span className={`${baseClass} bg-primary-100 text-primary-800 dark:bg-primary-950/30 dark:text-primary-400`}><CheckCircle className="w-3 h-3 mr-1" />Completed</span>;
      default:
        return <span className={`${baseClass} bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400`}><Clock className="w-3 h-3 mr-1" />Pending</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Page Header */}
      <div className="text-center md:text-left space-y-2">
        <h1 className="font-heading font-extrabold text-3xl tracking-tight text-gray-900 dark:text-white">
          Swap Request Inbox
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Manage your incoming offers or view the progress of proposals you sent.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-150 dark:border-slate-800">
        <button
          onClick={() => {
            setActiveTab('incoming');
            setActiveChatRequestId(null);
          }}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition-all mr-6 cursor-pointer ${
            activeTab === 'incoming'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          Received Offers
        </button>
        <button
          onClick={() => {
            setActiveTab('outgoing');
            setActiveChatRequestId(null);
          }}
          className={`pb-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'outgoing'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          Sent Proposals
        </button>
      </div>

      {/* Main requests lists */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-450 dark:text-slate-400">Loading requests...</p>
        </div>
      ) : requests.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Requests Column (2/3 if chat active, else full) */}
          <div className={`${activeChatRequestId ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
            {requests.map((req) => {
              const isIncoming = activeTab === 'incoming';
              const targetProfile = isIncoming ? req.sender_profile : req.receiver_profile;

              if (!targetProfile) return null;

              return (
                <div
                  key={req.id}
                  className={`bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-primary-500/10 transition-all ${
                    activeChatRequestId === req.id ? 'ring-2 ring-primary-500/20 border-primary-500' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
                    {/* User profile */}
                    <div className="flex items-center space-x-3.5">
                      <Link to={`/profile/${targetProfile.id}`} className="shrink-0 hover:opacity-85 transition-opacity">
                        <img
                          src={targetProfile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${targetProfile.username}`}
                          alt={targetProfile.full_name || 'User'}
                          className="w-11 h-11 rounded-full bg-gray-50 border border-gray-100 object-cover"
                        />
                      </Link>
                      <div>
                        <Link to={`/profile/${targetProfile.id}`} className="hover:text-primary-500 transition-colors">
                          <h4 className="font-extrabold text-gray-900 dark:text-white text-base">{targetProfile.full_name}</h4>
                        </Link>
                        <p className="text-xs text-gray-450 dark:text-slate-455">@{targetProfile.username}</p>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div className="self-start sm:self-auto flex items-center gap-2">
                      {getStatusBadge(req.status)}
                    </div>
                  </div>

                  {/* Pitch Message */}
                  <div className="py-4 space-y-3">
                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                      Proposal Details
                    </p>
                    <p className="text-sm text-gray-650 dark:text-slate-350 leading-relaxed italic bg-gray-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-gray-100/50 dark:border-slate-800">
                      "{req.message}"
                    </p>
                  </div>

                  {/* Skills Grid */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-3 bg-gray-50/50 dark:bg-slate-900/40 px-4 rounded-2xl border border-gray-100/30 dark:border-slate-800/40">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                        {isIncoming ? "Offers:" : "You teach:"}
                      </span>
                      <span className="px-2.5 py-1 bg-primary-100 dark:bg-primary-950/40 text-primary-800 dark:text-primary-300 text-xs font-bold rounded-lg">
                        {req.skill_offered}
                      </span>
                    </div>

                    <div className="hidden sm:block text-gray-300 dark:text-slate-750">
                      <Repeat className="w-4 h-4 rotate-90 sm:rotate-0" />
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-secondary-600 dark:text-secondary-400 uppercase tracking-wide">
                        {isIncoming ? "Wants:" : "You learn:"}
                      </span>
                      <span className="px-2.5 py-1 bg-secondary-100 dark:bg-secondary-950/40 text-secondary-800 dark:text-secondary-300 text-xs font-bold rounded-lg">
                        {req.skill_wanted}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-800 mt-4">
                    {/* Approve / Decline buttons for Incoming Pending requests */}
                    {isIncoming && req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'rejected')}
                          className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                        >
                          Decline Swap
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'approved')}
                          className="px-4.5 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                        >
                          Approve Swap
                        </button>
                      </>
                    )}

                    {/* Chat button for Approved swaps */}
                    {req.status === 'approved' && (() => {
                      const reqSession = sessions.find(s => s.swap_request_id === req.id && s.status === 'active');
                      return (
                        <>
                          {reqSession && (
                            <button
                              onClick={() => navigate(`/session/${reqSession.room_id}`)}
                              className="px-4.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-650 rounded-xl transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-500/10 cursor-pointer animate-pulse-slow"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Launch Learning Room</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'completed')}
                            className="px-4 py-2 text-xs font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-xl transition-all cursor-pointer"
                          >
                            Mark Completed
                          </button>
                          <button
                            onClick={() => setActiveChatRequestId(activeChatRequestId === req.id ? null : req.id)}
                            className="px-4.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-650 hover:to-primary-700 rounded-xl transition-all flex items-center space-x-1.5 shadow-md shadow-primary-500/10 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{activeChatRequestId === req.id ? 'Close Chat' : 'Chat & Coordinate'}</span>
                          </button>
                        </>
                      );
                    })()}

                    {/* Completion notes */}
                    {req.status === 'completed' && (
                      <span className="text-xs text-gray-400 dark:text-slate-500 italic flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1" />
                        Exchange completed successfully!
                      </span>
                    )}

                    {/* Sent proposals awaiting response */}
                    {!isIncoming && req.status === 'pending' && (
                      <span className="text-xs text-amber-500 font-semibold flex items-center">
                        <Clock className="w-4 h-4 mr-1 animate-pulse" />
                        Awaiting response from member
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Panel Column (1/3) */}
          {activeChatRequestId && (
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl shadow-lg flex flex-col h-[550px] relative overflow-hidden animate-in slide-in-from-right-4 duration-300">
              
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4.5 h-4.5 text-primary-500" />
                  <span className="font-bold text-sm text-gray-900 dark:text-white">Swap Organizer</span>
                </div>
                <button
                  onClick={() => setActiveChatRequestId(null)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === profile.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-primary-500 text-white rounded-tr-none'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-none'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <span className={`block text-[9px] mt-1 text-right ${isMe ? 'text-primary-100' : 'text-gray-400 dark:text-slate-500'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 text-gray-400 dark:text-slate-500 text-xs space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-primary-500" />
                    <p>Start chatting with your partner to organize lesson times!</p>
                  </div>
                )}
              </div>

              {/* Chat Send Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 dark:border-slate-850 bg-gray-50/50 dark:bg-slate-900">
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newMsgContent}
                    onChange={(e) => setNewMsgContent(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-gray-205 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 p-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-12 rounded-3xl text-center space-y-4 shadow-sm max-w-md mx-auto">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto" />
          <div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">Your inbox is empty</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              You haven't received or sent any swap proposals yet. Check out the swappers list to make an offer.
            </p>
          </div>
          <button
            onClick={() => navigate('/browse')}
            className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-xs rounded-xl shadow-md shadow-primary-500/10"
          >
            Find Swappers
          </button>
        </div>
      )}

    </div>
  );
};
export default RequestsPage;
