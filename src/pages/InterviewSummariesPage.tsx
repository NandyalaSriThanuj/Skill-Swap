import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { qualificationService } from '../lib/qualificationService';
import type { QualificationSession } from '../types';
import { Bot, ArrowRight, Clock, Award, ShieldCheck, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const getBadgeStyle = (badgeName: string) => {
  switch (badgeName) {
    case 'Expert Mentor':
      return {
        bg: 'bg-amber-500/5',
        border: 'border-amber-500/30',
        text: 'text-amber-600 dark:text-amber-400',
      };
    case 'Verified Mentor':
      return {
        bg: 'bg-emerald-500/5',
        border: 'border-emerald-500/30',
        text: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'Community Mentor':
      return {
        bg: 'bg-blue-500/5',
        border: 'border-blue-500/30',
        text: 'text-blue-600 dark:text-blue-400',
      };
    default:
      return {
        bg: 'bg-rose-500/5',
        border: 'border-rose-500/30',
        text: 'text-rose-600 dark:text-rose-455',
      };
  }
};

export const InterviewSummariesPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [completedSessions, setCompletedSessions] = useState<QualificationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      qualificationService.getUserSessions(profile.id).then((sessions) => {
        const completed = sessions.filter(s => s.status === 'passed' || s.status === 'failed');
        const sorted = [...completed].sort((a, b) => {
          return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
        });
        setCompletedSessions(sorted);
        setLoading(false);
      }).catch((err) => {
        console.error("Failed to fetch sessions for summaries:", err);
        setLoading(false);
      });
    }
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary-500" />
            Interview Summaries
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            Access the detailed AI evaluation reports, strengths, and weaknesses for your completed skill assessments at any time.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : completedSessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {completedSessions.map((session) => {
            const isPassed = session.status === 'passed';
            const badgeStyle = getBadgeStyle(session.badge || (isPassed ? 'Verified Mentor' : 'Not Eligible'));
            const dateStr = session.updated_at ? new Date(session.updated_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : 'N/A';

            return (
              <div 
                key={session.id} 
                className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-6 rounded-2xl flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all hover:border-primary-500/10 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-base text-gray-900 dark:text-white truncate">
                        {session.skill_name}
                      </h4>
                      <span className="text-[10px] text-gray-400 dark:text-slate-550 block">
                        Completed on {dateStr}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                      {session.badge || (isPassed ? 'Verified Mentor' : 'Not Eligible')}
                    </span>
                  </div>

                  <p className="text-xs text-gray-650 dark:text-slate-350 line-clamp-3 leading-relaxed min-h-[48px]">
                    {session.report?.summary || session.recommendation || session.feedback || 'No summary text available.'}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-gray-205 dark:border-slate-800/80 pt-3.5 mt-1.5">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Score</span>
                      <span className="text-sm font-black text-gray-905 dark:text-white">{session.score ?? 0}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/summary/${session.id}`)}
                    className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <span>View Full Summary</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-premium p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <Bot className="w-8 h-8 text-gray-300 dark:text-slate-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Interview Summaries Yet</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              You haven't completed any assessments yet. Complete a qualification assessment to see your summaries here!
            </p>
          </div>
          <Link
            to="/browse"
            className="mt-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold rounded-xl transition-colors inline-flex items-center space-x-2"
          >
            <span>Browse Skills to Assess</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};
export default InterviewSummariesPage;
