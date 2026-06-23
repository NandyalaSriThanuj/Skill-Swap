import React from 'react';
import type { Profile } from '../types';
import { ArrowRight, BookOpen, GraduationCap, User, MapPin, ShieldCheck } from 'lucide-react';

interface SkillCardProps {
  profile: Profile;
  onSelectSwap: (targetProfile: Profile) => void;
  isCurrentUser: boolean;
  verifiedSkills?: string[];
}

export const SkillCard: React.FC<SkillCardProps> = ({ profile, onSelectSwap, isCurrentUser, verifiedSkills = [] }) => {
  return (
    <div className="relative flex flex-col justify-between bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 hover:border-primary-500/20 dark:hover:border-primary-500/30 transition-all duration-300">
      
      {/* Top Section: User Info */}
      <div>
        <div className="flex items-start space-x-4 mb-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name || 'User'}
              className="w-12 h-12 rounded-full border-2 border-primary-100 dark:border-slate-800 object-cover bg-gray-50"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-slate-800 text-primary-500 flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {profile.full_name || 'Anonymous User'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
              @{profile.username || 'user'}
            </p>
            {profile.location && (
              <p className="flex items-center text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                <MapPin className="w-3 h-3 mr-0.5" />
                {profile.location}
              </p>
            )}
          </div>
          {isCurrentUser ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200">
              You
            </span>
          ) : (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
              profile.availability === 'available'
                ? 'bg-emerald-50/50 border-emerald-250 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400'
                : profile.availability === 'busy'
                ? 'bg-amber-50/50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400'
                : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                profile.availability === 'available'
                  ? 'bg-emerald-500 animate-pulse'
                  : profile.availability === 'busy'
                  ? 'bg-amber-500'
                  : 'bg-gray-400'
              }`}></span>
              {profile.availability === 'available' ? 'Available' : profile.availability === 'busy' ? 'Busy' : 'Offline'}
            </span>
          )}
        </div>

        {/* Bio */}
        <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-3 mb-6 min-h-[60px]">
          {profile.bio || "This user hasn't added a bio yet."}
        </p>

        {/* Skills Teach Grid */}
        <div className="space-y-4 mb-6">
          <div>
            <span className="flex items-center text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2">
              <GraduationCap className="w-4 h-4 mr-1.5" />
              Can Teach
            </span>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills_teach && profile.skills_teach.length > 0 ? (
                profile.skills_teach.map((skill, idx) => {
                  const isVerified = verifiedSkills.some(
                    v => v.toLowerCase() === skill.toLowerCase()
                  );
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isVerified
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-250 dark:border-emerald-900/40 shadow-sm shadow-emerald-500/5'
                          : 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 border-primary-100/30 dark:border-primary-950/50'
                      }`}
                    >
                      {isVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mr-1 shrink-0" />
                      )}
                      <span>{skill}</span>
                    </span>
                  );
                })
              ) : (
                <span className="text-xs text-gray-400 dark:text-slate-500 italic">No skills listed yet</span>
              )}
            </div>
          </div>

          {/* Skills Learn Grid */}
          <div>
            <span className="flex items-center text-xs font-semibold uppercase tracking-wider text-secondary-600 dark:text-secondary-400 mb-2">
              <BookOpen className="w-4 h-4 mr-1.5" />
              Wants to Learn
            </span>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills_learn && profile.skills_learn.length > 0 ? (
                profile.skills_learn.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary-50 dark:bg-secondary-950/30 text-secondary-700 dark:text-secondary-300 border border-secondary-100/30 dark:border-secondary-950/50"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 dark:text-slate-500 italic">No skills listed yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {!isCurrentUser ? (
        <button
          onClick={() => onSelectSwap(profile)}
          disabled={!profile.skills_teach?.length || !profile.skills_learn?.length}
          className="flex items-center justify-center space-x-2 w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold text-sm rounded-xl hover:shadow-lg hover:shadow-primary-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
        >
          <span>Request Swap</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <span className="block text-center w-full mt-2 py-2.5 px-4 text-xs font-medium text-gray-400 bg-gray-50 dark:bg-slate-800/50 dark:text-slate-500 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
          Your Card
        </span>
      )}
    </div>
  );
};
export default SkillCard;
