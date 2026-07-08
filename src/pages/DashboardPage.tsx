import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Profile, SwapRequest, LearningSession, QualificationSession } from '../types';
import { qualificationService } from '../lib/qualificationService';
import { 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Inbox, 
  Settings, 
  GraduationCap, 
  BookOpen, 
  Plus, 
  MessageCircle,
  HelpCircle,
  Video,
  Clock,
  Award,
  Play,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Star,
  Search,
  Bot
} from 'lucide-react';

const SKILL_MAP: Record<string, { category: string; filterGroup: string; difficulty: 'Beginner' | 'Intermediate' | 'Expert'; estTime: string; isTechnical: boolean }> = {
  // Programming Languages
  'python': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'java': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'c': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'c++': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'javascript': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'typescript': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'go': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'rust': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'kotlin': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'swift': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'php': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'ruby': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'dart': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'r': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'matlab': { category: 'Programming Languages', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },

  // Web Development
  'html': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Beginner', estTime: '20 mins', isTechnical: true },
  'css': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Beginner', estTime: '20 mins', isTechnical: true },
  'tailwind css': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'bootstrap': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Beginner', estTime: '20 mins', isTechnical: true },
  'react': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'angular': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'vue': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'next.js': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'nuxt.js': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'node.js': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'express.js': { category: 'Web Development', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },

  // Mobile Development
  'flutter': { category: 'Mobile Development', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'react native': { category: 'Mobile Development', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'android': { category: 'Mobile Development', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'ios': { category: 'Mobile Development', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },

  // Databases
  'mysql': { category: 'Databases', filterGroup: 'Database', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'postgresql': { category: 'Databases', filterGroup: 'Database', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'sql': { category: 'Databases', filterGroup: 'Database', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'mongodb': { category: 'Databases', filterGroup: 'Database', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'firebase': { category: 'Databases', filterGroup: 'Database', difficulty: 'Beginner', estTime: '20 mins', isTechnical: true },
  'supabase': { category: 'Databases', filterGroup: 'Database', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'redis': { category: 'Databases', filterGroup: 'Database', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'oracle': { category: 'Databases', filterGroup: 'Database', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },

  // Computer Science
  'data structures': { category: 'Computer Science', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'algorithms': { category: 'Computer Science', filterGroup: 'Programming', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'dbms': { category: 'Computer Science', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'operating systems': { category: 'Computer Science', filterGroup: 'Programming', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'computer networks': { category: 'Computer Science', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'oop': { category: 'Computer Science', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'software engineering': { category: 'Computer Science', filterGroup: 'Programming', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'system design': { category: 'Computer Science', filterGroup: 'Programming', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },

  // Artificial Intelligence
  'machine learning': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'deep learning': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'data science': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'nlp': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'computer vision': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'reinforcement learning': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'prompt engineering': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'generative ai': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'large language models': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'langchain': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'rag': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'ai agents': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'tensorflow': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'pytorch': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'scikit-learn': { category: 'Artificial Intelligence', filterGroup: 'AI', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },

  // Cloud & DevOps
  'aws': { category: 'Cloud & DevOps', filterGroup: 'Cloud', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'azure': { category: 'Cloud & DevOps', filterGroup: 'Cloud', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'google cloud': { category: 'Cloud & DevOps', filterGroup: 'Cloud', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'docker': { category: 'Cloud & DevOps', filterGroup: 'Cloud', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'kubernetes': { category: 'Cloud & DevOps', filterGroup: 'Cloud', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'git': { category: 'Cloud & DevOps', filterGroup: 'Cloud', difficulty: 'Beginner', estTime: '20 mins', isTechnical: true },
  'github': { category: 'Cloud & DevOps', filterGroup: 'Cloud', difficulty: 'Beginner', estTime: '20 mins', isTechnical: true },
  'jenkins': { category: 'Cloud & DevOps', filterGroup: 'Cloud', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'ci/cd': { category: 'Cloud & DevOps', filterGroup: 'Cloud', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'linux': { category: 'Cloud & DevOps', filterGroup: 'Cloud', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },

  // Cyber Security
  'ethical hacking': { category: 'Cyber Security', filterGroup: 'Cloud', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'network security': { category: 'Cyber Security', filterGroup: 'Cloud', difficulty: 'Intermediate', estTime: '20 mins', isTechnical: true },
  'penetration testing': { category: 'Cyber Security', filterGroup: 'Cloud', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'cryptography': { category: 'Cyber Security', filterGroup: 'Cloud', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },
  'digital forensics': { category: 'Cyber Security', filterGroup: 'Cloud', difficulty: 'Expert', estTime: '20 mins', isTechnical: true },

  // Design
  'ui design': { category: 'Design', filterGroup: 'Design', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'ux design': { category: 'Design', filterGroup: 'Design', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'figma': { category: 'Design', filterGroup: 'Design', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'adobe xd': { category: 'Design', filterGroup: 'Design', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'photoshop': { category: 'Design', filterGroup: 'Design', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'illustrator': { category: 'Design', filterGroup: 'Design', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'canva': { category: 'Design', filterGroup: 'Design', difficulty: 'Beginner', estTime: '15 mins', isTechnical: false },

  // Business
  'product management': { category: 'Business', filterGroup: 'Business', difficulty: 'Expert', estTime: '15 mins', isTechnical: false },
  'business analysis': { category: 'Business', filterGroup: 'Business', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'entrepreneurship': { category: 'Business', filterGroup: 'Business', difficulty: 'Expert', estTime: '15 mins', isTechnical: false },
  'project management': { category: 'Business', filterGroup: 'Business', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'finance': { category: 'Business', filterGroup: 'Business', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'marketing': { category: 'Business', filterGroup: 'Business', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },

  // Communication
  'public speaking': { category: 'Communication', filterGroup: 'Business', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'leadership': { category: 'Communication', filterGroup: 'Business', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'teaching': { category: 'Communication', filterGroup: 'Business', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'interview preparation': { category: 'Communication', filterGroup: 'Business', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'resume building': { category: 'Communication', filterGroup: 'Business', difficulty: 'Beginner', estTime: '15 mins', isTechnical: false },
  'time management': { category: 'Communication', filterGroup: 'Business', difficulty: 'Beginner', estTime: '15 mins', isTechnical: false },
  'critical thinking': { category: 'Communication', filterGroup: 'Business', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },

  // Creative Skills
  'photography': { category: 'Creative Skills', filterGroup: 'Creative', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'videography': { category: 'Creative Skills', filterGroup: 'Creative', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'video editing': { category: 'Creative Skills', filterGroup: 'Creative', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'graphic design': { category: 'Creative Skills', filterGroup: 'Creative', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'animation': { category: 'Creative Skills', filterGroup: 'Creative', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'music': { category: 'Creative Skills', filterGroup: 'Creative', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'dance': { category: 'Creative Skills', filterGroup: 'Creative', difficulty: 'Beginner', estTime: '15 mins', isTechnical: false },
  'drawing': { category: 'Creative Skills', filterGroup: 'Creative', difficulty: 'Beginner', estTime: '15 mins', isTechnical: false },
  'painting': { category: 'Creative Skills', filterGroup: 'Creative', difficulty: 'Beginner', estTime: '15 mins', isTechnical: false },
  'storytelling': { category: 'Creative Skills', filterGroup: 'Creative', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },

  // Lifestyle Skills
  'cooking': { category: 'Lifestyle Skills', filterGroup: 'Lifestyle', difficulty: 'Beginner', estTime: '15 mins', isTechnical: false },
  'baking': { category: 'Lifestyle Skills', filterGroup: 'Lifestyle', difficulty: 'Beginner', estTime: '15 mins', isTechnical: false },
  'fitness': { category: 'Lifestyle Skills', filterGroup: 'Lifestyle', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false },
  'yoga': { category: 'Lifestyle Skills', filterGroup: 'Lifestyle', difficulty: 'Beginner', estTime: '15 mins', isTechnical: false },
  'meditation': { category: 'Lifestyle Skills', filterGroup: 'Lifestyle', difficulty: 'Beginner', estTime: '15 mins', isTechnical: false },
  'nutrition': { category: 'Lifestyle Skills', filterGroup: 'Lifestyle', difficulty: 'Intermediate', estTime: '15 mins', isTechnical: false }
};

const getSkillDetails = (skillName: string) => {
  const normalized = skillName.trim().toLowerCase();
  if (SKILL_MAP[normalized]) {
    return SKILL_MAP[normalized];
  }
  
  // Try to match partial names
  for (const [key, val] of Object.entries(SKILL_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val;
    }
  }

  // Fallback for custom user skills
  return {
    category: 'General Skill',
    filterGroup: 'Programming',
    difficulty: 'Intermediate' as const,
    estTime: '15 mins',
    isTechnical: true
  };
};

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

export const DashboardPage: React.FC = () => {
  const { profile, isMock } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [activeSessions, setActiveSessions] = useState<LearningSession[]>([]);
  const [qualSessions, setQualSessions] = useState<QualificationSession[]>([]);
  const [qualLoading, setQualLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  useEffect(() => {
    const loadMatchesAndRequests = async () => {
      if (!profile) return;

      // Fetch qualification sessions
      try {
        const sessions = await qualificationService.getUserSessions(profile.id);
        setQualSessions(sessions);
      } catch (err) {
        console.error('Error loading qualifications:', err);
      }

      if (isMock) {
        // --- Mock Fetch ---
        const allProfiles: Profile[] = JSON.parse(localStorage.getItem('skillswap-mock-profiles') || '[]');
        const otherProfiles = allProfiles.filter(p => p.id !== profile.id);

        const matched = otherProfiles.filter(other => {
          const teachesWhatIWant = other.skills_teach.some(skill => 
            profile.skills_learn.map(s => s.toLowerCase()).includes(skill.toLowerCase())
          );
          const wantsWhatITeach = other.skills_learn.some(skill => 
            profile.skills_teach.map(s => s.toLowerCase()).includes(skill.toLowerCase())
          );
          return teachesWhatIWant || wantsWhatITeach;
        });
        setMatches(matched.slice(0, 3));

        const allRequests: SwapRequest[] = JSON.parse(localStorage.getItem('skillswap-mock-requests') || '[]');
        const userRequests = allRequests.filter(req => req.sender_id === profile.id || req.receiver_id === profile.id);
        
        const hydrated = userRequests.map(req => {
          const sender = allProfiles.find(p => p.id === req.sender_id);
          const receiver = allProfiles.find(p => p.id === req.receiver_id);
          return {
            ...req,
            sender_profile: sender,
            receiver_profile: receiver
          };
        });
        setRequests(hydrated.slice(0, 4));

        // Load active sessions
        const allSessions: LearningSession[] = JSON.parse(localStorage.getItem('skillswap-mock-sessions') || '[]');
        const userSessions = allSessions.filter(
          s => (s.learner_id === profile.id || s.mentor_id === profile.id) && 
               s.status === 'active' && 
               new Date(s.expires_at).getTime() > Date.now()
        );
        setActiveSessions(userSessions);
      } else {
        // --- Real Supabase Fetch ---
        try {
          // Fetch suggestions
          const { data: allProfiles, error: profErr } = await supabase
            .from('profiles')
            .select('*')
            .neq('id', profile.id);

          if (!profErr && allProfiles) {
            const matched = (allProfiles as Profile[]).filter(other => {
              const teachesWhatIWant = other.skills_teach.some(skill => 
                profile.skills_learn.map(s => s.toLowerCase()).includes(skill.toLowerCase())
              );
              const wantsWhatITeach = other.skills_learn.some(skill => 
                profile.skills_teach.map(s => s.toLowerCase()).includes(skill.toLowerCase())
              );
              return teachesWhatIWant || wantsWhatITeach;
            });
            setMatches(matched.slice(0, 3));
          }

          // Fetch recent requests
          const { data: requestsData, error: reqErr } = await supabase
            .from('swap_requests')
            .select('*, sender_profile:profiles!sender_id(*), receiver_profile:profiles!receiver_id(*)')
            .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
            .limit(4);

          if (!reqErr && requestsData) {
            setRequests(requestsData as SwapRequest[]);
          }

          // Fetch active sessions
          const { data: sessionsData, error: sessErr } = await supabase
            .from('learning_sessions')
            .select('*')
            .or(`learner_id.eq.${profile.id},mentor_id.eq.${profile.id}`)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString());

          if (!sessErr && sessionsData) {
            setActiveSessions(sessionsData as LearningSession[]);
          }
        } catch (err) {
          console.error('Error fetching dashboard data from Supabase:', err);
        }
      }
    };

    loadMatchesAndRequests();
  }, [profile, isMock]);

  if (!profile) return null;

  const handleStartAssessment = (skillName: string) => {
    if (!profile) return;
    navigate(`/assessment-setup/${encodeURIComponent(skillName)}`);
  };


  const getStatusBadge = (status: SwapRequest['status']) => {
    const baseClass = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider";
    switch (status) {
      case 'approved':
        return <span className={`${baseClass} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400`}>Approved</span>;
      case 'rejected':
        return <span className={`${baseClass} bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400`}>Rejected</span>;
      case 'completed':
        return <span className={`${baseClass} bg-primary-100 text-primary-800 dark:bg-primary-950/30 dark:text-primary-400`}>Completed</span>;
      default:
        return <span className={`${baseClass} bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400`}>Pending</span>;
    }
  };

  // Check if profile is empty/needs setup
  const needsProfileSetup = profile.skills_teach.length === 0 && profile.skills_learn.length === 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -z-1"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white">
              {getGreeting()}, {profile.full_name || 'Swapper'}!
            </h1>
            <p className="text-primary-100 text-sm sm:text-base max-w-xl">
              Check out matches in your area, respond to swap proposals, or update your teaching portfolio.
            </p>
          </div>
          <Link
            to="/profile"
            className="self-start md:self-auto inline-flex items-center space-x-2 px-5 py-2.5 bg-white text-primary-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            <Settings className="w-4 h-4" />
            <span>Manage Portfolio</span>
          </Link>
        </div>
      </div>

      {/* Active Learning Rooms Banner */}
      {activeSessions.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 gap-4">
            {activeSessions.map(session => (
              <div 
                key={session.id} 
                className="relative bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 dark:border-emerald-500/30 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/25 shrink-0 animate-pulse-slow">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-950 dark:text-white text-base flex items-center">
                      Your Swapping Room is Active!
                      <span className="ml-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white animate-pulse">
                        LIVE NOW
                      </span>
                    </h3>
                    <p className="text-xs text-gray-650 dark:text-slate-300 mt-1 max-w-xl">
                      A private workspace has been provisioned. Connect with your partner for live video lessons, real-time code reviews, and collaborative notes.
                    </p>
                    <div className="flex items-center space-x-3 mt-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Expires in: {new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/session/${session.room_id}`)}
                  className="inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-500/15 cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Video className="w-4 h-4" />
                  <span>Join Session</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding Banner if empty profile */}
      {needsProfileSetup && (
        <div className="bg-amber-50 dark:bg-amber-950/15 border border-amber-250 dark:border-amber-900/50 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse-slow">
          <div className="flex items-start space-x-3.5">
            <Sparkles className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-gray-950 dark:text-white text-base">Setup your Skill Portfolio!</h3>
              <p className="text-sm text-gray-650 dark:text-slate-400 mt-1">
                You haven't added any skills to teach or learn. Add them to unlock smart matches with the community.
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Skills</span>
          </Link>
        </div>
      )}

      {/* AI Qualification Hub */}
      {(() => {
        // Calculate statistics dynamically
        const verifiedCount = profile.skills_teach.filter(skillName => {
          const session = qualSessions.find(s => s.skill_name.toLowerCase() === skillName.toLowerCase());
          return session?.status === 'passed';
        }).length;

        const pendingCount = profile.skills_teach.filter(skillName => {
          const session = qualSessions.find(s => s.skill_name.toLowerCase() === skillName.toLowerCase());
          return session?.status === 'in_progress' || session?.status === 'pending';
        }).length;

        const failedCount = profile.skills_teach.filter(skillName => {
          const session = qualSessions.find(s => s.skill_name.toLowerCase() === skillName.toLowerCase());
          return session?.status === 'failed';
        }).length;

        const passedSessions = qualSessions.filter(s => 
          s.status === 'passed' && 
          profile.skills_teach.some(st => st.toLowerCase() === s.skill_name.toLowerCase()) && 
          s.score !== undefined
        );
        const avgScore = passedSessions.length > 0
          ? Math.round(passedSessions.reduce((sum, s) => sum + (s.score || 0), 0) / passedSessions.length)
          : 0;

        // Perform dynamic filtering based on search query and active filter tabs
        const filteredSkills = profile.skills_teach.filter(skillName => {
          const details = getSkillDetails(skillName);
          const session = qualSessions.find(
            s => s.skill_name.toLowerCase() === skillName.toLowerCase()
          );
          const status = session ? session.status : 'not_started';

          // 1. Search Query filter (matches skill name or category)
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const matchesName = skillName.toLowerCase().includes(query);
            const matchesCategory = details.category.toLowerCase().includes(query);
            if (!matchesName && !matchesCategory) return false;
          }

          // 2. Category Dropdown Filter
          if (selectedCategory !== 'All') {
            if (selectedCategory === 'Programming') {
              const isProg = ['programming languages', 'web development', 'mobile development', 'computer science'].includes(details.filterGroup.toLowerCase()) ||
                             ['programming languages', 'web development', 'mobile development', 'computer science'].includes(details.category.toLowerCase());
              if (!isProg) return false;
            } else {
              if (details.filterGroup.toLowerCase() !== selectedCategory.toLowerCase()) return false;
            }
          }

          // 3. Status Dropdown Filter
          if (selectedStatus !== 'All') {
            if (selectedStatus === 'Certified') {
              if (status !== 'passed') return false;
            } else if (selectedStatus === 'Pending') {
              if (status !== 'in_progress' && status !== 'pending') return false;
            } else if (selectedStatus === 'Failed') {
              if (status !== 'failed') return false;
            }
          }

          return true;
        });

        return (
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm space-y-4 transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="font-heading font-extrabold text-2xl text-gray-905 dark:text-white flex items-center">
                  <Award className="w-6 h-6 mr-2 text-primary-500 animate-pulse-slow" />
                  AI Skill Certification Hub
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Complete automated AI-assessor interviews to earn verified badges and highlight your teaching expertise.
                </p>
              </div>
              
              {profile.skills_teach.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-60">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search skill..."
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all"
                    />
                  </div>

                  {/* Category Filter Dropdown */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-750 dark:text-slate-200 transition-all cursor-pointer font-bold"
                  >
                    <option value="All" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">All Categories</option>
                    <option value="Programming" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Programming</option>
                    <option value="AI" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Artificial Intelligence</option>
                    <option value="Cloud" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Cloud & DevOps</option>
                    <option value="Database" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Databases</option>
                    <option value="Design" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Design</option>
                    <option value="Business" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Business</option>
                    <option value="Creative" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Creative Skills</option>
                    <option value="Lifestyle" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Lifestyle</option>
                  </select>

                  {/* Status Filter Dropdown */}
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-gray-750 dark:text-slate-200 transition-all cursor-pointer font-bold"
                  >
                    <option value="All" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">All Statuses</option>
                    <option value="Certified" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Certified</option>
                    <option value="Pending" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Pending</option>
                    <option value="Failed" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Failed</option>
                  </select>
                </div>
              )}
            </div>

            {/* Dashboard Stats */}
            {profile.skills_teach.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-3 bg-gray-50/50 dark:bg-slate-800/20 rounded-xl border border-gray-100 dark:border-slate-800/80">
                <div className="text-center p-1.5 space-y-0.5">
                  <div className="text-lg font-black text-gray-900 dark:text-white">{profile.skills_teach.length}</div>
                  <div className="text-[9px] text-gray-450 dark:text-slate-500 font-bold uppercase tracking-wider">Total Skills</div>
                </div>
                <div className="text-center p-1.5 border-l border-gray-200/60 dark:border-slate-800 space-y-0.5">
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{verifiedCount}</div>
                  <div className="text-[9px] text-gray-450 dark:text-slate-500 font-bold uppercase tracking-wider">Verified Skills</div>
                </div>
                <div className="text-center p-1.5 border-l border-gray-200/60 dark:border-slate-800 space-y-0.5">
                  <div className="text-lg font-black text-blue-500 dark:text-blue-400">{pendingCount}</div>
                  <div className="text-[9px] text-gray-450 dark:text-slate-500 font-bold uppercase tracking-wider">Pending</div>
                </div>
                <div className="text-center p-1.5 border-l border-gray-200/60 dark:border-slate-800 space-y-0.5">
                  <div className="text-lg font-black text-red-500 dark:text-red-400">{failedCount}</div>
                  <div className="text-[9px] text-gray-450 dark:text-slate-500 font-bold uppercase tracking-wider">Failed</div>
                </div>
                <div className="text-center p-1.5 border-l border-gray-200/60 dark:border-slate-800 space-y-0.5">
                  <div className="text-lg font-black text-primary-500 dark:text-primary-400">{verifiedCount}</div>
                  <div className="text-[9px] text-gray-450 dark:text-slate-500 font-bold uppercase tracking-wider">Certificates</div>
                </div>
                <div className="text-center p-1.5 border-l border-gray-200/60 dark:border-slate-800 space-y-0.5">
                  <div className="text-lg font-black text-purple-600 dark:text-purple-400">
                    {avgScore > 0 ? `${avgScore}%` : '0%'}
                  </div>
                  <div className="text-[9px] text-gray-450 dark:text-slate-500 font-bold uppercase tracking-wider">Avg Score</div>
                </div>
              </div>
            )}



            {/* List of dynamic teaching skills */}
            {(() => {
              if (profile.skills_teach.length === 0) {
                return (
                  <div className="p-8 bg-gray-50/50 dark:bg-slate-805/45 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-center space-y-3 max-w-md mx-auto">
                    <HelpCircle className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-550 dark:text-slate-400 max-w-sm mx-auto">
                      You haven't added any teaching skills yet. Add skills to your portfolio to become a verified mentor.
                    </p>
                    <button
                      onClick={() => navigate('/profile')}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-primary-500 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-primary-650 transition-all cursor-pointer"
                    >
                      <span>Manage Skills</span>
                    </button>
                  </div>
                );
              }

              if (filteredSkills.length === 0) {
                return (
                  <div className="p-8 bg-gray-50/50 dark:bg-slate-850/10 border border-dashed border-gray-205 dark:border-slate-800 rounded-2xl text-center space-y-2 max-w-md mx-auto">
                    <HelpCircle className="w-8 h-8 text-gray-305 mx-auto" />
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      No skills match your search or filter setting. Try resetting.
                    </p>
                    <button
                      onClick={() => { setSearchQuery(''); setActiveFilter('All'); }}
                      className="text-xs font-bold text-primary-500 hover:text-primary-600 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
                  {filteredSkills.map(skillName => {
                    const details = getSkillDetails(skillName);
                    const session = qualSessions.find(
                      s => s.skill_name.toLowerCase() === skillName.toLowerCase()
                    );
                    const status = session ? session.status : 'not_started';
                    const difficulty = details.difficulty;
                    const estTime = details.estTime;

                    const diffBadgeColor = 
                      difficulty === 'Expert'
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200/30'
                        : difficulty === 'Intermediate'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/30'
                        : 'bg-emerald-50 text-emerald-705 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-150/30';

                    return (
                      <div
                        key={skillName}
                        className="card-premium relative p-4 flex flex-col justify-between group hover:-translate-y-0.5 hover:shadow-lg hover:border-primary-500/20 dark:hover:border-primary-500/30 transition-all duration-300 min-h-[170px]"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-500/5 to-secondary-500/5 rounded-bl-full -z-1 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {skillName}
                              </h4>
                              <p className="text-[10px] text-primary-500/80 dark:text-primary-400/80 font-bold uppercase tracking-wider mt-0.5">
                                {details.category}
                              </p>
                            </div>
                            
                            {/* Verification Badge */}
                            {status === 'passed' && (() => {
                              const badgeName = session?.badge || 'Verified Mentor';
                              if (badgeName === 'Expert Mentor') {
                                return (
                                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-200/50 dark:border-amber-900/50 shrink-0">
                                    <Trophy className="w-5 h-5" />
                                  </div>
                                );
                              } else if (badgeName === 'Community Mentor') {
                                return (
                                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200/50 dark:border-blue-900/50 shrink-0">
                                    <Star className="w-5 h-5" />
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/50 dark:border-emerald-900/50 shrink-0">
                                    <ShieldCheck className="w-5 h-5" />
                                  </div>
                                );
                              }
                            })()}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold border ${diffBadgeColor}`}>
                              {difficulty}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-gray-100/80 text-gray-600 dark:bg-slate-800 dark:text-slate-300 border border-gray-200/50 dark:border-slate-700/50">
                              <Clock className="w-3 h-3 mr-1 opacity-70" />
                              {estTime}
                            </span>
                            
                            {status === 'passed' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50">
                                Certified
                              </span>
                            )}
                            {status === 'failed' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200/50 dark:border-red-900/50">
                                Failed
                              </span>
                            )}
                            {status === 'in_progress' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50 animate-pulse">
                                In Progress
                              </span>
                            )}
                            {status === 'pending' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50">
                                Ready
                              </span>
                            )}
                            {status === 'not_started' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400 border border-gray-200/50 dark:border-slate-700/50">
                                Not Started
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 leading-relaxed line-clamp-2">
                            {status === 'passed'
                              ? `Qualified as Verified Mentor (${session?.score || 0}%). View certificate details and feedback.`
                              : status === 'failed'
                              ? `Assessment completed. Score: ${session?.score || 0}%. Review report and try again.`
                              : status === 'in_progress' || status === 'pending'
                              ? 'Assessment voice interview has been initialized. Resume to complete.'
                              : 'Take a voice-based assessment to certify your teaching skills.'}
                          </p>
                        </div>
     
                        {/* Action buttons */}
                        <div className="pt-4 mt-auto border-t border-gray-100 dark:border-slate-800">
                          {status === 'passed' ? (
                            <button
                              onClick={() => navigate(`/assessment/${session?.id}`)}
                              className="w-full py-2.5 bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-center text-sm font-bold rounded-xl cursor-pointer flex items-center justify-center space-x-2 transition-colors"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>View Certificate</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartAssessment(skillName)}
                              disabled={qualLoading}
                              className={`w-full py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                                status === 'failed'
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'
                                  : status === 'in_progress' || status === 'pending'
                                  ? 'btn-primary shadow-blue-500/25'
                                  : 'btn-primary shadow-primary-500/25'
                              }`}
                            >
                              {status === 'failed' ? (
                                <>
                                  <RotateCcw className="w-4 h-4" />
                                  <span>Retry Assessment</span>
                                </>
                              ) : status === 'in_progress' || status === 'pending' ? (
                                <>
                                  <Play className="w-4 h-4 fill-current animate-pulse" />
                                  <span>Resume Assessment</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  <span>Start Assessment</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* Grid: Stats and Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-primary-50 dark:bg-primary-950/30 text-primary-500 rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{profile.skills_teach.length}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Skills You Teach</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-secondary-50 dark:bg-secondary-950/30 text-secondary-500 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{profile.skills_learn.length}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Skills You Want</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-accent-500/10 text-accent-500 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {requests.filter(r => r.status === 'approved').length}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Active Swaps</div>
          </div>
        </div>
      </div>



      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Matches & Suggestions (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-primary-500" />
              Smart Matching Suggestions
            </h2>
            <Link to="/browse" className="text-sm font-semibold text-primary-500 hover:text-primary-600 flex items-center">
              <span>View All</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {matches.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-6">
              {matches.map(match => {
                // Determine if it's a mutual (perfect) match
                const isMutualMatch = 
                  match.skills_teach.some(s => profile.skills_learn.includes(s)) &&
                  match.skills_learn.some(s => profile.skills_teach.includes(s));

                return (
                  <div 
                    key={match.id}
                    className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 hover:shadow-lg hover:border-primary-500/10 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Link to={`/profile/${match.id}`} className="shrink-0 hover:opacity-85 transition-opacity">
                            <img
                              src={match.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${match.username}`}
                              alt={match.full_name || 'User'}
                              className="w-10 h-10 rounded-full border border-gray-100 dark:border-slate-855 object-cover"
                            />
                          </Link>
                          <div>
                            <Link to={`/profile/${match.id}`} className="hover:text-primary-500 transition-colors">
                              <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[120px]">
                                {match.full_name}
                              </h4>
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">@{match.username}</p>
                          </div>
                        </div>
                        {isMutualMatch ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-300">
                            Perfect Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                            Potential Swap
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-slate-350 line-clamp-2 mb-4 min-h-[32px]">
                        {match.bio || "No bio available."}
                      </p>

                      <div className="space-y-2 mb-4 text-xs">
                        <div>
                          <span className="font-semibold text-primary-500 mr-1.5">Teaches:</span>
                          <span className="text-gray-650 dark:text-slate-300">{match.skills_teach.slice(0, 2).join(', ')}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-secondary-500 mr-1.5">Wants:</span>
                          <span className="text-gray-650 dark:text-slate-300">{match.skills_learn.slice(0, 2).join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/browse', { state: { requestProfile: match } })}
                      className="w-full py-2 bg-gray-50 hover:bg-primary-500 hover:text-white dark:bg-slate-800 dark:hover:bg-primary-600 text-gray-750 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
                    >
                      Propose Swap
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-8 rounded-2xl text-center space-y-4 shadow-sm">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto" />
              <div>
                <h3 className="font-bold text-base text-gray-800 dark:text-white">No matches found yet</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Add more detailed skills to teach and learn in your profile to find better matches in the network.
                </p>
              </div>
              <Link
                to="/profile"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-primary-500 text-white font-bold text-xs rounded-xl"
              >
                <span>Edit Profile</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity / Swap Requests (1/3) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white flex items-center">
              <Inbox className="w-5 h-5 mr-2 text-primary-500" />
              Swap Requests
            </h2>
            <Link to="/requests" className="text-sm font-semibold text-primary-500 hover:text-primary-600">
              Manage
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            {requests.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-800 space-y-4">
                {requests.map((req, idx) => {
                  const isIncoming = req.receiver_id === profile.id;
                  const targetProfile = isIncoming ? req.sender_profile : req.receiver_profile;

                  return (
                    <div key={req.id} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} flex items-start justify-between gap-3`}>
                      <div className="flex items-start space-x-3 min-w-0">
                        <img
                          src={targetProfile?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${targetProfile?.username}`}
                          alt={targetProfile?.full_name || 'User'}
                          className="w-9 h-9 rounded-full"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {targetProfile?.full_name}
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-slate-450 mt-0.5 line-clamp-1">
                            {isIncoming ? 'Offered' : 'Wanted'}: <span className="font-semibold">{req.skill_offered}</span>
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {new Date(req.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {getStatusBadge(req.status)}
                        {req.status === 'approved' && (
                          <Link
                            to="/requests"
                            className="inline-flex items-center text-[10px] font-bold text-primary-500 hover:text-primary-650"
                          >
                            <MessageCircle className="w-3 h-3 mr-0.5" />
                            Chat
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Inbox className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-500 dark:text-slate-400">No recent swap proposals.</p>
                <Link
                  to="/browse"
                  className="inline-flex text-xs font-bold text-primary-500 hover:text-primary-600"
                >
                  Browse Swappers
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
export default DashboardPage;
