import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionService } from '../lib/sessionService';
import { supabase } from '../lib/supabaseClient';
import {
  Calendar,
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  ArrowRight,
  User,
  ExternalLink,
  Award,
  Star,
  Inbox
} from 'lucide-react';

export const MySessionsPage: React.FC = () => {
  const { profile, isMock } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'completed' | 'all'>('all');

  useEffect(() => {
    const loadSessions = async () => {
      if (!profile) return;
      try {
        setLoading(true);
        // 1. Fetch current sessions
        let data = await sessionService.fetchSessions(profile.id);

        // 2. Self-healing backfill: find approved requests without sessions and create them on the fly
        let approvedRequests: any[] = [];
        if (isMock) {
          const allReqs = JSON.parse(localStorage.getItem('skillswap-mock-requests') || '[]');
          approvedRequests = allReqs.filter(
            (r: any) => r.status === 'approved' && (r.sender_id === profile.id || r.receiver_id === profile.id)
          );
        } else {
          const { data: reqs } = await supabase
            .from('swap_requests')
            .select('*')
            .eq('status', 'approved')
            .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);
          approvedRequests = reqs || [];
        }

        // Check if any approved request does not have a session
        const existingRequestIds = new Set(data.map(s => s.swap_request_id));
        let createdNewSession = false;

        for (const req of approvedRequests) {
          if (!existingRequestIds.has(req.id)) {
            const roomId = `room-${Math.random().toString(36).substr(2, 9)}`;
            const sessionLink = `https://meet.jit.si/SkillSwap-${roomId}`;
            
            await sessionService.createSession({
              room_id: roomId,
              learner_id: req.sender_id,
              mentor_id: req.receiver_id,
              swap_request_id: req.id,
              session_link: sessionLink,
              teaching_skill: req.skill_wanted,
              learning_skill: req.skill_offered,
              status: 'scheduled'
            });
            createdNewSession = true;
          }
        }

        // Refetch sessions if any were created
        if (createdNewSession) {
          data = await sessionService.fetchSessions(profile.id);
        }

        setSessions(data);
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [profile, isMock]);

  if (!profile) return null;

  // Filter sessions based on tab
  const filteredSessions = sessions.filter((session) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return session.status === 'active';
    if (activeTab === 'upcoming') return session.status === 'scheduled';
    if (activeTab === 'completed') return session.status === 'completed';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
            Active Now
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Completed
          </span>
        );
      case 'expired':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-550/10 text-gray-400 border border-gray-700/30">
            Expired
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-gray-900 dark:text-white">
            My Learning Sessions
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Track, start, and review your peer-to-peer learning swaps.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-150 dark:border-slate-800/80 overflow-x-auto pb-0.5 scrollbar-none">
        {([
          { id: 'all', label: 'All Sessions' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'active', label: 'Active Sessions' },
          { id: 'completed', label: 'Completed' }
        ] as const).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap -mb-0.5 ${
                isActive
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-2xl p-5 h-44 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/6"></div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded w-full"></div>
              <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900/40 border border-dashed border-gray-200 dark:border-slate-800 rounded-3xl space-y-3.5 max-w-lg mx-auto">
          <Inbox className="w-12 h-12 text-primary-500 mx-auto opacity-40" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-gray-800 dark:text-slate-200">No sessions found</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              {activeTab === 'all'
                ? "You haven't participated in any swap sessions yet. Set up a swap request to get started!"
                : `You don't have any ${activeTab} sessions right now.`}
            </p>
          </div>
          {activeTab === 'all' && (
            <button
              onClick={() => navigate('/browse')}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md shadow-primary-500/10"
            >
              Discover Swappers
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSessions.map((session) => {
            const isUserMentor = session.mentor_id === profile.id;
            const partner = isUserMentor ? session.learner : session.mentor;
            const partnerName = partner?.full_name || partner?.email?.split('@')[0] || 'Learning Partner';

            return (
              <div
                key={session.id}
                className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Status & Skill Headers */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary-500">
                      {isUserMentor ? 'Teaching Role' : 'Learning Role'}
                    </span>
                    <h3 className="font-heading font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                      {session.teaching_skill}
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-500 dark:text-slate-400 font-medium">
                        {session.learning_skill}
                      </span>
                    </h3>
                  </div>
                  {getStatusBadge(session.status)}
                </div>

                {/* Partner Details */}
                <div className="flex items-center space-x-3 bg-gray-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 font-bold dark:bg-primary-900/50 dark:text-primary-300 flex items-center justify-center overflow-hidden shrink-0">
                    {partner?.avatar_url ? (
                      <img src={partner.avatar_url} alt={partnerName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-gray-800 dark:text-slate-200 truncate">
                      {partnerName}
                    </h4>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      {isUserMentor ? 'Your Learner' : 'Your Mentor'}
                    </p>
                  </div>
                </div>

                {/* Session details */}
                <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800/80 pt-3">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {new Date(session.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  {session.status === 'completed' && session.duration_seconds && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{Math.round(session.duration_seconds / 60)} mins</span>
                    </div>
                  )}

                  {session.status === 'completed' && session.mentor_rating && (
                    <div className="flex items-center space-x-0.5 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span className="font-bold text-xs">{session.mentor_rating}</span>
                    </div>
                  )}
                </div>

                {/* Join button */}
                <button
                  onClick={() => navigate(`/session/${session.room_id}`)}
                  className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-primary-500/10 group-hover:shadow-lg transition-all"
                >
                  <Video className="w-4 h-4" />
                  <span>
                    {session.status === 'completed'
                      ? 'View Summary'
                      : session.status === 'active'
                      ? 'Join Session'
                      : 'Open Dashboard'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MySessionsPage;
