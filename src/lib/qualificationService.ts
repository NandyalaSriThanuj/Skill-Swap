import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { QualificationSession } from '../types';

const MOCK_INTERVIEW_SESSIONS_KEY = 'skillswap-mock-interview-sessions';
const MOCK_MENTOR_ASSESSMENTS_KEY = 'skillswap-mock-mentor-assessments';

// Helper to check if we should run in mock mode
const isMockMode = !isSupabaseConfigured;

// Helper to get mock data from localStorage
const getMockSessions = (): any[] => {
  const stored = localStorage.getItem(MOCK_INTERVIEW_SESSIONS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveMockSessions = (sessions: any[]) => {
  localStorage.setItem(MOCK_INTERVIEW_SESSIONS_KEY, JSON.stringify(sessions));
};

const getMockAssessments = (): any[] => {
  const stored = localStorage.getItem(MOCK_MENTOR_ASSESSMENTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveMockAssessments = (assessments: any[]) => {
  localStorage.setItem(MOCK_MENTOR_ASSESSMENTS_KEY, JSON.stringify(assessments));
};

// Helper to map DB models to unified QualificationSession type
const mergeSessionAndAssessment = (session: any, assessment: any): QualificationSession => {
  let mappedStatus: QualificationSession['status'] = 'pending';
  if (assessment) {
    mappedStatus = assessment.badge === 'Not Eligible' ? 'failed' : 'passed';
  } else if (session) {
    mappedStatus = session.status === 'completed' ? 'in_progress' : session.status;
  }

  let parsedReport = undefined;
  if (assessment?.report) {
    try {
      parsedReport = assessment.report.startsWith('{') ? JSON.parse(assessment.report) : assessment.report;
    } catch (e) {
      parsedReport = assessment.report;
    }
  }

  return {
    id: session?.id || assessment?.id,
    user_id: session?.user_id || assessment?.user_id,
    skill_name: session?.skill || assessment?.skill,
    status: mappedStatus,
    chat_history: session?.transcript || assessment?.interview_transcript || [],
    score: assessment?.score || undefined,
    feedback: assessment?.recommendation || (parsedReport && typeof parsedReport === 'object' ? parsedReport.summary : parsedReport) || undefined,
    created_at: session?.created_at || assessment?.created_at,
    updated_at: session?.updated_at || assessment?.created_at,
    
    // Tiered evaluation attributes
    technical_score: assessment?.technical_score || undefined,
    communication_score: assessment?.communication_score || undefined,
    teaching_score: assessment?.teaching_score || undefined,
    badge: assessment?.badge || undefined,
    report: parsedReport,
    recommendation: assessment?.recommendation || undefined
  };
};

export const qualificationService = {
  /**
   * Fetches all qualification sessions for a specific user
   */
  async getUserSessions(userId: string): Promise<QualificationSession[]> {
    if (isMockMode) {
      const sessions = getMockSessions().filter(s => s.user_id === userId);
      const assessments = getMockAssessments().filter(a => a.user_id === userId);
      
      const skills = Array.from(new Set([...sessions.map(s => s.skill), ...assessments.map(a => a.skill)]));
      return skills.map(skill => {
        const s = sessions.find(sess => sess.skill === skill);
        const a = assessments.find(ass => ass.skill === skill);
        return mergeSessionAndAssessment(s, a);
      });
    }

    try {
      const { data: sessions, error: sessError } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('user_id', userId);

      if (sessError) throw sessError;

      const { data: assessments, error: assError } = await supabase
        .from('mentor_assessments')
        .select('*')
        .eq('user_id', userId);

      if (assError) throw assError;

      const skills = Array.from(new Set([
        ...(sessions || []).map(s => s.skill), 
        ...(assessments || []).map(a => a.skill)
      ]));

      return skills.map(skill => {
        const s = (sessions || []).find(sess => sess.skill.toLowerCase() === skill.toLowerCase());
        const a = (assessments || []).find(ass => ass.skill.toLowerCase() === skill.toLowerCase());
        return mergeSessionAndAssessment(s, a);
      });
    } catch (err) {
      console.error('Error in getUserSessions (falling back to mock):', err);
      // Mock fallback
      const sessions = getMockSessions().filter(s => s.user_id === userId);
      const assessments = getMockAssessments().filter(a => a.user_id === userId);
      const skills = Array.from(new Set([...sessions.map(s => s.skill), ...assessments.map(a => a.skill)]));
      return skills.map(skill => {
        const s = sessions.find(sess => sess.skill === skill);
        const a = assessments.find(ass => ass.skill === skill);
        return mergeSessionAndAssessment(s, a);
      });
    }
  },

  /**
   * Fetches a specific qualification session by ID
   */
  async getSession(sessionId: string): Promise<QualificationSession | null> {
    if (isMockMode) {
      const allSessions = getMockSessions();
      const session = allSessions.find(s => s.id === sessionId);
      if (!session) return null;

      const assessments = getMockAssessments();
      const assessment = assessments.find(a => a.user_id === session.user_id && a.skill.toLowerCase() === session.skill.toLowerCase());
      return mergeSessionAndAssessment(session, assessment);
    }

    try {
      const { data: session, error: sessError } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessError) throw sessError;

      const { data: assessment } = await supabase
        .from('mentor_assessments')
        .select('*')
        .eq('user_id', session.user_id)
        .eq('skill', session.skill)
        .maybeSingle();

      return mergeSessionAndAssessment(session, assessment);
    } catch (err) {
      console.error(`Error fetching session ${sessionId} (falling back to mock):`, err);
      // Fallback
      const allSessions = getMockSessions();
      const session = allSessions.find(s => s.id === sessionId);
      if (!session) return null;

      const assessments = getMockAssessments();
      const assessment = assessments.find(a => a.user_id === session.user_id && a.skill.toLowerCase() === session.skill.toLowerCase());
      return mergeSessionAndAssessment(session, assessment);
    }
  },

  /**
   * Creates a new qualification session for a user and skill
   */
  async createSession(userId: string, skillName: string): Promise<QualificationSession> {
    const defaultTranscript = [
      {
        role: 'assistant' as const,
        content: `Welcome to the SkillSwap AI Qualification assessment for **${skillName}**! I am your AI evaluation agent. I will ask you a series of technical questions to assess your expertise in ${skillName}. Are you ready to begin?`
      }
    ];

    if (isMockMode) {
      // Clean up previous active session and final assessment for a fresh retry
      const allSessions = getMockSessions().filter(s => !(s.user_id === userId && s.skill.toLowerCase() === skillName.toLowerCase()));
      const allAssessments = getMockAssessments().filter(a => !(a.user_id === userId && a.skill.toLowerCase() === skillName.toLowerCase()));
      
      const newSession = {
        id: `i-sess-${Math.random().toString(36).substr(2, 9)}`,
        room_id: crypto.randomUUID(),
        user_id: userId,
        skill: skillName,
        status: 'pending',
        transcript: defaultTranscript,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      allSessions.push(newSession);
      saveMockSessions(allSessions);
      saveMockAssessments(allAssessments);

      return mergeSessionAndAssessment(newSession, null);
    }

    try {
      // Clean up previous active session and final assessment for a fresh retry
      await supabase.from('mentor_assessments').delete().eq('user_id', userId).eq('skill', skillName);
      await supabase.from('interview_sessions').delete().eq('user_id', userId).eq('skill', skillName);

      const { data, error } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: userId,
          skill: skillName,
          status: 'pending',
          transcript: defaultTranscript
        })
        .select()
        .single();

      if (error) throw error;
      return mergeSessionAndAssessment(data, null);
    } catch (err) {
      console.error('Error creating qualification session in Supabase (falling back to mock):', err);
      // Mock fallback
      const allSessions = getMockSessions().filter(s => !(s.user_id === userId && s.skill.toLowerCase() === skillName.toLowerCase()));
      const allAssessments = getMockAssessments().filter(a => !(a.user_id === userId && a.skill.toLowerCase() === skillName.toLowerCase()));
      
      const newSession = {
        id: `i-sess-${Math.random().toString(36).substr(2, 9)}`,
        room_id: crypto.randomUUID(),
        user_id: userId,
        skill: skillName,
        status: 'pending',
        transcript: defaultTranscript,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      allSessions.push(newSession);
      saveMockSessions(allSessions);
      saveMockAssessments(allAssessments);

      return mergeSessionAndAssessment(newSession, null);
    }
  },

  /**
   * Updates an existing session
   */
  async updateSession(sessionId: string, updates: Partial<QualificationSession>): Promise<QualificationSession> {
    const updatedTime = new Date().toISOString();
    
    if (isMockMode) {
      const allSessions = getMockSessions();
      const index = allSessions.findIndex(s => s.id === sessionId);
      if (index === -1) throw new Error('Session not found');

      const session = allSessions[index];
      
      // Update session values
      if (updates.chat_history) {
        session.transcript = updates.chat_history;
      }
      if (updates.status) {
        session.status = (updates.status === 'passed' || updates.status === 'failed') ? 'completed' : updates.status;
      }
      session.updated_at = updatedTime;
      allSessions[index] = session;
      saveMockSessions(allSessions);

      // Handle final assessment insertion if completed
      let assessment = null;
      if (updates.status === 'passed' || updates.status === 'failed') {
        const allAssessments = getMockAssessments().filter(a => !(a.user_id === session.user_id && a.skill.toLowerCase() === session.skill.toLowerCase()));
        
        assessment = {
          id: `ass-${Math.random().toString(36).substr(2, 9)}`,
          user_id: session.user_id,
          skill: session.skill,
          interview_transcript: updates.chat_history || session.transcript,
          score: updates.score || 0,
          report: typeof updates.report === 'object' ? JSON.stringify(updates.report) : (updates.report || updates.feedback),
          badge: updates.badge || (updates.status === 'passed' ? 'Verified Mentor' : 'Not Eligible'),
          recommendation: updates.recommendation || updates.feedback,
          technical_score: updates.technical_score,
          communication_score: updates.communication_score,
          teaching_score: updates.teaching_score,
          created_at: updatedTime
        };
        allAssessments.push(assessment);
        saveMockAssessments(allAssessments);
      } else {
        const assessments = getMockAssessments();
        assessment = assessments.find(a => a.user_id === session.user_id && a.skill.toLowerCase() === session.skill.toLowerCase()) || null;
      }

      return mergeSessionAndAssessment(session, assessment);
    }

    try {
      // First fetch the existing session to get user_id and skill
      const { data: currentSession, error: fetchErr } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchErr) throw fetchErr;

      // Prepare session table updates
      const sessionUpdates: any = { updated_at: updatedTime };
      if (updates.chat_history) {
        sessionUpdates.transcript = updates.chat_history;
      }
      if (updates.status) {
        sessionUpdates.status = (updates.status === 'passed' || updates.status === 'failed') ? 'completed' : updates.status;
      }

      const { data: session, error: sessionErr } = await supabase
        .from('interview_sessions')
        .update(sessionUpdates)
        .eq('id', sessionId)
        .select()
        .single();

      if (sessionErr) throw sessionErr;

      // Prepare assessment table updates if concluded
      let assessment = null;
      if (updates.status === 'passed' || updates.status === 'failed') {
        const reportContent = typeof updates.report === 'object' ? JSON.stringify(updates.report) : (updates.report || updates.feedback);
        const earnedBadge = updates.badge || (updates.status === 'passed' ? 'Verified Mentor' : 'Not Eligible');
        
        const { data: assData, error: assErr } = await supabase
          .from('mentor_assessments')
          .upsert({
            user_id: currentSession.user_id,
            skill: currentSession.skill,
            interview_transcript: updates.chat_history || currentSession.transcript,
            score: updates.score || 0,
            report: reportContent,
            badge: earnedBadge,
            recommendation: updates.recommendation || updates.feedback,
            technical_score: updates.technical_score,
            communication_score: updates.communication_score,
            teaching_score: updates.teaching_score
          }, {
            onConflict: 'user_id,skill'
          })
          .select()
          .single();

        if (assErr) throw assErr;
        assessment = assData;
      } else {
        const { data: assData } = await supabase
          .from('mentor_assessments')
          .select('*')
          .eq('user_id', currentSession.user_id)
          .eq('skill', currentSession.skill)
          .maybeSingle();
        
        assessment = assData;
      }

      return mergeSessionAndAssessment(session, assessment);
    } catch (err) {
      console.error(`Error updating session ${sessionId} (falling back to mock):`, err);
      // Fallback
      const allSessions = getMockSessions();
      const index = allSessions.findIndex(s => s.id === sessionId);
      if (index === -1) throw new Error('Session not found');

      const session = allSessions[index];
      
      if (updates.chat_history) {
        session.transcript = updates.chat_history;
      }
      if (updates.status) {
        session.status = (updates.status === 'passed' || updates.status === 'failed') ? 'completed' : updates.status;
      }
      session.updated_at = updatedTime;
      allSessions[index] = session;
      saveMockSessions(allSessions);

      let assessment = null;
      if (updates.status === 'passed' || updates.status === 'failed') {
        const allAssessments = getMockAssessments().filter(a => !(a.user_id === session.user_id && a.skill.toLowerCase() === session.skill.toLowerCase()));
        
        assessment = {
          id: `ass-${Math.random().toString(36).substr(2, 9)}`,
          user_id: session.user_id,
          skill: session.skill,
          interview_transcript: updates.chat_history || session.transcript,
          score: updates.score || 0,
          report: typeof updates.report === 'object' ? JSON.stringify(updates.report) : (updates.report || updates.feedback),
          badge: updates.badge || (updates.status === 'passed' ? 'Verified Mentor' : 'Not Eligible'),
          recommendation: updates.recommendation || updates.feedback,
          technical_score: updates.technical_score,
          communication_score: updates.communication_score,
          teaching_score: updates.teaching_score,
          created_at: updatedTime
        };
        allAssessments.push(assessment);
        saveMockAssessments(allAssessments);
      } else {
        const assessments = getMockAssessments();
        assessment = assessments.find(a => a.user_id === session.user_id && a.skill.toLowerCase() === session.skill.toLowerCase()) || null;
      }

      return mergeSessionAndAssessment(session, assessment);
    }
  },

  /**
   * Fetches all passed qualification sessions across the platform.
   * This is used to display verified badges on cards in the Browse view.
   */
  async getAllPassedSessions(): Promise<QualificationSession[]> {
    if (isMockMode) {
      const assessments = getMockAssessments().filter(a => a.badge !== 'Not Eligible');
      return assessments.map(a => mergeSessionAndAssessment(null, a));
    }

    try {
      const { data: assessments, error } = await supabase
        .from('mentor_assessments')
        .select('*')
        .neq('badge', 'Not Eligible');

      if (error) throw error;
      return (assessments || []).map(a => mergeSessionAndAssessment(null, a));
    } catch (err) {
      console.error('Error fetching all passed sessions:', err);
      // Fallback
      const assessments = getMockAssessments().filter(a => a.badge !== 'Not Eligible');
      return assessments.map(a => mergeSessionAndAssessment(null, a));
    }
  }
};
