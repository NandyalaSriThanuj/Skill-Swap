import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types';
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
  Loader2
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { profile, updateProfile, uploadAvatar } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [availability, setAvailability] = useState<Profile['availability']>(profile?.availability || 'available');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [teachSkills, setTeachSkills] = useState<string[]>(profile?.skills_teach || []);
  const [learnSkills, setLearnSkills] = useState<string[]>(profile?.skills_learn || []);

  // Form states for adding skill
  const [newTeachSkill, setNewTeachSkill] = useState('');
  const [newLearnSkill, setNewLearnSkill] = useState('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!profile) return null;

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
      setSuccessMsg('Photo uploaded successfully! Save profile to commit.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setUploading(false);
  };

  const handleAddTeachSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeachSkill.trim()) return;
    
    // Check if duplicate
    if (teachSkills.map(s => s.toLowerCase()).includes(newTeachSkill.trim().toLowerCase())) {
      setErrorMsg('You have already added this skill to teach.');
      return;
    }

    setTeachSkills([...teachSkills, newTeachSkill.trim()]);
    setNewTeachSkill('');
    setErrorMsg(null);
  };

  const handleAddLearnSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLearnSkill.trim()) return;

    // Check if duplicate
    if (learnSkills.map(s => s.toLowerCase()).includes(newLearnSkill.trim().toLowerCase())) {
      setErrorMsg('You have already added this skill to learn.');
      return;
    }

    setLearnSkills([...learnSkills, newLearnSkill.trim()]);
    setNewLearnSkill('');
    setErrorMsg(null);
  };

  const handleRemoveTeachSkill = (skillToRemove: string) => {
    setTeachSkills(teachSkills.filter(s => s !== skillToRemove));
  };

  const handleRemoveLearnSkill = (skillToRemove: string) => {
    setLearnSkills(learnSkills.filter(s => s !== skillToRemove));
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
      avatar_url: avatarUrl,
      skills_teach: teachSkills,
      skills_learn: learnSkills,
    };

    const { error } = await updateProfile(updatedData);
    if (error) {
      setErrorMsg('Failed to update profile. Please try again.');
    } else {
      setSuccessMsg('Profile saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Profile Header */}
      <div className="text-center md:text-left space-y-2">
        <h1 className="font-heading font-extrabold text-3xl tracking-tight text-gray-900 dark:text-white">
          My Swap Portfolio
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Manage your teaching abilities and what you wish to learn. Fill out your details completely to match with others.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-2xl flex items-center space-x-2 text-sm text-emerald-700 dark:text-emerald-450">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-center space-x-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Basic Info Form (1/3) */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 h-fit">
          <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-gray-100 dark:border-slate-800">
            {/* Avatar Photo with Upload Icon Overlay */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img
                src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.username}`}
                alt="Avatar"
                className="w-24 h-24 rounded-full border-2 border-primary-500/25 p-0.5 object-cover bg-gray-50 group-hover:opacity-85 transition-opacity"
              />
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
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center">
                <User className="w-4 h-4 mr-1.5 text-gray-400" />
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center">
                <FileText className="w-4 h-4 mr-1.5 text-gray-400" />
                Short Bio
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share who you are, what you like teaching, and your general availability..."
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all dark:text-white"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center">
                <MapPin className="w-4 h-4 mr-1.5 text-gray-400" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="E.g., San Francisco, CA or Remote"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
              />
            </div>

            {/* Availability */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center">
                <Activity className="w-4 h-4 mr-1.5 text-gray-400" />
                Availability Status
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as Profile['availability'])}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
              >
                <option value="available">Available to Swap</option>
                <option value="busy">Busy / Limits swaps</option>
                <option value="offline">Offline / Not swapping</option>
              </select>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Skills Management (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Skills to Teach */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-heading font-extrabold text-lg text-gray-905 dark:text-white flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-primary-500" />
              Skills I Can Teach
            </h3>

            {/* Add Skill Form */}
            <form onSubmit={handleAddTeachSkill} className="flex gap-2">
              <input
                type="text"
                value={newTeachSkill}
                onChange={(e) => setNewTeachSkill(e.target.value)}
                placeholder="E.g., React, Spanish, Piano, Figma..."
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl text-sm flex items-center space-x-1 shrink-0 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </form>

            {/* Skills Badges list */}
            <div className="flex flex-wrap gap-2 pt-2">
              {teachSkills.length > 0 ? (
                teachSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 border border-primary-100/30"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeachSkill(skill)}
                      className="p-0.5 hover:bg-primary-200/50 dark:hover:bg-primary-900/50 rounded-full text-primary-550 dark:text-primary-400 transition-colors"
                      title={`Remove ${skill}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-400 dark:text-slate-500 italic">No teaching skills listed yet. Add one above.</p>
              )}
            </div>
          </div>

          {/* Skills to Learn */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-heading font-extrabold text-lg text-gray-905 dark:text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-secondary-500" />
              Skills I Want to Learn
            </h3>

            {/* Add Skill Form */}
            <form onSubmit={handleAddLearnSkill} className="flex gap-2">
              <input
                type="text"
                value={newLearnSkill}
                onChange={(e) => setNewLearnSkill(e.target.value)}
                placeholder="E.g., Figma, Machine Learning, Guitar..."
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-secondary-500 hover:bg-secondary-600 text-white font-semibold rounded-xl text-sm flex items-center space-x-1 shrink-0 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </form>

            {/* Skills Badges list */}
            <div className="flex flex-wrap gap-2 pt-2">
              {learnSkills.length > 0 ? (
                learnSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-secondary-50 dark:bg-secondary-950/30 text-secondary-700 dark:text-secondary-300 border border-secondary-100/30"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLearnSkill(skill)}
                      className="p-0.5 hover:bg-secondary-200/50 dark:hover:bg-secondary-900/50 rounded-full text-secondary-550 dark:text-secondary-400 transition-colors"
                      title={`Remove ${skill}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-400 dark:text-slate-500 italic">No learning desires listed yet. Add one above.</p>
              )}
            </div>
          </div>

          {/* Quick instructions / tips */}
          <div className="p-4 bg-primary-50/50 dark:bg-slate-900/30 border border-primary-500/10 rounded-2xl flex items-start space-x-3 text-xs text-gray-650 dark:text-slate-450">
            <Sparkles className="w-4.5 h-4.5 text-primary-500 shrink-0 mt-0.5 animate-pulse-slow" />
            <div>
              <span className="font-bold text-gray-800 dark:text-slate-300">Why complete your profile?</span>
              <p className="mt-1">
                The SkillSwap matching engine scans your lists to generate direct peer connections. Listing at least 2 skills in both categories will increase your matches by up to 80%!
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
export default ProfilePage;
