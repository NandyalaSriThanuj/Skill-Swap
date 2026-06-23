export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  availability: 'available' | 'busy' | 'offline';
  skills_teach: string[]; // List of skill names/IDs they can teach
  skills_learn: string[]; // List of skill names/IDs they want to learn
  updated_at?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Expert';
  description: string;
  type: 'teach' | 'learn';
  user_id: string;
}

export interface SwapRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  skill_offered: string; // The skill name the sender will teach
  skill_wanted: string; // The skill name the sender wants to learn
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  message: string;
  created_at: string;
  // Included fields for UI
  sender_profile?: Profile;
  receiver_profile?: Profile;
}

export interface Message {
  id: string;
  swap_request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface LearningSession {
  id: string;
  room_id: string;
  learner_id: string;
  mentor_id: string;
  swap_request_id: string;
  session_link: string;
  status: 'active' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'request_received' | 'request_accepted' | 'message_received' | 'review_received';
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface QualificationSession {
  id: string;
  user_id: string;
  skill_name: string;
  status: 'pending' | 'in_progress' | 'passed' | 'failed';
  chat_history: { role: 'assistant' | 'user' | 'system'; content: string }[];
  score?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
  technical_score?: number;
  communication_score?: number;
  teaching_score?: number;
  badge?: string;
  report?: {
    strengths: string;
    weaknesses: string;
    areas_for_improvement: string;
    summary: string;
    suggestions?: string;
    detailed_scores?: {
      technical_accuracy: number;
      communication: number;
      confidence: number;
      fluency: number;
      teaching_ability: number;
      logical_thinking: number;
      practical_experience: number;
      problem_solving: number;
    };
  };
  recommendation?: string;
}

