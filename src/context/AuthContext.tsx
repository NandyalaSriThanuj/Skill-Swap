import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Profile } from '../types';

interface AuthContextType {
  user: User | any | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isMock: boolean;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updatedProfile: Partial<Profile>) => Promise<{ error: any }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  uploadAvatar: (file: File) => Promise<{ publicUrl: string | null; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial mock data if Supabase isn't connected
const MOCK_PROFILES_KEY = 'skillswap-mock-profiles';
const MOCK_CURRENT_USER_KEY = 'skillswap-mock-user';
const MOCK_CURRENT_PROFILE_KEY = 'skillswap-mock-profile';

const DEFAULT_MOCK_PROFILES: Profile[] = [
  {
    id: 'user-alex',
    email: 'alex@example.com',
    username: 'alex_dev',
    full_name: 'Alex Rivers',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    bio: 'Frontend developer passionate about building beautiful user interfaces. I love React, CSS transitions, and Tailwind CSS.',
    location: 'San Francisco, CA',
    availability: 'available',
    skills_teach: ['React', 'Tailwind CSS', 'TypeScript', 'HTML/CSS'],
    skills_learn: ['UI/UX Design', 'Node.js', 'Figma']
  },
  {
    id: 'user-elena',
    email: 'elena@example.com',
    username: 'elena_data',
    full_name: 'Elena Rostova',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    bio: 'Data Scientist working with Python and ML models. Looking to learn some public speaking and communication skills.',
    location: 'London, UK',
    availability: 'busy',
    skills_teach: ['Python', 'Machine Learning', 'SQL', 'Data Visualization'],
    skills_learn: ['Public Speaking', 'Presentations', 'Technical Writing']
  },
  {
    id: 'user-marcus',
    email: 'marcus@example.com',
    username: 'marcus_design',
    full_name: 'Marcus Chen',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Lead designer at a creative agency. Expert in Figma, branding, and color theory. Excited to learn web coding!',
    location: 'Toronto, Canada',
    availability: 'available',
    skills_teach: ['Figma', 'Graphic Design', 'UI/UX Design', 'Branding'],
    skills_learn: ['React', 'Tailwind CSS', 'JavaScript']
  },
  {
    id: 'user-sarah',
    email: 'sarah@example.com',
    username: 'sarah_langs',
    full_name: 'Sarah Jenkins',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    bio: 'Polyglot and languages teacher. I can help you speak Spanish, French, or Italian fluently. Want to learn guitar.',
    location: 'Madrid, Spain',
    availability: 'available',
    skills_teach: ['Spanish', 'French', 'Italian', 'Content Editing'],
    skills_learn: ['Acoustic Guitar', 'Music Theory', 'Piano']
  },
  {
    id: 'user-david',
    email: 'david@example.com',
    username: 'david_crafts',
    full_name: 'David Miller',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    bio: 'Hobbyist woodworker and organic gardener. Happy to share tips on building shelves or growing organic vegetables!',
    location: 'Austin, TX',
    availability: 'offline',
    skills_teach: ['Woodworking', 'Organic Gardening', 'Cooking'],
    skills_learn: ['Web Development', 'Digital Marketing', 'SEO']
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(!isSupabaseConfigured);

  // Initialize Mock database in localStorage if needed
  useEffect(() => {
    if (!localStorage.getItem(MOCK_PROFILES_KEY)) {
      localStorage.setItem(MOCK_PROFILES_KEY, JSON.stringify(DEFAULT_MOCK_PROFILES));
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Load mock session from local storage
      const mockUser = localStorage.getItem(MOCK_CURRENT_USER_KEY);
      const mockProfile = localStorage.getItem(MOCK_CURRENT_PROFILE_KEY);
      if (mockUser && mockProfile) {
        setUser(JSON.parse(mockUser));
        setProfile(JSON.parse(mockProfile));
      }
      setLoading(false);
      return;
    }

    // Real Supabase auth setup
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('Error in Supabase auth init:', err);
        // Fallback to mock if database query fails completely
        setIsMock(true);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data as Profile);
      } else {
        // Create profile if it doesn't exist
        const newProfile: Profile = {
          id: userId,
          username: null,
          full_name: null,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId}`,
          bio: '',
          location: null,
          availability: 'available',
          skills_teach: [],
          skills_learn: [],
        };
        const { error: insertError } = await supabase.from('profiles').insert(newProfile);
        if (insertError) throw insertError;
        setProfile(newProfile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    if (isMock) {
      // Check if a user with this email or username already exists in mock data
      const allProfiles = JSON.parse(localStorage.getItem(MOCK_PROFILES_KEY) || '[]');
      const emailExists = allProfiles.some((p: any) => p.email && p.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        return { error: { message: 'An account with this email address already exists.' } };
      }
      const usernameExists = allProfiles.some((p: any) => p.username && p.username.toLowerCase() === username.toLowerCase());
      if (usernameExists) {
        return { error: { message: 'This username is already taken.' } };
      }

      // Create a mock user
      const mockId = `mock-user-${Math.random().toString(36).substr(2, 9)}`;
      const mockUser = {
        id: mockId,
        email,
        created_at: new Date().toISOString(),
      };
      const mockProfile: Profile = {
        id: mockId,
        email,
        username,
        full_name: fullName,
        avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
        bio: '',
        location: null,
        availability: 'available',
        skills_teach: [],
        skills_learn: [],
      };

      // Save to mock database
      allProfiles.push(mockProfile);
      localStorage.setItem(MOCK_PROFILES_KEY, JSON.stringify(allProfiles));

      // Log user in
      localStorage.setItem(MOCK_CURRENT_USER_KEY, JSON.stringify(mockUser));
      localStorage.setItem(MOCK_CURRENT_PROFILE_KEY, JSON.stringify(mockProfile));
      
      setUser(mockUser);
      setProfile(mockProfile);
      return { error: null };
    }

    // Real Supabase SignUp
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          username,
          full_name: fullName,
        }
      }
    });
    if (error) return { error };

    // The backend database trigger handles profile creation securely.
    // If we're logged in automatically (confirmations off), we can optimistically set the local state.
    if (data.user) {
      const newProfile: Profile = {
        id: data.user.id,
        username,
        full_name: fullName,
        avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
        bio: '',
        location: null,
        availability: 'available',
        skills_teach: [],
        skills_learn: [],
      };

      setProfile(newProfile);
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    if (isMock) {
      // Mock login check: if email exists or dummy credentials
      // We will allow logging in with any email for demo purposes, creating a mock profile if not existing.
      const mockId = `mock-user-${email.split('@')[0]}`;
      const savedProfiles = JSON.parse(localStorage.getItem(MOCK_PROFILES_KEY) || '[]');
      
      let existingProfile = savedProfiles.find((p: Profile) => p.username === email.split('@')[0]);
      if (!existingProfile) {
        existingProfile = {
          id: mockId,
          username: email.split('@')[0],
          full_name: email.split('@')[0].toUpperCase(),
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${email}`,
          bio: 'Swap skills, change the world!',
          location: 'New York, NY',
          availability: 'available',
          skills_teach: ['Communication', 'Cooking'],
          skills_learn: ['React', 'Piano'],
        };
        savedProfiles.push(existingProfile);
        localStorage.setItem(MOCK_PROFILES_KEY, JSON.stringify(savedProfiles));
      }

      const mockUser = { id: mockId, email, created_at: new Date().toISOString() };
      localStorage.setItem(MOCK_CURRENT_USER_KEY, JSON.stringify(mockUser));
      localStorage.setItem(MOCK_CURRENT_PROFILE_KEY, JSON.stringify(existingProfile));

      setUser(mockUser);
      setProfile(existingProfile);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    if (isMock) {
      localStorage.removeItem(MOCK_CURRENT_USER_KEY);
      localStorage.removeItem(MOCK_CURRENT_PROFILE_KEY);
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const updateProfile = async (updatedProfile: Partial<Profile>) => {
    if (!profile) return { error: 'No profile found' };

    const newProfile = { ...profile, ...updatedProfile };

    if (isMock) {
      // Save current profile
      localStorage.setItem(MOCK_CURRENT_PROFILE_KEY, JSON.stringify(newProfile));
      
      // Update in local database
      const allProfiles = JSON.parse(localStorage.getItem(MOCK_PROFILES_KEY) || '[]');
      const index = allProfiles.findIndex((p: Profile) => p.id === profile.id);
      if (index !== -1) {
        allProfiles[index] = newProfile;
      } else {
        allProfiles.push(newProfile);
      }
      localStorage.setItem(MOCK_PROFILES_KEY, JSON.stringify(allProfiles));

      setProfile(newProfile);
      return { error: null };
    }

    // Real Supabase profile update
    const { error } = await supabase
      .from('profiles')
      .update(updatedProfile)
      .eq('id', profile.id);

    if (!error) {
      setProfile(newProfile);
    }
    return { error };
  };

  const resetPasswordForEmail = async (email: string) => {
    if (isMock) {
      const allProfiles = JSON.parse(localStorage.getItem(MOCK_PROFILES_KEY) || '[]');
      const emailExists = allProfiles.some((p: any) => p.email && p.email.toLowerCase() === email.toLowerCase());
      if (!emailExists) {
        return { error: { message: 'No account found with this email address.' } };
      }
      console.log(`[Mock Auth] Reset password email sent to: ${email}`);
      return { error: null };
    }

    // Verify email is registered in Supabase database before sending reset request
    const { data: profileData, error: queryError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (queryError) {
      return { error: queryError };
    }

    if (!profileData) {
      return { error: { message: 'No account found with this email address.' } };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    if (isMock) {
      console.log('[Mock Auth] Password updated successfully');
      return { error: null };
    }
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const uploadAvatar = async (file: File) => {
    if (isMock) {
      return new Promise<{ publicUrl: string | null; error: any }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ publicUrl: reader.result as string, error: null });
        };
        reader.onerror = () => {
          resolve({ publicUrl: null, error: 'Failed to read file' });
        };
        reader.readAsDataURL(file);
      });
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || 'unknown'}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return { publicUrl, error: null };
    } catch (err: any) {
      return { publicUrl: null, error: err };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      isMock, 
      signUp, 
      signIn, 
      signOut, 
      updateProfile,
      resetPasswordForEmail,
      updatePassword,
      uploadAvatar
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
