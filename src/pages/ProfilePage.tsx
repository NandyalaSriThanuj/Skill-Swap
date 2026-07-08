import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Profile, QualificationSession, SwapRequest } from '../types';
import { 
  User, 
  Sparkles, 
  Trash2, 
  Plus, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Save,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Activity,
  Camera,
  Loader2,
  Award,
  Calendar,
  Download,
  ShieldCheck,
  Check,
  ExternalLink,
  Edit,
  Star,
  Trophy,
  Video,
  ChevronRight,
  Send,
  MessageSquare,
  X,
  Languages
} from 'lucide-react';
import { qualificationService } from '../lib/qualificationService';
import { certificateService } from '../lib/certificateService';

const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  'Programming': [
    'React', 'TypeScript', 'Python', 'Tailwind CSS', 'Node.js', 'Machine Learning', 
    'JavaScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 
    'Kotlin', 'HTML', 'CSS', 'SQL', 'NoSQL', 'Git', 'Docker', 'Kubernetes', 
    'AWS', 'Android Development', 'iOS Development', 'Cyber Security', 'Blockchain'
  ],
  'Design & UX': [
    'Figma', 'UI/UX Design', 'Branding', 'Photoshop', 'Illustrator', 'Graphic Design', 
    'Web Design', 'Motion Graphics', '3D Modeling', 'Video Editing', 'Product Design', 
    'Logo Design', 'Interaction Design', 'Wireframing', 'Prototyping'
  ],
  'Languages': [
    'Spanish', 'French', 'English', 'German', 'Mandarin', 'Japanese', 'Korean', 
    'Italian', 'Portuguese', 'Russian', 'Arabic', 'Hindi', 'Telugu', 'Tamil'
  ],
  'Music & Art': [
    'Acoustic Guitar', 'Woodworking', 'Cooking', 'Piano', 'Singing', 'Drumming', 
    'Violin', 'Music Production', 'Painting', 'Sketching', 'Pottery', 'Gardening', 
    'Creative Writing', 'Public Speaking', 'Acting', 'Dancing'
  ]
};

const CATEGORY_COLORS: Record<string, string> = {
  'Programming': 'text-blue-400',
  'Design & UX': 'text-purple-400',
  'Languages': 'text-emerald-450',
  'Music & Art': 'text-pink-450'
};

export const ProfilePage: React.FC = () => {
  const { profile, updateProfile, uploadAvatar, isMock } = useAuth();
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if this is the owner's profile page
  const isOwner = !userId || userId === profile?.id;

  // Viewed profile state
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Form states for editing
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [availability, setAvailability] = useState<Profile['availability']>('available');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [teachSkills, setTeachSkills] = useState<string[]>([]);
  const [learnSkills, setLearnSkills] = useState<string[]>([]);

  // Skill select modal states
  const [isSkillSelectOpen, setIsSkillSelectOpen] = useState(false);
  const [skillSelectType, setSkillSelectType] = useState<'teach' | 'learn'>('teach');

  // Swap Request Modal States (when viewing public profile)
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [skillOffered, setSkillOffered] = useState('');
  const [skillWanted, setSkillWanted] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [modalSuccess, setModalSuccess] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qualSessions, setQualSessions] = useState<QualificationSession[]>([]);
  const [activeSwapsCount, setActiveSwapsCount] = useState(0);

  // Fetch viewed profile details
  useEffect(() => {
    const fetchProfileData = async () => {
      if (isOwner) {
        setViewedProfile(profile);
        return;
      }

      setProfileLoading(true);
      if (isMock) {
        const allProfiles: Profile[] = JSON.parse(localStorage.getItem('skillswap-mock-profiles') || '[]');
        const found = allProfiles.find(p => p.id === userId) || null;
        setViewedProfile(found);
      } else {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (!error && data) {
            setViewedProfile(data as Profile);
          } else {
            setViewedProfile(null);
          }
        } catch (err) {
          console.error('Error fetching public profile:', err);
          setViewedProfile(null);
        }
      }
      setProfileLoading(false);
    };

    fetchProfileData();
  }, [userId, profile, isOwner, isMock]);

  // Load qualification sessions for viewed profile
  useEffect(() => {
    if (viewedProfile) {
      qualificationService.getUserSessions(viewedProfile.id).then(setQualSessions).catch(console.error);
      
      // Load active sessions count
      if (isMock) {
        const allSessions = JSON.parse(localStorage.getItem('skillswap-mock-sessions') || '[]');
        const count = allSessions.filter(
          (s: any) => (s.learner_id === viewedProfile.id || s.mentor_id === viewedProfile.id) && 
                      s.status === 'active' && 
                      new Date(s.expires_at).getTime() > Date.now()
        ).length;
        setActiveSwapsCount(count);
      } else {
        setActiveSwapsCount(0);
      }
    }
  }, [viewedProfile, isMock]);

  // Sync edit form states
  useEffect(() => {
    if (viewedProfile && isOwner) {
      setFullName(viewedProfile.full_name || '');
      setBio(viewedProfile.bio || '');
      setLocation(viewedProfile.location || '');
      setAvailability(viewedProfile.availability || 'available');
      setAvatarUrl(viewedProfile.avatar_url || '');
      setTeachSkills(viewedProfile.skills_teach || []);
      setLearnSkills(viewedProfile.skills_learn || []);
    }
  }, [viewedProfile, isOwner]);

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Loading profile...</span>
      </div>
    );
  }

  if (!viewedProfile) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="font-heading font-extrabold text-2xl text-gray-900 dark:text-white">Profile Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          The profile you are looking for does not exist or has been deactivated.
        </p>
        <Link to="/browse" className="btn-primary py-2 px-4">
          Discover Swappers
        </Link>
      </div>
    );
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { publicUrl, error } = await uploadAvatar(file);
    if (error) {
      setErrorMsg(typeof error === 'string' ? error : 'Failed to upload photo. Please try again.');
    } else if (publicUrl) {
      setAvatarUrl(publicUrl);
      await updateProfile({ avatar_url: publicUrl });
      setSuccessMsg('Photo uploaded and updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setUploading(false);
  };

  const handleOpenSkillSelectModal = (type: 'teach' | 'learn') => {
    setSkillSelectType(type);
    setIsSkillSelectOpen(true);
  };

  const handleAddPredefinedSkill = async (skill: string) => {
    setIsSkillSelectOpen(false);
    setErrorMsg(null);
    setSuccessMsg(null);

    const isTeach = skillSelectType === 'teach';
    const currentList = isTeach ? teachSkills : learnSkills;

    if (currentList.map(s => s.toLowerCase()).includes(skill.toLowerCase())) {
      setErrorMsg(`You have already added ${skill} to ${skillSelectType === 'teach' ? 'teach' : 'learn'}.`);
      return;
    }

    const updated = [...currentList, skill];
    if (isTeach) {
      setTeachSkills(updated);
      const { error } = await updateProfile({ skills_teach: updated });
      if (error) {
        setErrorMsg('Failed to add skill.');
      } else {
        setSuccessMsg('Skill added successfully!');
        setTimeout(() => setSuccessMsg(null), 2000);
      }
    } else {
      setLearnSkills(updated);
      const { error } = await updateProfile({ skills_learn: updated });
      if (error) {
        setErrorMsg('Failed to add skill.');
      } else {
        setSuccessMsg('Skill added successfully!');
        setTimeout(() => setSuccessMsg(null), 2000);
      }
    }
  };

  const handleRemoveTeachSkill = async (skillToRemove: string) => {
    const updated = teachSkills.filter(s => s !== skillToRemove);
    setTeachSkills(updated);
    const { error } = await updateProfile({ skills_teach: updated });
    if (error) {
      setErrorMsg('Failed to remove skill.');
    }
  };

  const handleRemoveLearnSkill = async (skillToRemove: string) => {
    const updated = learnSkills.filter(s => s !== skillToRemove);
    setLearnSkills(updated);
    const { error } = await updateProfile({ skills_learn: updated });
    if (error) {
      setErrorMsg('Failed to remove skill.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const updatedData: Partial<Profile> = {
      full_name: fullName.trim(),
      bio: bio.trim(),
      location: location.trim() || null,
      availability,
    };

    const { error } = await updateProfile(updatedData);
    if (error) {
      setErrorMsg('Failed to update profile. Please try again.');
    } else {
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setLoading(false);
  };

  // Swap Request Submission
  const handleOpenSwapModal = () => {
    if (viewedProfile.skills_teach.length > 0) {
      setSkillOffered(viewedProfile.skills_teach[0]);
    }
    if (profile && profile.skills_teach.length > 0) {
      setSkillWanted(profile.skills_teach[0]);
    }
    setProposalMessage(`Hey ${viewedProfile.full_name}, I saw that you can teach ${viewedProfile.skills_teach[0] || 'your skills'} and would love to exchange it for ${profile?.skills_teach[0] || 'mine'}!`);
    setShowSwapModal(true);
  };

  const handleSubmitSwapRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !viewedProfile) return;

    if (!skillOffered || !skillWanted) {
      setModalError('Please specify the skills to swap.');
      return;
    }

    const newRequest: SwapRequest = {
      id: `req-${Math.random().toString(36).substr(2, 9)}`,
      sender_id: profile.id,
      receiver_id: viewedProfile.id,
      skill_offered: skillWanted,
      skill_wanted: skillOffered,
      status: 'pending',
      message: proposalMessage,
      created_at: new Date().toISOString()
    };

    const allRequests: SwapRequest[] = JSON.parse(localStorage.getItem('skillswap-mock-requests') || '[]');
    allRequests.push(newRequest);
    localStorage.setItem('skillswap-mock-requests', JSON.stringify(allRequests));

    setModalSuccess(true);
    setTimeout(() => {
      setShowSwapModal(false);
      setModalSuccess(false);
      setSuccessMsg('Swap proposal sent successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 2000);
  };

  // Stats Calculations
  const passedSessions = qualSessions.filter(s => s.status === 'passed');
  const verifiedSkillsCount = passedSessions.length;
  const completedInterviewsCount = qualSessions.filter(s => s.status === 'passed' || s.status === 'failed').length;
  const badgesCount = passedSessions.filter(s => s.badge).length;
  
  const avgScore = passedSessions.length > 0
    ? Math.round(passedSessions.reduce((sum, s) => sum + (s.score || 0), 0) / passedSessions.length)
    : 0;

  // overall rating out of 5 based on passed assessment scores
  const calculatedRating = avgScore > 0 ? (avgScore / 20).toFixed(1) : "0.0";

  const primaryPassedSession = passedSessions[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 transition-colors duration-300 pb-8">
      
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-2xl flex items-center space-x-2 text-sm text-emerald-700 dark:text-emerald-450 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-center space-x-2 text-sm text-red-700 dark:text-red-400 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!isEditing ? (
        // ==================================================
        // PROFILE VIEW MODE (Private Owner / Read-only Public)
        // ==================================================
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* 1. Main Header Profile Card */}
          <div className="bg-[#0b1329] dark:bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary-600/10 to-transparent rounded-full blur-3xl -z-1"></div>
            
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6 relative z-10">
              
              {/* Profile Bio & Details */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 flex-1">
                {/* Profile Photo */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-full border-2 border-primary-500/30 p-0.5 bg-slate-950/80 overflow-hidden shadow-inner">
                    <img
                      src={viewedProfile.avatar_url || ''}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover object-center"
                    />
                  </div>
                  {/* Status Indicator dot */}
                  <span className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0b1329] dark:border-slate-900 ${
                    viewedProfile.availability === 'available' ? 'bg-emerald-500' : viewedProfile.availability === 'busy' ? 'bg-amber-500' : 'bg-gray-500'
                  }`} title={`Status: ${viewedProfile.availability}`}></span>
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-white truncate leading-none">
                      {viewedProfile.full_name || ''}
                    </h1>
                    {verifiedSkillsCount > 0 && (
                      <span className="inline-flex items-center text-blue-500" title="Verified Professional">
                        <CheckCircle2 className="w-5 h-5 fill-blue-500 text-[#0b1329] dark:text-slate-900 shrink-0" />
                      </span>
                    )}
                  </div>

                  {verifiedSkillsCount > 0 && (
                    <div className="flex items-center justify-center sm:justify-start space-x-1 text-blue-400 font-bold text-xs">
                      <ShieldCheck className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                      <span>AI Verified Mentor</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                    {viewedProfile.bio || "Passionate about teaching and sharing knowledge. Specializing in Programming and Web Development."}
                  </p>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-y-1 gap-x-3 text-[11px] text-slate-400 font-semibold">
                    <div className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      <span>{viewedProfile.location || "Hyderabad, Telangana, India"}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      <span>Joined {new Date(viewedProfile.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Badges/Chips row */}
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                    <span className={`px-2.5 py-0.5 text-[10px] font-extrabold border rounded-full ${
                      viewedProfile.availability === 'available' 
                        ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                        : viewedProfile.availability === 'busy' 
                        ? 'bg-amber-500/10 text-amber-450 border-amber-500/20' 
                        : 'bg-slate-550/10 text-slate-400 border-slate-700/30'
                    }`}>
                      {viewedProfile.availability === 'available' ? 'Open to Teach' : viewedProfile.availability === 'busy' ? 'Busy Status' : 'Offline'}
                    </span>
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                      Mentor
                    </span>
                    {verifiedSkillsCount > 0 && (
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Certificate Widget */}
              <div className="shrink-0 w-full lg:w-72 bg-slate-950/40 dark:bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between min-h-[130px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -z-1"></div>
                {primaryPassedSession ? (
                  <>
                    <div className="flex items-start justify-between gap-2.5 mb-1.5">
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-xs text-white">AI Verified Mentor</h4>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Completed AI assessment.
                        </p>
                      </div>
                      <Award className="w-8 h-8 text-blue-500 shrink-0" />
                    </div>
                    
                    <div className="border-t border-slate-800/60 pt-2 mt-2 flex flex-col gap-1 text-[9px] font-semibold text-slate-450">
                      <div className="flex justify-between">
                        <span>ID</span>
                        <span className="text-slate-205 font-mono">
                          {`SS-24-${primaryPassedSession.id.slice(0,4).toUpperCase()}-${primaryPassedSession.id.slice(9,13).toUpperCase()}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Issued</span>
                        <span className="text-slate-205">
                          {new Date(primaryPassedSession.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* PDF Download link - strictly owner-only */}
                    {isOwner && (
                      <button
                        onClick={() => certificateService.generateCertificatePDF(viewedProfile, primaryPassedSession)}
                        className="mt-3 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-md shadow-blue-600/10 flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <span>View Certificate</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-4 space-y-1">
                    <Award className="w-7 h-7 text-slate-650" />
                    <h4 className="font-extrabold text-[11px] text-slate-350">Not Certified Yet</h4>
                    <p className="text-[9px] text-slate-500 max-w-[170px] leading-relaxed">
                      {isOwner ? "Complete an assessment from your dashboard." : "This user is not certified yet."}
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* 2. Stats Dashboard Grid */}
          <div className="bg-[#0b1329] dark:bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center divide-x-0 sm:divide-x divide-slate-800/80">
            <div className="space-y-0.5 py-1">
              <div className="text-xl font-black text-blue-400">{verifiedSkillsCount}</div>
              <div className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Skills Verified</div>
            </div>
            <div className="space-y-0.5 py-1">
              <div className="text-xl font-black text-purple-400">
                {isOwner ? `${avgScore > 0 ? avgScore : 0}%` : `${calculatedRating} / 5`}
              </div>
              <div className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">
                {isOwner ? 'Average Score' : 'Mentor Rating'}
              </div>
            </div>
            <div className="space-y-0.5 py-1">
              <div className="text-xl font-black text-blue-400">{completedInterviewsCount || 3}</div>
              <div className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Interviews Completed</div>
            </div>
            <div className="space-y-0.5 py-1">
              <div className="text-xl font-black text-emerald-400">{badgesCount || 3}</div>
              <div className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Badges Earned</div>
            </div>
            <div className="space-y-0.5 py-1">
              <div className="text-xl font-black text-amber-500">{activeSwapsCount}</div>
              <div className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Active Swaps</div>
            </div>
          </div>

          {/* 3. Bottom 3-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            {/* Column 1: Skills & Personal Info */}
            <div className="space-y-6">
              
              {/* Skills I Can Teach */}
              <div className="bg-[#0b1329] dark:bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <h3 className="font-heading font-extrabold text-base text-white flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2 text-primary-500" />
                  Skills I Can Teach
                </h3>
 
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleOpenSkillSelectModal('teach')}
                    className="w-full py-2 bg-slate-950/50 border border-dashed border-slate-800 hover:border-primary-500 hover:text-primary-400 text-slate-400 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer hover:bg-slate-950/80"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Select Skill to Teach</span>
                  </button>
                )}
 
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {viewedProfile.skills_teach && viewedProfile.skills_teach.length > 0 ? (
                    viewedProfile.skills_teach.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20"
                      >
                        {passedSessions.some(s => s.skill_name.toLowerCase() === skill.toLowerCase()) && (
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" title="Verified Skill" />
                        )}
                        <span>{skill}</span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTeachSkill(skill)}
                            className="p-0.5 hover:bg-primary-500/20 rounded-full text-slate-400 hover:text-white transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2">No teaching skills listed yet.</p>
                  )}
                </div>
              </div>
 
              {/* Skills I Want to Learn */}
              <div className="bg-[#0b1329] dark:bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <h3 className="font-heading font-extrabold text-base text-white flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-blue-400" />
                  Skills I Want to Learn
                </h3>
 
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleOpenSkillSelectModal('learn')}
                    className="w-full py-2 bg-slate-950/50 border border-dashed border-slate-800 hover:border-blue-500 hover:text-blue-400 text-slate-400 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer hover:bg-slate-950/80"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Select Skill to Learn</span>
                  </button>
                )}
 
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {viewedProfile.skills_learn && viewedProfile.skills_learn.length > 0 ? (
                    viewedProfile.skills_learn.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      >
                        <span>{skill}</span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLearnSkill(skill)}
                            className="p-0.5 hover:bg-blue-500/20 rounded-full text-slate-400 hover:text-white transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2">No learning desires listed yet.</p>
                  )}
                </div>
              </div>
 
            </div>
 
            {/* Column 2: Interview History */}
            <div className="bg-[#0b1329] dark:bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 flex flex-col justify-between min-h-[380px]">
              <div className="space-y-4">
                <h3 className="font-heading font-extrabold text-base text-white flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                  Interview History
                </h3>
 
                <div className="space-y-3.5">
                  {/* For public profile, show only passed ones, hide failed/pending, and hide scores */}
                  {qualSessions.length > 0 ? (
                    qualSessions
                      .filter(session => isOwner || session.status === 'passed')
                      .slice(0, 2)
                      .map((session) => (
                        <div key={session.id} className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-3 relative overflow-hidden">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm text-slate-100">{session.skill_name}</h4>
                              <span className="text-[10px] text-slate-450 flex items-center mt-1">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(session.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {/* Show score ONLY for owner */}
                            {isOwner ? (
                              session.status === 'passed' ? (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">
                                  {session.score}% - Passed
                                </span>
                              ) : session.status === 'failed' ? (
                                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-bold">
                                  {session.score || 0}% - Failed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold">
                                  Pending
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold flex items-center">
                                <Check className="w-3 h-3 mr-1" />
                                Certified
                              </span>
                            )}
                          </div>
                          
                          {session.badge && (
                            <div className="flex items-center text-[11px] font-semibold text-slate-350">
                              <Award className="w-3.5 h-3.5 mr-1 text-amber-500" />
                              Badge: {session.badge}
                            </div>
                          )}
                          
                          {/* Show Download Certificate ONLY for owner */}
                          {isOwner && session.status === 'passed' && (
                            <button
                              onClick={() => certificateService.generateCertificatePDF(viewedProfile, session)}
                              className="mt-2 w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-blue-400 text-[10px] font-bold rounded-lg border border-slate-800 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Certificate</span>
                            </button>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="p-6 bg-slate-950/20 border border-dashed border-slate-800 rounded-2xl text-center py-10 text-xs text-slate-500 italic">
                      No interview history recorded.
                    </div>
                  )}
                </div>
              </div>
 
              {qualSessions.filter(session => isOwner || session.status === 'passed').length > 2 && (
                <div className="pt-4 border-t border-slate-800/60 mt-4 text-center">
                  <button
                    onClick={() => navigate(isOwner ? '/summaries' : '/certificates')}
                    className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>View All Interviews</span>
                    <ChevronRight className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              )}
            </div>
 
            {/* Column 3: Personal Info */}
            <div className="space-y-6">
              
              {/* Personal Information Display */}
              <div className="bg-[#0b1329] dark:bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <h3 className="font-heading font-extrabold text-base text-white">
                  Personal Information
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-800/20">
                    <span className="text-slate-450 font-medium">Full Name</span>
                    <span className="text-slate-200 font-bold">{viewedProfile.full_name || 'Nandyala Sri Thanuj'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800/20">
                    <span className="text-slate-450 font-medium">Short Bio</span>
                    <span className="text-slate-200 font-bold truncate max-w-[200px]" title={viewedProfile.bio || ''}>{viewedProfile.bio || 'Excited to share skills'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800/20">
                    <span className="text-slate-450 font-medium">Location</span>
                    <span className="text-slate-200 font-bold">{viewedProfile.location || 'Hyderabad, Telangana'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800/20">
                    <span className="text-slate-450 font-medium">Availability</span>
                    <span className="text-slate-200 font-bold capitalize">{viewedProfile.availability.replace('_', ' ')}</span>
                  </div>
                </div>
 
                {isOwner && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full mt-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-blue-600/10"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
 
              {/* Action buttons (Swap request) for guest viewer inside Personal Info card column */}
              {!isOwner && (
                <div className="bg-[#0b1329] dark:bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <button
                    onClick={handleOpenSwapModal}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-md shadow-blue-600/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Request Skill Swap</span>
                  </button>
                  <button
                    onClick={() => navigate('/requests')}
                    className="w-full py-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Send Message</span>
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>
      ) : (
        // ==========================================
        // PROFILE EDIT MODE (Owner Edit Panel)
        // ==========================================
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="font-heading font-extrabold text-3xl tracking-tight text-gray-900 dark:text-white">
                Edit Profile
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Update your basic info, details, and location to show on your public profile.
              </p>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Avatar & Basic Form */}
            <div className="card-premium p-6 space-y-6 h-fit bg-white dark:bg-slate-900">
              <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-gray-100 dark:border-slate-800">
                {/* Avatar Photo with Upload Icon Overlay */}
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full border-2 border-primary-500/25 p-0.5 object-cover bg-gray-50 overflow-hidden group-hover:opacity-85 transition-opacity">
                    <img
                      src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${viewedProfile.username}`}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>
                
                {/* Hidden Input File */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div>
                  <h3 className="font-extrabold text-gray-950 dark:text-white text-lg">{fullName || 'Swapper'}</h3>
                  <p className="text-xs text-gray-400 dark:text-slate-500">@{profile.username}</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-350 uppercase tracking-wider flex items-center">
                    <User className="w-4 h-4 mr-1.5 text-gray-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-805 border border-gray-205 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-355 uppercase tracking-wider flex items-center">
                    <FileText className="w-4 h-4 mr-1.5 text-gray-400" />
                    Short Bio
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Share who you are, what you like teaching, and your general availability..."
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-805 border border-gray-205 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all dark:text-white"
                  />
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-350 uppercase tracking-wider flex items-center">
                    <MapPin className="w-4 h-4 mr-1.5 text-gray-400" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="E.g., Hyderabad, Telangana"
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-805 border border-gray-205 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
                  />
                </div>

                {/* Availability */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-350 uppercase tracking-wider flex items-center">
                    <Activity className="w-4 h-4 mr-1.5 text-gray-400" />
                    Availability Status
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as Profile['availability'])}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-805 border border-gray-205 dark:border-slate-750 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white cursor-pointer"
                  >
                    <option value="available">Available to Swap</option>
                    <option value="busy">Busy / Limits swaps</option>
                    <option value="offline">Offline / Not swapping</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 justify-center flex items-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </form>
            </div>

            {/* Right Column: Information/Guidance */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card-premium p-6 space-y-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                <h3 className="font-heading font-extrabold text-lg text-gray-900 dark:text-white flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-primary-500" />
                  Portfolio Editing Guidance
                </h3>
                <p className="text-xs text-gray-650 dark:text-slate-400 leading-relaxed">
                  Completing your profile details helps other users find you accurately. Make sure to specify your exact location, a helpful personal bio detailing your professional background or swap goals, and your correct availability status.
                </p>
                <p className="text-xs text-gray-650 dark:text-slate-400 leading-relaxed">
                  Note that your verified skills and interview history are locked to your assessment completions, and cannot be edited manually. To verify more skills, join an AI assessment from your Dashboard.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================
          SWAP REQUEST PROPOSAL MODAL (PUBLIC VIEW ONLY)
          ================================================== */}
      {showSwapModal && viewedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full relative space-y-5">
            {/* Close Button */}
            <button
              onClick={() => setShowSwapModal(false)}
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
                Pitch a mutual swap with <span className="font-bold">@{viewedProfile.username}</span>.
              </p>
            </div>

            {modalSuccess ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center mx-auto">
                  <Send className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="font-extrabold text-emerald-700 dark:text-emerald-400">Proposal Sent!</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Negotiating your exchange request...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitSwapRequest} className="space-y-4">
                {modalError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-655 dark:text-red-400 rounded-2xl flex items-center space-x-2 text-xs">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Skill they teach -> Skill I learn */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-750 dark:text-slate-350 uppercase tracking-wider">
                    Skill I Want to Learn (from them)
                  </label>
                  <select
                    value={skillOffered}
                    onChange={(e) => setSkillOffered(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white cursor-pointer"
                  >
                    {viewedProfile.skills_teach.map((skill, idx) => (
                      <option key={idx} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>

                {/* Skill I teach -> Skill they learn */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-755 dark:text-slate-350 uppercase tracking-wider">
                    Skill I Will Teach (to them)
                  </label>
                  <select
                    value={skillWanted}
                    onChange={(e) => setSkillWanted(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white cursor-pointer"
                  >
                    {profile.skills_teach.map((skill, idx) => (
                      <option key={idx} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>

                {/* Proposal Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-750 dark:text-slate-350 uppercase tracking-wider">
                    Introductory Proposal Pitch
                  </label>
                  <textarea
                    rows={4}
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    placeholder="Describe how you wish to coordinate the learning exchanges..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSwapModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-slate-200 font-bold text-sm rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 btn-primary font-bold text-sm rounded-xl cursor-pointer"
                  >
                    Send Proposal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Predefined Skill Selection Modal */}
      {isSkillSelectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-5 max-w-md w-full space-y-3.5 shadow-2xl relative overflow-hidden">
            <button
              onClick={() => setIsSkillSelectOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-extrabold text-base text-white flex items-center">
              <Sparkles className="w-4.5 h-4.5 mr-2 text-primary-500" />
              Add Skill to {skillSelectType === 'teach' ? 'Teach' : 'Learn'}
            </h3>

            <div className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto pr-1">
              {Object.entries(SKILLS_BY_CATEGORY).map(([categoryName, skillsList]) => {
                const availableSkills = skillsList.filter(skill => {
                  const currentList = skillSelectType === 'teach' ? teachSkills : learnSkills;
                  return !currentList.some(s => s.toLowerCase() === skill.toLowerCase());
                });

                return (
                  <div key={categoryName} className="space-y-2 pb-2 border-b border-slate-800/20 last:border-b-0">
                    <h4 className={`text-[10px] font-bold uppercase tracking-wider ${CATEGORY_COLORS[categoryName] || 'text-slate-400'}`}>
                      {categoryName}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {availableSkills.map(skill => (
                        <button
                          key={skill}
                          onClick={() => handleAddPredefinedSkill(skill)}
                          className="px-2.5 py-1 bg-slate-950/50 hover:bg-primary-500/20 border border-slate-800 hover:border-primary-500/50 rounded-lg text-xs text-slate-300 hover:text-white font-semibold transition-all cursor-pointer"
                        >
                          {skill}
                        </button>
                      ))}
                      {availableSkills.length === 0 && (
                        <span className="text-[10px] text-slate-500 italic">All skills in this category added.</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
