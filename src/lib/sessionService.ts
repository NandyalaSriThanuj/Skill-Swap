import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { LearningSession } from '../types';

const MOCK_SESSIONS_KEY = 'skillswap-mock-sessions';
const MOCK_PROFILES_KEY = 'skillswap-mock-profiles';

const getMockSessions = (): LearningSession[] => {
  return JSON.parse(localStorage.getItem(MOCK_SESSIONS_KEY) || '[]');
};

const saveMockSessions = (sessions: LearningSession[]) => {
  localStorage.setItem(MOCK_SESSIONS_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new Event('skillswap-sessions-updated'));
};

export const sessionService = {
  // Fetch sessions for a user (either mentor or learner)
  async fetchSessions(userId: string): Promise<any[]> {
    if (!isSupabaseConfigured) {
      const all = getMockSessions();
      return all
        .filter((s: any) => s.learner_id === userId || s.mentor_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    try {
      // 1. Fetch sessions
      const { data: sessions, error } = await supabase
        .from('learning_sessions')
        .select('*')
        .or(`learner_id.eq.${userId},mentor_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!sessions || sessions.length === 0) return [];

      // 2. Collect unique profile IDs
      const profileIds = new Set<string>();
      sessions.forEach(s => {
        if (s.learner_id) profileIds.add(s.learner_id);
        if (s.mentor_id) profileIds.add(s.mentor_id);
      });

      // 3. Fetch profiles
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, rating, completed_sessions, teaching_hours, learning_hours')
        .in('id', Array.from(profileIds));

      if (pError) throw pError;

      // 4. Map profiles to sessions
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return sessions.map(s => ({
        ...s,
        learner: profileMap.get(s.learner_id) || null,
        mentor: profileMap.get(s.mentor_id) || null
      }));
    } catch (err) {
      console.error('Error fetching sessions:', err);
      throw err;
    }
  },

  // Fetch single session by room_id
  async fetchSessionByRoomId(roomId: string): Promise<any> {
    if (!isSupabaseConfigured) {
      const all = getMockSessions();
      const session = all.find((s: any) => s.room_id === roomId);
      if (!session) return null;

      const mockProfiles = JSON.parse(localStorage.getItem(MOCK_PROFILES_KEY) || '[]');
      const learner = mockProfiles.find((p: any) => p.id === session.learner_id) || null;
      const mentor = mockProfiles.find((p: any) => p.id === session.mentor_id) || null;

      return {
        ...session,
        learner,
        mentor
      };
    }

    try {
      // 1. Fetch session
      const { data: session, error } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

      if (error) throw error;
      if (!session) return null;

      // 2. Fetch profiles
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, rating, completed_sessions, teaching_hours, learning_hours')
        .in('id', [session.learner_id, session.mentor_id]);

      if (pError) throw pError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return {
        ...session,
        learner: profileMap.get(session.learner_id) || null,
        mentor: profileMap.get(session.mentor_id) || null
      };
    } catch (err) {
      console.error('Error fetching session details:', err);
      throw err;
    }
  },

  // Create a new session record
  async createSession(sessionData: {
    room_id: string;
    learner_id: string;
    mentor_id: string;
    swap_request_id: string;
    session_link: string;
    teaching_skill: string;
    learning_skill: string;
    status: 'scheduled' | 'active' | 'completed' | 'expired';
  }): Promise<any> {
    const newSession = {
      ...sessionData,
      id: crypto.randomUUID(),
      progress: 0,
      started_at: null,
      completed_at: null,
      mentor_rating: null,
      learner_feedback: null,
      duration_seconds: 0,
      attendance_status: { mentor: false, learner: false },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };

    if (!isSupabaseConfigured) {
      const all = getMockSessions();
      all.push(newSession as any);
      saveMockSessions(all);
      return newSession;
    }

    try {
      const { data, error } = await supabase
        .from('learning_sessions')
        .insert([newSession])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating learning session:', err);
      throw err;
    }
  },

  // Start the learning session
  async startSession(roomId: string): Promise<any> {
    const startedAt = new Date().toISOString();

    if (!isSupabaseConfigured) {
      const all = getMockSessions();
      const updated = all.map((s: any) =>
        s.room_id === roomId
          ? { ...s, status: 'active', started_at: startedAt }
          : s
      );
      saveMockSessions(updated);
      return updated.find((s: any) => s.room_id === roomId);
    }

    try {
      const { data, error } = await supabase
        .from('learning_sessions')
        .update({
          status: 'active',
          started_at: startedAt
        })
        .eq('room_id', roomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error starting session:', err);
      throw err;
    }
  },

  // Update attendance
  async updateAttendance(roomId: string, role: 'mentor' | 'learner', present: boolean): Promise<any> {
    if (!isSupabaseConfigured) {
      const all = getMockSessions();
      const updated = all.map((s: any) => {
        if (s.room_id === roomId) {
          const attendance = s.attendance_status || { mentor: false, learner: false };
          attendance[role] = present;
          return { ...s, attendance_status: attendance };
        }
        return s;
      });
      saveMockSessions(updated);
      return updated.find((s: any) => s.room_id === roomId);
    }

    try {
      // First fetch current attendance
      const { data: session } = await supabase
        .from('learning_sessions')
        .select('attendance_status')
        .eq('room_id', roomId)
        .single();

      const attendance = (session?.attendance_status as any) || { mentor: false, learner: false };
      attendance[role] = present;

      const { data, error } = await supabase
        .from('learning_sessions')
        .update({ attendance_status: attendance })
        .eq('room_id', roomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error updating attendance:', err);
      throw err;
    }
  },

  // Track progress (0-100)
  async updateProgress(roomId: string, progressValue: number): Promise<any> {
    if (!isSupabaseConfigured) {
      const all = getMockSessions();
      const updated = all.map((s: any) =>
        s.room_id === roomId ? { ...s, progress: progressValue } : s
      );
      saveMockSessions(updated);
      return updated.find((s: any) => s.room_id === roomId);
    }

    try {
      const { data, error } = await supabase
        .from('learning_sessions')
        .update({ progress: progressValue })
        .eq('room_id', roomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error updating progress:', err);
      throw err;
    }
  },

  // Save session details including duration
  async updateDuration(roomId: string, durationSeconds: number): Promise<any> {
    if (!isSupabaseConfigured) {
      const all = getMockSessions();
      const updated = all.map((s: any) =>
        s.room_id === roomId ? { ...s, duration_seconds: durationSeconds } : s
      );
      saveMockSessions(updated);
      return updated.find((s: any) => s.room_id === roomId);
    }

    try {
      const { data, error } = await supabase
        .from('learning_sessions')
        .update({ duration_seconds: durationSeconds })
        .eq('room_id', roomId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error updating duration:', err);
      throw err;
    }
  },

  // Complete session and collect rating/feedback
  async completeSession(
    roomId: string,
    payload: {
      duration_seconds: number;
      progress: number;
      mentor_rating: number;
      learner_feedback: string;
    }
  ): Promise<any> {
    const completedAt = new Date().toISOString();

    if (!isSupabaseConfigured) {
      const all = getMockSessions();
      const sessionIndex = all.findIndex((s: any) => s.room_id === roomId);
      if (sessionIndex === -1) throw new Error('Session not found');

      const session = all[sessionIndex];
      const updatedSession = {
        ...session,
        ...payload,
        status: 'completed' as const,
        completed_at: completedAt
      };
      all[sessionIndex] = updatedSession;
      saveMockSessions(all);

      // Update mock profiles stats
      const mockProfiles = JSON.parse(localStorage.getItem(MOCK_PROFILES_KEY) || '[]');
      
      // Update Learner stats (completed sessions, learning hours)
      const learnerIndex = mockProfiles.findIndex((p: any) => p.id === session.learner_id);
      if (learnerIndex !== -1) {
        const p = mockProfiles[learnerIndex];
        mockProfiles[learnerIndex] = {
          ...p,
          completed_sessions: (p.completed_sessions || 0) + 1,
          learning_hours: Number((p.learning_hours || 0) + (payload.duration_seconds / 3600)).toFixed(2)
        };
      }

      // Update Mentor stats (completed sessions, teaching hours, rating)
      const mentorIndex = mockProfiles.findIndex((p: any) => p.id === session.mentor_id);
      if (mentorIndex !== -1) {
        const p = mockProfiles[mentorIndex];
        const oldRating = p.rating || 5;
        const count = p.completed_sessions || 0;
        const newRating = Number(((oldRating * count) + payload.mentor_rating) / (count + 1)).toFixed(1);

        mockProfiles[mentorIndex] = {
          ...p,
          completed_sessions: count + 1,
          teaching_hours: Number((p.teaching_hours || 0) + (payload.duration_seconds / 3600)).toFixed(2),
          rating: Number(newRating)
        };
      }

      localStorage.setItem(MOCK_PROFILES_KEY, JSON.stringify(mockProfiles));
      return updatedSession;
    }

    try {
      // 1. Update the learning session
      const { data: updatedSession, error: sessionError } = await supabase
        .from('learning_sessions')
        .update({
          status: 'completed',
          completed_at: completedAt,
          duration_seconds: payload.duration_seconds,
          progress: payload.progress,
          mentor_rating: payload.mentor_rating,
          learner_feedback: payload.learner_feedback
        })
        .eq('room_id', roomId)
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 2. Fetch profiles to increment stats
      const { data: learner } = await supabase
        .from('profiles')
        .select('completed_sessions, learning_hours')
        .eq('id', updatedSession.learner_id)
        .single();

      const { data: mentor } = await supabase
        .from('profiles')
        .select('completed_sessions, teaching_hours, rating')
        .eq('id', updatedSession.mentor_id)
        .single();

      const hoursDelta = payload.duration_seconds / 3600;

      // 3. Update learner stats
      if (learner) {
        await supabase
          .from('profiles')
          .update({
            completed_sessions: (learner.completed_sessions || 0) + 1,
            learning_hours: Number((learner.learning_hours || 0) + hoursDelta).toFixed(2)
          })
          .eq('id', updatedSession.learner_id);
      }

      // 4. Update mentor stats
      if (mentor) {
        const oldRating = mentor.rating || 5;
        const count = mentor.completed_sessions || 0;
        const newRating = Number(((oldRating * count) + payload.mentor_rating) / (count + 1)).toFixed(1);

        await supabase
          .from('profiles')
          .update({
            completed_sessions: count + 1,
            teaching_hours: Number((mentor.teaching_hours || 0) + hoursDelta).toFixed(2),
            rating: Number(newRating)
          })
          .eq('id', updatedSession.mentor_id);
      }

      return updatedSession;
    } catch (err) {
      console.error('Error completing session:', err);
      throw err;
    }
  }
};
