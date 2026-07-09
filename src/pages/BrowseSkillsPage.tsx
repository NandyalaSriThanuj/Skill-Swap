import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Profile, SwapRequest, QualificationSession } from '../types';
import { SkillCard } from '../components/SkillCard';
import { qualificationService } from '../lib/qualificationService';
import { supabase } from '../lib/supabaseClient';
import { 
  Search, 
  Sparkles, 
  Send, 
  X, 
  Compass,
  AlertCircle
} from 'lucide-react';

export const BrowseSkillsPage: React.FC = () => {
  const { profile, isMock } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [passedSessions, setPassedSessions] = useState<QualificationSession[]>([]);

  // Modal State
  const [selectedTargetProfile, setSelectedTargetProfile] = useState<Profile | null>(null);
  const [skillOffered, setSkillOffered] = useState('');
  const [skillWanted, setSkillWanted] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [modalSuccess, setModalSuccess] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const categories = ['All', 'Programming', 'Design & UX', 'Languages', 'Music & Art', 'Gardening & Crafts'];

  // Load all profiles
  useEffect(() => {
    const loadProfiles = async () => {
      if (isMock) {
        const allProfiles: Profile[] = JSON.parse(localStorage.getItem('skillswap-mock-profiles') || '[]');
        setProfiles(allProfiles);
      } else {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*');
          if (error) throw error;
          setProfiles(data as Profile[] || []);
        } catch (err) {
          console.error('Error loading profiles from Supabase:', err);
        }
      }

      try {
        const sessions = await qualificationService.getAllPassedSessions();
        setPassedSessions(sessions);
      } catch (err) {
        console.error('Error loading passed sessions:', err);
      }
    };

    loadProfiles();

    // Check if category was passed in URL query
    const catQuery = searchParams.get('category');
    if (catQuery) {
      // Find matching category label
      if (catQuery.includes('Design')) setSelectedCategory('Design & UX');
      else if (catQuery.includes('Program')) setSelectedCategory('Programming');
      else if (catQuery.includes('Language')) setSelectedCategory('Languages');
      else if (catQuery.includes('Music') || catQuery.includes('Art')) setSelectedCategory('Music & Art');
    }

    // Check if redirect state triggers a proposal modal directly
    const redirectState = location.state as any;
    if (redirectState?.requestProfile) {
      handleOpenRequestModal(redirectState.requestProfile);
    }
  }, [searchParams, location]);

  const handleOpenRequestModal = (targetProfile: Profile) => {
    setSelectedTargetProfile(targetProfile);
    // Auto-select first available skill offered and wanted
    if (targetProfile.skills_teach.length > 0) {
      setSkillOffered(targetProfile.skills_teach[0]);
    }
    if (profile && profile.skills_teach.length > 0) {
      setSkillWanted(profile.skills_teach[0]); // what current user can teach
    }
    setProposalMessage(`Hey ${targetProfile.full_name}, I saw that you can teach ${targetProfile.skills_teach[0] || 'your skills'} and would love to exchange it for ${profile?.skills_teach[0] || 'mine'}!`);
  };

  const handleCloseModal = () => {
    setSelectedTargetProfile(null);
    setModalSuccess(false);
    setModalError(null);
    setProposalMessage('');
  };

  const handleSubmitSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedTargetProfile) return;

    if (!skillOffered || !skillWanted) {
      setModalError('Please specify the skills to swap.');
      return;
    }

    if (isMock) {
      // Create swap request
      const newRequest: SwapRequest = {
        id: `req-${Math.random().toString(36).substr(2, 9)}`,
        sender_id: profile.id,
        receiver_id: selectedTargetProfile.id,
        skill_offered: skillWanted, // skill I will teach the other person
        skill_wanted: skillOffered, // skill the other person will teach me
        status: 'pending',
        message: proposalMessage,
        created_at: new Date().toISOString()
      };

      // Save mock request
      const allRequests: SwapRequest[] = JSON.parse(localStorage.getItem('skillswap-mock-requests') || '[]');
      allRequests.push(newRequest);
      localStorage.setItem('skillswap-mock-requests', JSON.stringify(allRequests));

      setModalSuccess(true);
      setTimeout(() => {
        handleCloseModal();
      }, 2000);
    } else {
      setLoading(true);
      setModalError(null);
      try {
        const { error } = await supabase.from('swap_requests').insert({
          sender_id: profile.id,
          receiver_id: selectedTargetProfile.id,
          skill_offered: skillWanted, // skill I will teach
          skill_wanted: skillOffered,  // skill I want to learn
          message: proposalMessage,
          status: 'pending'
        });

        if (error) throw error;

        setModalSuccess(true);
        setTimeout(() => {
          handleCloseModal();
        }, 2000);
      } catch (err: any) {
        console.error('Error creating swap request:', err);
        setModalError(err.message || 'Failed to submit proposal.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter logic
  const filteredProfiles = profiles.filter(p => {
    // Exclude current user
    if (profile && p.id === profile.id) return false;

    // Search query matches name, username, bio, teach list, or learn list
    const query = searchTerm.toLowerCase();
    const nameMatch = p.full_name?.toLowerCase().includes(query);
    const usernameMatch = p.username?.toLowerCase().includes(query);
    const bioMatch = p.bio?.toLowerCase().includes(query);
    const teachMatch = p.skills_teach.some(s => s.toLowerCase().includes(query));
    const learnMatch = p.skills_learn.some(s => s.toLowerCase().includes(query));

    const matchesSearch = !searchTerm || nameMatch || usernameMatch || bioMatch || teachMatch || learnMatch;

    // Category matches skills_teach
    let matchesCategory = true;
    if (selectedCategory !== 'All') {
      // Simplistic category mapping for mock data
      const categoryMapping: Record<string, string[]> = {
        'Programming': ['react', 'python', 'machine learning', 'sql', 'typescript', 'html/css', 'web development', 'javascript', 'node.js'],
        'Design & UX': ['figma', 'graphic design', 'ui/ux design', 'branding', 'illustrator'],
        'Languages': ['spanish', 'french', 'italian', 'content editing'],
        'Music & Art': ['acoustic guitar', 'music theory', 'piano', 'guitar'],
        'Gardening & Crafts': ['woodworking', 'organic gardening', 'cooking', 'gardening']
      };

      const validSkillsForCategory = categoryMapping[selectedCategory] || [];
      
      const teachesCategory = p.skills_teach.some(skill => 
        validSkillsForCategory.includes(skill.toLowerCase())
      );
      const learnsCategory = p.skills_learn.some(skill => 
        validSkillsForCategory.includes(skill.toLowerCase())
      );

      matchesCategory = teachesCategory || learnsCategory;
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Page Header */}
      <div className="text-center md:text-left space-y-2">
        <h1 className="font-heading font-extrabold text-3xl tracking-tight text-gray-900 dark:text-white">
          Discover Skills Exchange
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xl">
          Search for developers, designers, language speakers, and artists. Select a profile to propose a skill swap.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search skills, names, bio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500 transition-all dark:text-white"
          />
        </div>

        {/* Category Scroll Container */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none shrink-0 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/10'
                  : 'bg-white dark:bg-slate-900 text-gray-650 dark:text-slate-300 border-gray-150 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of cards */}
      {filteredProfiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((otherProfile) => {
            const userVerifiedSkills = passedSessions
              .filter(s => s.user_id === otherProfile.id)
              .map(s => s.skill_name);
            return (
              <SkillCard
                key={otherProfile.id}
                profile={otherProfile}
                onSelectSwap={handleOpenRequestModal}
                isCurrentUser={false}
                verifiedSkills={userVerifiedSkills}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-12 rounded-3xl text-center space-y-4 shadow-sm max-w-md mx-auto">
          <Compass className="w-12 h-12 text-gray-300 mx-auto animate-spin-slow" />
          <div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">No members matched your criteria</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Try modifying your search queries or selecting another category filter.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
            }}
            className="px-4 py-2 bg-primary-50 text-primary-600 font-bold text-xs rounded-xl"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Proposal Request Modal */}
      {selectedTargetProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full relative space-y-5">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div>
              <h2 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-primary-500" />
                Propose Skill Swap
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Pitch a mutual swap with <span className="font-bold">@{selectedTargetProfile.username}</span>.
              </p>
            </div>

            {modalSuccess ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center mx-auto">
                  <Send className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="font-extrabold text-emerald-700 dark:text-emerald-400">Proposal Sent!</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Redirecting back to swappers page...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitSwapRequest} className="space-y-4">
                {modalError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-2xl flex items-center space-x-2 text-xs">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Skill they teach -> Skill I learn */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Skill I Want to Learn (from them)
                  </label>
                  <select
                    value={skillOffered}
                    onChange={(e) => setSkillOffered(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
                  >
                    {selectedTargetProfile.skills_teach.map((skill, idx) => (
                      <option key={idx} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>

                {/* Skill I teach -> Skill they learn */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Skill I Will Teach (to them)
                  </label>
                  {profile && profile.skills_teach.length > 0 ? (
                    <select
                      value={skillWanted}
                      onChange={(e) => setSkillWanted(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
                    >
                      {profile.skills_teach.map((skill, idx) => (
                        <option key={idx} value={skill}>{skill}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                      You haven't listed any skills you can teach. You must go to your profile and add skills you teach before proposing a swap.
                    </div>
                  )}
                </div>

                {/* Pitch Message */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Swap Pitch Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    placeholder="Describe how you want to manage the swap, your availability, etc..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all dark:text-white"
                  />
                </div>

                {/* Buttons */}
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-white text-sm font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!profile || profile.skills_teach.length === 0}
                    className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Send Proposal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default BrowseSkillsPage;
