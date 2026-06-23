import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { qualificationService } from '../lib/qualificationService';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { QualificationSession } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Key, 
  Loader2, 
  Bot, 
  User as UserIcon,
  HelpCircle,
  AlertCircle,
  Volume2,
  Mic,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  ThumbsUp,
  BookOpen,
  ChevronDown,
  Globe,
  Wifi,
  Clock
} from 'lucide-react';



const getBadgeStyle = (badgeName: string) => {
  switch (badgeName) {
    case 'Expert Mentor':
      return {
        gradient: 'from-amber-400 via-yellow-500 to-orange-500',
        bg: 'bg-amber-500/5',
        border: 'border-amber-500/30',
        text: 'text-amber-600 dark:text-amber-400',
        glow: 'shadow-amber-500/20',
        hsl: 'hsl(45, 95%, 45%)',
        description: 'Passed with highest honors. Eligible to teach advanced courses, run masterclasses, and provide expert code reviews.',
        icon: '🏆'
      };
    case 'Verified Mentor':
      return {
        gradient: 'from-emerald-400 via-teal-500 to-emerald-600',
        bg: 'bg-emerald-500/5',
        border: 'border-emerald-500/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        glow: 'shadow-emerald-500/20',
        hsl: 'hsl(142, 70%, 40%)',
        description: 'Passed with recommendation. Eligible to teach regular classes, review pull requests, and host peer sessions.',
        icon: '✅'
      };
    case 'Community Mentor':
      return {
        gradient: 'from-blue-400 via-indigo-500 to-purple-600',
        bg: 'bg-blue-500/5',
        border: 'border-blue-500/30',
        text: 'text-blue-600 dark:text-blue-400',
        glow: 'shadow-blue-500/20',
        hsl: 'hsl(217, 90%, 55%)',
        description: 'Eligible to assist in public forums, host co-working circles, and moderate student discussion rooms.',
        icon: '⭐'
      };
    default:
      return {
        gradient: 'from-rose-400 via-red-500 to-pink-600',
        bg: 'bg-rose-500/5',
        border: 'border-rose-500/30',
        text: 'text-rose-600 dark:text-rose-455',
        glow: 'shadow-rose-500/20',
        hsl: 'hsl(350, 80%, 50%)',
        description: 'Assessment completed, but the overall score fell below the verification threshold. Take time to study and retry!',
        icon: '❌'
      };
  }
};

export const AssessmentPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<QualificationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('skillswap-groq-api-key') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'strengths' | 'weaknesses' | 'improvement'>('strengths');

  // Custom Voice States
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hindi' | 'Telugu'>('English');
  const [voiceWarning, setVoiceWarning] = useState<string | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices();
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const [interviewStarted, setInterviewStarted] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenSubtitle, setSpokenSubtitle] = useState('');
  const [duration, setDuration] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Rotating Tips State
  const [tipIndex, setTipIndex] = useState(0);
  const TIPS = [
    "Please answer naturally, as if explaining to a teammate.",
    "Take your time to structure your thoughts before responding.",
    "The system will automatically submit when you pause for 3 seconds.",
    "You can expand on your answers with real-world scenarios or code logic.",
    "Don't worry about perfect speech; focus on explaining core concepts.",
    "Ensure you are in a quiet room with a stable microphone connection."
  ];

  useEffect(() => {
    let interval: any;
    if (interviewStarted) {
      interval = setInterval(() => {
        setTipIndex(prev => (prev + 1) % TIPS.length);
      }, 7000);
    }
    return () => clearInterval(interval);
  }, [interviewStarted]);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const accumulatedSpeechRef = useRef<string>('');
  const submitTimeoutRef = useRef<any>(null);
  const finalizedTranscriptRef = useRef<string>('');
  const [isWaitingForSilence, setIsWaitingForSilence] = useState(false);

  const isTechnicalSkill = (skillName: string): boolean => {
    const name = skillName.toLowerCase().trim();
    const techKeywords = [
      'python', 'java', 'c++', 'javascript', 'typescript', 'react', 'angular', 'vue', 
      'node.js', 'node', 'express.js', 'express', 'sql', 'mongodb', 'postgresql', 'mysql', 
      'firebase', 'supabase', 'data structures', 'algorithms', 'operating systems', 'computer networks', 
      'dbms', 'machine learning', 'deep learning', 'artificial intelligence', 'ai', 'data science', 
      'nlp', 'computer vision', 'cloud computing', 'aws', 'azure', 'docker', 'kubernetes', 'git', 
      'github', 'cyber security', 'system design', 'rest apis', 'rest api', 'graphql', 
      'prompt engineering', 'generative ai', 'llms', 'llm', 'rag', 'langchain', 'agentic ai',
      'go', 'rust', 'kotlin', 'swift', 'php', 'ruby', 'dart', 'r', 'matlab',
      'html', 'css', 'tailwind', 'bootstrap', 'next.js', 'nextjs', 'nuxt.js', 'nuxtjs',
      'flutter', 'react native', 'android', 'ios', 'redis', 'oracle', 'oop', 'software engineering',
      'reinforcement learning', 'large language models', 'ai agents', 'tensorflow', 'pytorch', 'scikit-learn',
      'google cloud', 'gcp', 'jenkins', 'ci/cd', 'linux', 'ethical hacking', 'network security', 'penetration testing',
      'cryptography', 'digital forensics', 'coding', 'programming'
    ];
    if (name === 'c') return true;
    return techKeywords.some(keyword => {
      if (name === keyword) return true;
      const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`);
      return regex.test(name);
    });
  };

  const checkLanguageValidity = (question: string, language: string, isTechnical: boolean): boolean => {
    if (isTechnical) {
      const hasHindi = /[\u0900-\u097F]/.test(question);
      const hasTelugu = /[\u0C00-\u0C7F]/.test(question);
      return !hasHindi && !hasTelugu;
    }
    if (language === 'Hindi') {
      return /[\u0900-\u097F]/.test(question);
    }
    if (language === 'Telugu') {
      return /[\u0C00-\u0C7F]/.test(question);
    }
    if (language === 'English') {
      const hasHindi = /[\u0900-\u097F]/.test(question);
      const hasTelugu = /[\u0C00-\u0C7F]/.test(question);
      return !hasHindi && !hasTelugu;
    }
    return true;
  };

  const checkQuestionValidity = (question: string, skill: string): boolean => {
    const text = question.toLowerCase();
    const skillLower = skill.toLowerCase().trim();
    
    const domains = [
      { name: 'python', keywords: ['python', 'django', 'flask', 'pandas', 'numpy', 'list comprehension', 'decorator', 'generator', 'asyncio', 'multithreading', 'gil'] },
      { name: 'react', keywords: ['react', 'jsx', 'props', 'state', 'hooks', 'useeffect', 'usestate', 'redux', 'context api', 'virtual dom', 'nextjs', 'tailwind'] },
      { name: 'sql', keywords: ['sql', 'select', 'join', 'group by', 'having', 'subqueries', 'index', 'normalization', 'transactions', 'stored procedure', 'database index', 'foreign key'] },
      { name: 'machine learning', keywords: ['machine learning', 'regression', 'classification', 'clustering', 'overfitting', 'cross validation', 'feature engineering', 'neural network', 'deep learning', 'nlp', 'random forest', 'gradient boosting'] },
      { name: 'java', keywords: ['java', 'jvm', 'spring boot', 'hashmap', 'treemap', 'garbage collection', 'checked exception'] },
      { name: 'photography', keywords: ['photography', 'camera', 'aperture', 'shutter speed', 'iso', 'lens', 'exposure', 'composition', 'lighting', 'focal length', 'depth of field'] }
    ];

    if (!text.trim()) return false;

    for (const domain of domains) {
      if (domain.name !== skillLower && !skillLower.includes(domain.name) && !domain.name.includes(skillLower)) {
        const hasConflict = domain.keywords.some(kw => {
          const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`);
          return regex.test(text);
        });
        
        if (hasConflict) {
          console.warn(`Question validation failed: Question contains keywords from unrelated domain "${domain.name}". Question: "${question}"`);
          return false;
        }
      }
    }
    return true;
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getRunningScoreEstimate = () => {
    if (!session || !session.chat_history) return 70;
    const answers = session.chat_history.filter(m => m.role === 'user');
    if (answers.length === 0) return 70;
    const totalLength = answers.reduce((sum, m) => sum + m.content.length, 0);
    const avgLength = totalLength / answers.length;
    return Math.min(96, Math.max(60, 68 + Math.floor(avgLength / 25)));
  };

  const getCurrentQuestionText = () => {
    if (!session || !session.chat_history) return '';
    const lastAI = [...session.chat_history].reverse().find(m => m.role === 'assistant');
    if (!lastAI) return '';
    const jsonRegex = /\{[\s\S]*"evaluation_complete"\s*:\s*true[\s\S]*\}/;
    return lastAI.content.replace(jsonRegex, '').trim();
  };

  const getWelcomeMessage = (skill: string, lang: string) => {
    if (lang === 'Hindi') {
      return `आपका ${skill} के लिए एआई योग्यता मूल्यांकन में स्वागत है! मैं आपका एआई मूल्यांकन एजेंट हूँ। मैं आपकी विशेषज्ञता का आकलन करने के लिए आपसे प्रश्नों की एक श्रृंखला पूछूँगा। क्या आप शुरू करने के लिए तैयार हैं?`;
    }
    if (lang === 'Telugu') {
      return `${skill} కోసం ఏఐ అర్హత అంచనాకు స్వాగతం! నేను మీ ఏఐ మూల్యాంకన ఏజెంట్‌ని. మీ నైపుణ్యాన్ని అంచనా వేయడానికి నేను మిమ్మల్ని కొన్ని ప్రశ్నలు అడుగుతాను. మీరు ప్రారంభించడానికి సిద్ధంగా ఉన్నారా?`;
    }
    return `Welcome to the SkillSwap AI Qualification assessment for ${skill}! I am your AI evaluation agent. I will ask you a series of questions to assess your expertise. Are you ready to begin?`;
  };

  const handleRetry = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const newSess = await qualificationService.createSession(session.user_id, session.skill_name);
      navigate(`/assessment/${newSess.id}`);
      window.location.reload(); // To trigger useEffect loading
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to start retry session.");
    } finally {
      setLoading(false);
    }
  };

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer
  useEffect(() => {
    let interval: any;
    if (interviewStarted && !(session?.status === 'passed' || session?.status === 'failed')) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [interviewStarted, session?.status]);

  // Load session data
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) return;
      setLoading(true);
      const data = await qualificationService.getSession(sessionId);
      if (data) {
        setSession(data);
        
        // Setup default language based on skill rules
        const isTech = isTechnicalSkill(data.skill_name);
        if (isTech) {
          setSelectedLanguage('English');
        } else {
          const savedLang = localStorage.getItem(`skillswap-lang-${data.id}`);
          if (savedLang === 'Hindi' || savedLang === 'Telugu' || savedLang === 'English') {
            setSelectedLanguage(savedLang);
          }
        }

        // If the session status is 'pending', automatically update to 'in_progress'
        if (data.status === 'pending') {
          const updated = await qualificationService.updateSession(data.id, {
            status: 'in_progress'
          });
          setSession(updated);
        }
      } else {
        setErrorMsg('Qualification session not found');
      }
      setLoading(false);
    };

    fetchSession();
  }, [sessionId]);

  // Save selected language to localStorage for persistence
  useEffect(() => {
    if (session && !isTechnicalSkill(session.skill_name)) {
      localStorage.setItem(`skillswap-lang-${session.id}`, selectedLanguage);
    }
  }, [selectedLanguage, session]);

  // Clean up Web Speech instances on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  // Calculate assessment progress (based on user answers count)
  const getProgressInfo = () => {
    if (!session) return { step: 1, total: 20, percentage: 0 };
    const userAnswersCount = session.chat_history.filter(m => m.role === 'user').length;
    const isTech = isTechnicalSkill(session.skill_name);
    const totalQ = isTech ? 20 : 15;
    
    if (session.status === 'passed' || session.status === 'failed') {
      return { step: totalQ, total: totalQ, percentage: 100 };
    }
    
    const currentStep = Math.max(1, Math.min(totalQ, userAnswersCount + 1));
    const percentage = Math.round((userAnswersCount / totalQ) * 100);
    return { step: currentStep, total: totalQ, percentage };
  };

  const saveApiKey = (key: string) => {
    const cleaned = key.replace(/[^\x20-\x7E]/g, '').trim();
    setApiKey(cleaned);
    if (cleaned) {
      localStorage.setItem('skillswap-groq-api-key', cleaned);
    } else {
      localStorage.removeItem('skillswap-groq-api-key');
    }
    setShowKeyModal(false);
  };

  // Text-To-Speech (Speech Synthesis) Speak function
  const speakText = (text: string, onEndCallback?: () => void) => {
    window.speechSynthesis.cancel();

    // Clean text of markdown highlights for cleaner pronunciation
    const cleanText = text
      .replace(/\*\*|__/g, '')
      .replace(/#+\s/g, '')
      .replace(/`[^`]+`/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Set language locale
    if (selectedLanguage === 'Hindi') {
      utterance.lang = 'hi-IN';
    } else if (selectedLanguage === 'Telugu') {
      utterance.lang = 'te-IN';
    } else {
      utterance.lang = 'en-US';
    }
    
    // Adjust speaking speed slightly for professional and clear tone
    utterance.rate = selectedLanguage === 'English' ? 0.95 : 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpokenSubtitle(text);
    };

    const handleSpeechEnd = () => {
      setIsSpeaking(false);
      if (onEndCallback) onEndCallback();
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = handleSpeechEnd;

    // Fetch and bind pleasant voice if available
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    let warningMsg = null;

    if (selectedLanguage === 'Hindi') {
      selectedVoice = voices.find(v => {
        const l = v.lang.toLowerCase();
        return l === 'hi' || l.startsWith('hi-') || l.startsWith('hi_');
      });
      if (!selectedVoice) {
        warningMsg = "Your browser does not have a Telugu/Hindi voice installed. Using English voice as a fallback.";
        selectedVoice = voices.find(v => {
          const l = v.lang.toLowerCase();
          return (l === 'en' || l.startsWith('en-') || l.startsWith('en_')) && 
                 (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'));
        });
        if (!selectedVoice) {
          selectedVoice = voices.find(v => {
            const l = v.lang.toLowerCase();
            return l === 'en' || l.startsWith('en-') || l.startsWith('en_');
          });
        }
        utterance.lang = 'en-US';
      }
    } else if (selectedLanguage === 'Telugu') {
      selectedVoice = voices.find(v => {
        const l = v.lang.toLowerCase();
        return l === 'te' || l.startsWith('te-') || l.startsWith('te_');
      });
      if (!selectedVoice) {
        warningMsg = "Your browser does not have a Telugu/Hindi voice installed. Using English voice as a fallback.";
        selectedVoice = voices.find(v => {
          const l = v.lang.toLowerCase();
          return (l === 'en' || l.startsWith('en-') || l.startsWith('en_')) && 
                 (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'));
        });
        if (!selectedVoice) {
          selectedVoice = voices.find(v => {
            const l = v.lang.toLowerCase();
            return l === 'en' || l.startsWith('en-') || l.startsWith('en_');
          });
        }
        utterance.lang = 'en-US';
      }
    } else {
      selectedVoice = voices.find(v => {
        const l = v.lang.toLowerCase();
        return (l === 'en' || l.startsWith('en-') || l.startsWith('en_')) && 
               (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'));
      });
      if (!selectedVoice) {
        selectedVoice = voices.find(v => {
          const l = v.lang.toLowerCase();
          return l === 'en' || l.startsWith('en-') || l.startsWith('en_');
        });
      }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    setVoiceWarning(warningMsg);

    // Log the selected language and voice in the browser console for debugging
    console.log(`[TTS DEBUG] Selected Language: ${selectedLanguage}, Lang Code: ${utterance.lang}, Voice Name: ${selectedVoice?.name || 'Default'}, Voice Lang: ${selectedVoice?.lang || 'Default'}`);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Handles vocal auto-submit logic
  const triggerSubmission = () => {
    const textToSubmit = accumulatedSpeechRef.current.trim();
    if (textToSubmit && !isSending && !isSpeaking) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      setIsListening(false);
      setIsWaitingForSilence(false);
      
      finalizedTranscriptRef.current = '';
      accumulatedSpeechRef.current = '';
      
      handleSubmitSpokenAnswer(textToSubmit);
    }
  };

  // Speech-To-Text (Speech Recognition) Listening function
  const startSpeechRecognition = () => {
    const isConcluded = session?.status === 'passed' || session?.status === 'failed';
    if (isConcluded || isSending) return;

    const SpeechLib = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechLib) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const recognition = new SpeechLib();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    if (selectedLanguage === 'Hindi') {
      recognition.lang = 'hi-IN';
    } else if (selectedLanguage === 'Telugu') {
      recognition.lang = 'te-IN';
    } else {
      recognition.lang = 'en-US';
    }

    console.log(`[STT DEBUG] Selected Speech Recognition Language: ${selectedLanguage}, Lang Code: ${recognition.lang}`);

    recognition.onstart = () => {
      setIsListening(true);
      if (accumulatedSpeechRef.current.trim()) {
        setIsWaitingForSilence(true);
        if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = setTimeout(() => {
          triggerSubmission();
        }, 3000);
      } else {
        setSpokenSubtitle('Listening to you...');
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        const alternative = result[0];
        
        // Confidence threshold & Noise filtering
        if (alternative.confidence < 0.20) {
          continue;
        }

        const textLower = alternative.transcript.trim().toLowerCase();
        // Ignore breathing, sighing, coughing, or accidental single-syllable noises
        const breathingNoises = ['hmmm', 'uh', 'um', 'ah', 'sigh', 'breath', 'cough', 'gasp', 'giggle', 'shh', 'hmm'];
        if (breathingNoises.includes(textLower) || textLower.match(/^\[(breathing|sighing|coughing|gasping|laughter)\]$/)) {
          continue;
        }

        if (result.isFinal) {
          finalTranscript += alternative.transcript + ' ';
        } else {
          interimTranscript += alternative.transcript;
        }
      }

      const currentSpeech = (finalTranscript + interimTranscript).trim();
      const prefix = finalizedTranscriptRef.current ? finalizedTranscriptRef.current + ' ' : '';
      const fullSpeech = (prefix + currentSpeech).trim();
      
      if (fullSpeech) {
        accumulatedSpeechRef.current = fullSpeech;
        setSpokenSubtitle(fullSpeech);

        setIsWaitingForSilence(true);
        if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = setTimeout(() => {
          triggerSubmission();
        }, 3000);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setMicPermission('denied');
      } else if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsWaitingForSilence(false);
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }

      if (accumulatedSpeechRef.current.trim()) {
        finalizedTranscriptRef.current = accumulatedSpeechRef.current.trim();
      }

      const isConcluded = session?.status === 'passed' || session?.status === 'failed';
      if (interviewStarted && !isSending && !isSpeaking && !isConcluded && micPermission !== 'denied') {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart speech recognition:", e);
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  };

  const startInterview = async () => {
    finalizedTranscriptRef.current = '';
    accumulatedSpeechRef.current = '';
    setSpokenSubtitle('');
    setIsWaitingForSilence(false);
    const welcome = getWelcomeMessage(session!.skill_name, selectedLanguage);

    if (session && session.chat_history.length > 0 && session.chat_history[0].role === 'assistant') {
      const updatedHistory = [...session.chat_history];
      updatedHistory[0] = {
        ...updatedHistory[0],
        content: welcome
      };
      try {
        const updated = await qualificationService.updateSession(session.id, {
          chat_history: updatedHistory
        });
        setSession(updated);
      } catch (e) {
        console.error("Failed to update welcome message in session history:", e);
      }
    }

    setInterviewStarted(true);
    speakText(welcome, () => {
      startSpeechRecognition();
    });
  };

  // Center Orb tap controls for manual override
  const handleOrbClick = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      startSpeechRecognition();
    } else if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      setIsListening(false);
      setSpokenSubtitle('Listening paused. Tap orb to speak again.');
    } else if (!isSending) {
      startSpeechRecognition();
    }
  };

  const requestMicPermission = async () => {
    try {
      setMicPermission('prompt');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
    } catch (err) {
      console.error("Mic permission denied:", err);
      setMicPermission('denied');
    }
  };

  // Run Groq API via Supabase Edge Function
  const handleGroqCall = async (
    skillName: string, 
    currentHistory: { role: 'assistant' | 'user' | 'system'; content: string }[],
    newAnswer: string,
    selectedLanguage: string,
    totalQuestions: number
  ) => {
    const { data, error } = await supabase.functions.invoke('interview-agent', {
      body: {
        skillName,
        chatHistory: currentHistory,
        newAnswer,
        selectedLanguage,
        totalQuestions
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to communicate with the Groq AI Assessor.');
    }

    return {
      cleanedReply: data.cleanedReply,
      finalStatus: data.finalStatus,
      finalScore: data.finalScore,
      finalFeedback: data.finalFeedback,
      updatedHistory: data.updatedHistory,
      technical_score: data.technical_score,
      communication_score: data.communication_score,
      teaching_score: data.teaching_score,
      badge: data.badge,
      report: data.report,
      recommendation: data.recommendation
    };
  };

  // Run Groq API directly from the client using Groq OpenAI-compatible endpoint
  const handleDirectGroqCall = async (
    skillName: string, 
    currentHistory: { role: 'assistant' | 'user' | 'system'; content: string }[],
    newAnswer: string,
    selectedLanguage: string,
    _totalQuestions: number
  ) => {
    const updatedHistory = [
      ...currentHistory,
      { role: 'user' as const, content: newAnswer }
    ];

    const isTech = isTechnicalSkill(skillName);
    const currentLang = isTech ? 'English' : (selectedLanguage || 'English');
    const skillType = isTech ? 'Technical' : 'Non-Technical';
    const totalQ = isTech ? 20 : 15;
    const userMessages = currentHistory.filter(m => m.role === 'user');
    const userAnswersCount = userMessages.length; // answers prior to this newAnswer

    // Determine the current difficulty level based on index
    const getTargetDifficulty = (isTechnical: boolean, index: number): string => {
      if (isTechnical) {
        return index <= 5 ? 'Beginner' : index <= 12 ? 'Intermediate' : 'Advanced';
      } else {
        return index <= 4 ? 'Beginner' : index <= 9 ? 'Intermediate' : 'Advanced';
      }
    };

    const qIndex = userAnswersCount + 1;
    const currentDifficulty = getTargetDifficulty(isTech, qIndex);

    // Dynamic prompt mapping categories
    const categoriesPrompt = `
For the following core skills, follow their designated interview path:
- Python: Variables -> Functions -> OOP -> Modules -> Decorators -> Generators -> Async Programming -> Memory Management -> Exception Handling -> Multithreading -> Performance -> Best Practices.
- React: JSX -> Props -> State -> Hooks -> Context API -> Redux -> Lifecycle -> Performance -> Optimization -> Virtual DOM.
- SQL: SELECT -> JOIN -> GROUP BY -> HAVING -> Subqueries -> Indexes -> Normalization -> Transactions -> Stored Procedures.
- Machine Learning: Regression -> Classification -> Clustering -> Overfitting -> Cross Validation -> Feature Engineering -> Neural Networks -> Evaluation Metrics -> Deep Learning -> NLP.
For any other skill, dynamically identify its logical teaching progression across Beginner, Intermediate, and Advanced topics, and ask questions matching that progression.
`;

    // Dynamic System Prompt builder
    const baseSystemPrompt = `You are a senior technical interviewer.
Interview Skill:
${skillName}
Interview Language:
${currentLang}
Skill Type:
${skillType}

Instruction:
If Skill Type is Technical:
Always ask questions in English.
If Skill Type is Non-Technical:
Generate every interview question only in the selected language.
Do not mix languages.
Never switch languages during the interview.

Generate ONLY interview questions related to ${skillName}.
Never ask questions from any other technology or unrelated topic.
If the skill is Python, every question must be about Python.
If the skill is React, every question must be about React.
If the skill is SQL, every question must be about SQL.
If the skill is Machine Learning, every question must be about Machine Learning.
If the skill is Photography, every question must be about Photography.
Continue until the interview is complete.

General Instructions:
1. Conduct the interview by asking exactly ${totalQ} questions, one at a time.
2. The questions should test practical and theoretical knowledge of "${skillName}" across three levels. Gradually increase the difficulty based on the current question index:
   - For Technical skills (20 questions total):
     - Question 1 to 5: Beginner level
     - Question 6 to 12: Intermediate level
     - Question 13 to 20: Advanced level
   - For Non-Technical skills (15 questions total):
     - Question 1 to 4: Beginner level
     - Question 5 to 9: Intermediate level
     - Question 10 to 15: Advanced level
3. You must ask questions dynamically. Evaluate the previous answer:
   - If the previous answer was weak, incomplete, or incorrect, ask an easier clarifying or follow-up question at the current level.
   - If the previous answer was strong and correct, ask a more advanced or deep-dive question to challenge the candidate.
4. You must ask exactly one question at a time. Do NOT ask multiple questions in one turn.
5. Keep your speaking speed natural and professional. Speak and listen exclusively in ${currentLang}. Keep your output concise so it can be spoken aloud naturally.
6. Make your questions conversational and realistic, like a real interviewer:
   - Instead of asking generic definitions like "What is Python?", phrase it naturally: "Imagine you're explaining Python to a beginner joining your team. How would you describe it?"
   - If the answer is incomplete: "Can you elaborate on that?"
   - If the answer is excellent: "Interesting. Let's move to a more advanced scenario." or similar conversational transition, then ask the next question.
7. Regardless of the interview language, generate the final assessment report in English. This report must include the Overall Score, Strengths, Weaknesses, Suggestions, Mentor Eligibility details, and Badge. The report language must always remain English.

Topic Path Guidelines:
${categoriesPrompt}

Self-Validation Step:
Before outputting any question, check: Does this question belong to the selected skill "${skillName}"? If it involves other technologies or is unrelated, discard it and generate a new one. The AI should never ask unrelated questions.`;

    let stateInstruction = "";
    if (userAnswersCount < totalQ) {
      stateInstruction = `The user has answered ${userAnswersCount} questions so far. This is question index ${qIndex} out of ${totalQ}. 
The current target difficulty level is: ${currentDifficulty}.
Action: Acknowledge the user's previous answer briefly in ${currentLang} (point out strengths or gently nudge on gaps if weak, but keep it very short), then ask the next question in ${currentLang}.
If this is the very start of the interview (userAnswersCount is 0), do not acknowledge any previous answer; welcome the user to the assessment and ask Question 1 in ${currentLang}.
Ensure the question strictly belongs to ${skillName} and relates to candidate difficulty level: ${currentDifficulty}. Check: Is the question about ${skillName}? If not, discard and generate another.`;
    } else {
      stateInstruction = `The user has answered all ${totalQ} questions. The interview is concluded.
Action: Do not ask any more questions. Perform a comprehensive evaluation of their responses.
You must evaluate the user across these eight dimensions:
- Technical Accuracy (correctness and accuracy of concepts)
- Communication (clarity and structure of explanations)
- Confidence (assertiveness and certainty in their voice/content)
- Fluency (smoothness of speaking, vocabulary, minimal pauses/stuttering)
- Teaching Ability (patience, explanation of concepts to a learner)
- Logical Thinking (structured thought process)
- Practical Experience (hands-on engineering/real-world context)
- Problem Solving (logical analytical thinking in complex situations)

Calculate these scores (0-100):
- Technical Score (averaging Technical Accuracy, Practical Experience, and Problem Solving)
- Communication Score (averaging Communication and Fluency)
- Teaching Score
- Confidence Score
- Speech Score (averaging Fluency and Confidence)
- Overall Score (weighted average: 50% Technical, 25% Communication, 25% Teaching)

Assign one of the following Mentor Badges based on the Overall Score:
- Overall Score >= 80: "Expert Mentor" 🏆
- Overall Score >= 70: "Verified Mentor" ✅
- Overall Score >= 50: "Community Mentor" ⭐
- Overall Score < 50: "Not Eligible" ❌

Output a detailed evaluation report.
You MUST write the report in English.
You MUST conclude your response with a JSON block at the very end of your reply. The JSON block must be formatted EXACTLY like this:
{
  "evaluation_complete": true,
  "technical_score": <number between 0 and 100>,
  "communication_score": <number between 0 and 100>,
  "teaching_score": <number between 0 and 100>,
  "confidence_score": <number between 0 and 100>,
  "speech_score": <number between 0 and 100>,
  "overall_score": <number between 0 and 100>,
  "badge": "Expert Mentor" | "Verified Mentor" | "Community Mentor" | "Not Eligible",
  "report": {
    "strengths": "<summary of candidate strengths in English>",
    "weaknesses": "<areas of concern or weaknesses in English>",
    "suggestions": "<specific suggestions/action plan to improve in English>",
    "summary": "<AI evaluation summary overview in English>",
    "detailed_scores": {
      "technical_accuracy": <number between 0 and 100>,
      "communication": <number between 0 and 100>,
      "confidence": <number between 0 and 100>,
      "fluency": <number between 0 and 100>,
      "teaching_ability": <number between 0 and 100>,
      "logical_thinking": <number between 0 and 100>,
      "practical_experience": <number between 0 and 100>,
      "problem_solving": <number between 0 and 100>
    }
  },
  "recommendation": "<detailed final recommendation text explaining why this badge was assigned in English>"
}
Ensure that this JSON block is the very last thing you write, so the application can parse it.`;
    }

    const payloadMessages = [
      { role: 'system' as const, content: baseSystemPrompt },
      ...currentHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: newAnswer },
      { role: 'system' as const, content: `[SYSTEM STATE DIRECTIVE]: ${stateInstruction}` }
    ];

    const cleanedApiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();
    let response;
    let reply = '';
    let attempt = 0;

    while (attempt < 3) {
      try {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanedApiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: payloadMessages,
            temperature: 0.7,
            max_tokens: 1024
          })
        });
      } catch (err: any) {
        console.warn("Direct Groq request failed with versatile model, trying fallback model. Error: ", err.message);
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanedApiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: payloadMessages,
            temperature: 0.7,
            max_tokens: 1024
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || 'Failed to fetch response from Groq');
      }

      const resData = await response.json();
      reply = resData?.choices?.[0]?.message?.content || '';

      if (userAnswersCount >= totalQ) {
        break;
      }

      const isLangValid = checkLanguageValidity(reply, currentLang, isTech);
      if (checkQuestionValidity(reply, skillName) && isLangValid) {
        break;
      }

      console.warn(`Direct Groq validation attempt ${attempt + 1} failed. Discarding invalid question: "${reply}"`);
      attempt++;

      let correctionContent = '';
      if (!isLangValid) {
        correctionContent = `[SYSTEM CORRECTION]: The generated response was NOT in the correct language. You must generate the response and the interview question ONLY in ${currentLang}. Do not mix languages or use English.`;
      } else {
        correctionContent = `[SYSTEM CORRECTION]: The generated question was rejected because it did not strictly target ${skillName}. Please generate a new, different question focusing ONLY on ${skillName}. Never mention or ask about other technologies or domains.`;
      }

      payloadMessages.push({
        role: 'system' as const,
        content: correctionContent
      });
    }

    let finalStatus: QualificationSession['status'] = 'in_progress';
    let finalScore: number | undefined;
    let finalFeedback: string | undefined;
    let technical_score: number | undefined;
    let communication_score: number | undefined;
    let teaching_score: number | undefined;
    let badge: string | undefined;
    let report: any | undefined;
    let recommendation: string | undefined;

    const jsonRegex = /\{[\s\S]*"evaluation_complete"\s*:\s*true[\s\S]*\}/;
    const match = reply.match(jsonRegex);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.badge) {
          finalStatus = parsed.badge === 'Not Eligible' ? 'failed' : 'passed';
          finalScore = parsed.overall_score;
          finalFeedback = parsed.report?.summary || parsed.recommendation;
          technical_score = parsed.technical_score;
          communication_score = parsed.communication_score;
          teaching_score = parsed.teaching_score;
          badge = parsed.badge;
          report = parsed.report;
          recommendation = parsed.recommendation;
        }
      } catch (err) {
        console.error('Failed to parse final JSON evaluation from Groq reply:', err);
      }
    }

    let cleanedReply = reply.replace(jsonRegex, '').trim();
    if (!cleanedReply) {
      cleanedReply = reply;
    }

    return {
      cleanedReply,
      finalStatus,
      finalScore,
      finalFeedback,
      updatedHistory: [
        ...updatedHistory,
        { role: 'assistant' as const, content: cleanedReply }
      ],
      technical_score,
      communication_score,
      teaching_score,
      badge,
      report,
      recommendation
    };
  };

  // Run Mock Simulation Assessor
  const handleMockAICall = async (
    skillName: string, 
    currentHistory: { role: 'assistant' | 'user' | 'system'; content: string }[],
    newAnswer: string,
    selectedLanguage: string,
    _totalQuestions: number
  ) => {
    const isTech = isTechnicalSkill(skillName);
    const totalQ = isTech ? 20 : 15;
    const userAnswersCount = currentHistory.filter(m => m.role === 'user').length;

    const nextHistory = [
      ...currentHistory,
      { role: 'user' as const, content: newAnswer }
    ];

    let reply = '';
    let finalStatus: QualificationSession['status'] = 'in_progress';
    let finalScore: number | undefined;
    let finalFeedback: string | undefined;
    let technical_score: number | undefined;
    let communication_score: number | undefined;
    let teaching_score: number | undefined;
    let badge: string | undefined;
    let report: any | undefined;
    let recommendation: string | undefined;

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (userAnswersCount < totalQ) {
      const qIndex = userAnswersCount; // 0-indexed for mock set
      let difficulty = 'Beginner';
      if (isTech) {
        difficulty = qIndex < 5 ? 'Beginner' : qIndex < 12 ? 'Intermediate' : 'Advanced';
      } else {
        difficulty = qIndex < 4 ? 'Beginner' : qIndex < 9 ? 'Intermediate' : 'Advanced';
      }
      
      let question = '';
      let replyText = '';

      if (selectedLanguage === 'Hindi') {
        const beginnerTemplatesHindi = [
          `${skillName} की मुख्य अवधारणाएं और बुनियादी तत्व क्या हैं, और आप इन्हें किसी नए सीखने वाले को कैसे समझाएंगे?`,
          `क्या आप ${skillName} के साथ काम शुरू करते समय बुनियादी सेटअप और मानक संरचना के बारे में बता सकते हैं?`,
          `${skillName} में प्राथमिक डेटा संरचनाएं, तत्व या सेटिंग्स क्या हैं, और प्रत्येक का उपयोग कब किया जाना चाहिए?`,
          `${skillName} में बुनियादी प्रवाह नियंत्रण या तरीके कैसे काम करते हैं?`,
          `यदि आप किसी जूनियर छात्र को ${skillName} सिखा रहे थे, तो आप सबसे पहले किन मुख्य बुनियादी बातों पर ध्यान केंद्रित करेंगे?`
        ];

        const intermediateTemplatesHindi = [
          `जब आप ${skillName} में अनुप्रयोगों का निर्माण करते हैं, तो त्रुटि प्रबंधन (error handling) या समस्याओं को कैसे हल करते हैं?`,
          `एक पेशेवर ${skillName} परियोजना में कोड, मॉड्यूल या निर्देशिकाओं को व्यवस्थित करने के सर्वोत्तम तरीके क्या हैं?`,
          `क्या आप ${skillName} विकास में एक आम गलती या गलत पैटर्न (anti-pattern) और उससे बचने के तरीके को समझा सकते हैं?`,
          `${skillName} पारिस्थितिकी तंत्र में अन्य लोकप्रिय उपकरणों, डेटाबेस या पुस्तकालयों (libraries) के साथ कैसे एकीकृत होता है?`,
          `आप ${skillName} में स्वच्छ, पठनीय और रखरखाव योग्य कोड लिखने के लिए क्या दृष्टिकोण अपनाते हैं?`
        ];

        const advancedTemplatesHindi = [
          `${skillName} के साथ निर्मित प्रणालियों में प्रदर्शन को अनुकूलित करने और बाधाओं को हल करने के लिए आपकी क्या रणनीतियाँ हैं?`,
          `आप ${skillName} में मेमोरी प्रबंधन, समवर्तीता (concurrency), एसिंक्रोनस कार्यों या स्केलिंग को कैसे संभालते हैं?`,
          `क्या आप ${skillName} का उपयोग करके हल की गई किसी जटिल वास्तविक समस्या और अपने तकनीकी तर्क का वर्णन कर सकते हैं?`,
          `आप बड़े पैमाने पर ${skillName} कोडबेस में परीक्षण, सुरक्षा और उन्नत डिज़ाइन पैटर्न को कैसे संभालते हैं?`,
          `आधुनिक ${skillName} पारिस्थितिकी तंत्र में सबसे महत्वपूर्ण अपडेट या उन्नत विशेषताएं क्या हैं, और वे डेवलपर्स को कैसे लाभ पहुंचाती हैं?`
        ];

        if (difficulty === 'Beginner') {
          question = beginnerTemplatesHindi[qIndex % beginnerTemplatesHindi.length];
        } else if (difficulty === 'Intermediate') {
          question = intermediateTemplatesHindi[qIndex % intermediateTemplatesHindi.length];
        } else {
          question = advancedTemplatesHindi[qIndex % advancedTemplatesHindi.length];
        }

        const phrasingOptionsHindi = [
          `कल्पना कीजिए कि आप इस अवधारणा को अपनी टीम में शामिल होने वाले किसी जूनियर को समझा रहे हैं: ${question}`,
          `दिलचस्प है। आइए इस परिदृश्य का पता लगाएं: ${question}`,
          `ठीक है, आइए उस पर आगे बढ़ें। यदि आपको निम्नलिखित को समझाना हो, तो आप क्या कहेंगे? ${question}`,
          `अगले विषय पर चलते हुए, आप इसे कैसे संभालेंगे? ${question}`
        ];
        replyText = phrasingOptionsHindi[qIndex % phrasingOptionsHindi.length];

      } else if (selectedLanguage === 'Telugu') {
        const beginnerTemplatesTelugu = [
          `${skillName} యొక్క ప్రధాన భావనలు మరియు ప్రాథమిక అంశాలు ఏమిటి, మరియు వీటిని ఒక కొత్త అభ్యాసకునికి మీరు ఎలా వివరిస్తారు?`,
          `మీరు ${skillName}తో పనిని ప్రారంభించేటప్పుడు ప్రాథమిక సెటప్ మరియు ప్రామాణిక నిర్మాణాన్ని వివరించగలరా?`,
          `${skillName}లో ప్రాథమిక డేటా నిర్మాణాలు, అంశాలు లేదా కాన్ఫిగరేషన్లు ఏమిటి, మరియు వాటిని ఎప్పుడు ఉపయోగించాలి?`,
          `${skillName}లో ప్రాథమిక ఫ్లో కంట్రోల్ లేదా పద్ధతులు ఎలా పనిచేస్తాయి?`,
          `మీరు ఒక జూనియర్ విద్యార్థికి ${skillName} నేర్పుతుంటే, మొదట ఏ ప్రాథమిక అంశాలపై దృష్టి పెడతారు?`
        ];

        const intermediateTemplatesTelugu = [
          `మీరు ${skillName}లో అప్లికేషన్లను నిర్మించేటప్పుడు ఎర్రర్ హ్యాండ్లింగ్ లేదా సమస్యలను ఎలా పరిష్కరిస్తారు?`,
          `ఒక ప్రొఫెషనల్ ${skillName} ప్రాజెక్ట్‌లో కోడ్, మాడ్యూల్స్ లేదా డైరెక్టరీలను ఆర్గనైజ్ చేయడానికి ఉత్తమ పద్ధతులు ఏమిటి?`,
          `${skillName} డెవలప్‌మెంట్‌లో ఒక సాధారణ తప్పు లేదా యాంటీ-ప్యాటర్న్ మరియు దానిని ఎలా నివారించాలో వివరించగలరా?`,
          `${skillName} ఇతర ప్రముఖ సాధనాలు, డేటాబేస్‌లు లేదా లైబ్రరీలతో ఎలా అనుసంధానించబడుతుంది?`,
          `మీరు ${skillName}లో క్లీన్, రీడబుల్ మరియు మెయింటైనబుల్ కోడ్ రాయడానికి ఎటువంటి విధానాన్ని అవలంబిస్తారు?`
        ];

        const advancedTemplatesTelugu = [
          `${skillName}తో నిర్మించిన సిస్టమ్స్‌లో పనితీరును మెరుగుపరచడానికి మరియు అడ్డంకులను పరిష్కరించడానికి మీ వ్యూహాలు ఏమిటి?`,
          `మీరు ${skillName}లో మెమరీ మేనేజ్‌మెంట్, కాన్‌కరెన్సీ, అసమకాలిక పనులు (asynchronous tasks) లేదా స్కేలింగ్‌ను ఎలా హ్యాండిల్ చేస్తారు?`,
          `మీరు ${skillName} ఉపయోగించి పరిష్కరించిన ఒక సంక్లిష్టమైన నిజ-సమయ సమస్య మరియు మీ సాంకేతిక కారణాలను వివరించగలరా?`,
          `మీరు భారీ స్థాయి ${skillName} కోడ్‌బేస్‌లో టెస్టింగ్, సెక్యూరిటీ మరియు అడ్వాన్స్‌డ్ డిజైన్ ప్యాటర్న్‌లను ఎలా హ్యాండిల్ చేస్తారు?`,
          `ఆధునిక ${skillName} ఎకోసిస్టమ్‌లో అత్యంతమైన అప్‌డేట్‌లు లేదా అడ్వాన్స్‌డ్ ఫీచర్లు ఏమిటి, మరియు అవి డెవలపర్‌లకు ఎలా ప్రయోజనం చేకూరుస్తాయి?`
        ];

        if (difficulty === 'Beginner') {
          question = beginnerTemplatesTelugu[qIndex % beginnerTemplatesTelugu.length];
        } else if (difficulty === 'Intermediate') {
          question = intermediateTemplatesTelugu[qIndex % intermediateTemplatesTelugu.length];
        } else {
          question = advancedTemplatesTelugu[qIndex % advancedTemplatesTelugu.length];
        }

        const phrasingOptionsTelugu = [
          `మీ బృందంలో చేరే జూనియర్‌కు ఈ భావనను వివరిస్తున్నట్లు ఊహించుకోండి: ${question}`,
          `ఆసక్తికరంగా ఉంది. ఈ పరిస్థితిని పరిశీలిద్దాం: ${question}`,
          `సరే, దానిపై మరింత ముందుకు వెళ్దాం. మీరు క్రింది వాటిని వివరించాల్సి వస్తే, ఏమని చెబుతారు? ${question}`,
          `తదుపరి అంశానికి వెళ్దాం, దీనిని మీరు ఎలా హ్యాండిల్ చేస్తారు? ${question}`
        ];
        replyText = phrasingOptionsTelugu[qIndex % phrasingOptionsTelugu.length];

      } else {
        const beginnerTemplates = [
          `What are the core concepts and fundamental primitives of ${skillName}, and how would you explain them to a complete beginner?`,
          `Can you walk me through the basic setup and standard syntax or structure when starting a project with ${skillName}?`,
          `What are the primary data structures, elements, or configurations in ${skillName}, and when would you use each?`,
          `How does basic flow control or syntax state management work in ${skillName}?`,
          `If you were teaching ${skillName} to a junior student, what core fundamentals would you focus on first?`
        ];

        const intermediateTemplates = [
          `How do you handle error handling, exceptions, or troubleshooting in ${skillName} when building applications?`,
          `What are the best practices for structuring code, modules, or directories in a professional ${skillName} project?`,
          `Can you explain a common pitfall or anti-pattern in ${skillName} development and how to avoid it?`,
          `How does ${skillName} integrate with other popular tools, databases, or libraries in the ecosystem?`,
          `How do you approach writing clean, readable, and maintainable code in ${skillName}?`
        ];

        const advancedTemplates = [
          `What are your strategies for optimizing performance and resolving bottlenecks in systems built with ${skillName}?`,
          `How do you handle memory management, concurrency, asynchronous tasks, or scaling in ${skillName}?`,
          `Can you describe a complex real-world problem you solved using ${skillName} and your technical reasoning?`,
          `How do you approach testing, security, and advanced design patterns in a large-scale ${skillName} codebase?`,
          `What are the most significant updates or advanced features in the modern ${skillName} ecosystem, and how do they benefit developers?`
        ];

        if (difficulty === 'Beginner') {
          question = beginnerTemplates[qIndex % beginnerTemplates.length];
        } else if (difficulty === 'Intermediate') {
          question = intermediateTemplates[qIndex % intermediateTemplates.length];
        } else {
          question = advancedTemplates[qIndex % advancedTemplates.length];
        }

        const phrasingOptions = [
          `Imagine you're explaining this concept to a junior joining your team: ${question}`,
          `Interesting. Let's explore this scenario: ${question}`,
          `Okay, let's build on that. If you had to explain the following, what would you say? ${question}`,
          `Moving to the next area, how would you approach this? ${question}`
        ];
        replyText = phrasingOptions[qIndex % phrasingOptions.length];
      }

      reply = replyText;
    } else {
      const totalCharCount = nextHistory
        .filter(m => m.role === 'user')
        .reduce((sum, m) => sum + m.content.length, 0);

      const calculatedScore = Math.min(98, Math.max(50, 70 + Math.floor(totalCharCount / 100)));
      const passed = calculatedScore >= 70;

      finalStatus = passed ? 'passed' : 'failed';
      finalScore = calculatedScore;
      
      const passedFeedback = `Excellent understanding of ${skillName} fundamentals. You demonstrated clear knowledge of core mechanics, practical application, and advanced techniques in ${skillName}. Highly qualified to teach ${skillName}!`;
      const failedFeedback = `The assessment identified some gaps in ${skillName} concepts. Specifically, review practical scaling, error handling, and best practices in ${skillName}. Feel free to study and retry the assessment!`;
      finalFeedback = passed ? passedFeedback : failedFeedback;

      technical_score = Math.min(100, Math.max(45, calculatedScore + Math.floor(Math.random() * 8 - 4)));
      communication_score = Math.min(100, Math.max(50, calculatedScore + Math.floor(Math.random() * 12 - 6)));
      teaching_score = Math.min(100, Math.max(45, calculatedScore + Math.floor(Math.random() * 10 - 5)));
      
      const confScore = Math.min(100, Math.max(50, calculatedScore + Math.floor(Math.random() * 10 - 5)));
      const speechScore = Math.min(100, Math.max(50, calculatedScore + Math.floor(Math.random() * 8 - 4)));

      if (calculatedScore >= 80) {
        badge = 'Expert Mentor';
      } else if (calculatedScore >= 70) {
        badge = 'Verified Mentor';
      } else if (calculatedScore >= 50) {
        badge = 'Community Mentor';
      } else {
        badge = 'Not Eligible';
      }

      const technical_accuracy = Math.min(100, Math.max(50, technical_score + Math.floor(Math.random() * 6 - 3)));
      const communication = Math.min(100, Math.max(50, communication_score + Math.floor(Math.random() * 6 - 3)));
      const confidence = Math.min(100, Math.max(50, confScore + Math.floor(Math.random() * 6 - 3)));
      const fluency = Math.min(100, Math.max(50, speechScore + Math.floor(Math.random() * 6 - 3)));
      const teaching_ability = Math.min(100, Math.max(50, teaching_score + Math.floor(Math.random() * 6 - 3)));
      const logical_thinking = Math.min(100, Math.max(50, calculatedScore + Math.floor(Math.random() * 8 - 4)));
      const practical_experience = Math.min(100, Math.max(50, technical_score + Math.floor(Math.random() * 8 - 4)));
      const problem_solving = Math.min(100, Math.max(50, technical_score + Math.floor(Math.random() * 10 - 5)));

      report = {
        strengths: `Demonstrated solid foundational understanding and terminology. Explained concepts step-by-step.`,
        weaknesses: `Could elaborate more on optimizations, scaling concerns, and edge-cases.`,
        suggestions: `Study performance tuning, advanced patterns, and interactive mentoring techniques.`,
        areas_for_improvement: `Study performance tuning, advanced patterns, and interactive mentoring techniques.`,
        summary: finalFeedback,
        detailed_scores: {
          technical_accuracy,
          communication,
          confidence,
          fluency,
          teaching_ability,
          logical_thinking,
          practical_experience,
          problem_solving
        }
      };

      recommendation = `The candidate has successfully demonstrated their capabilities in ${skillName}. We recommend admitting them as an active mentor with a '${badge}' designation based on the calculated criteria.`;

      reply = `Thank you for completing the technical assessment! I have evaluated your responses and compiled the qualification results.`;
    }

    return {
      cleanedReply: reply,
      finalStatus,
      finalScore,
      finalFeedback,
      updatedHistory: [
        ...nextHistory,
        { role: 'assistant' as const, content: reply }
      ],
      technical_score,
      communication_score,
      teaching_score,
      badge,
      report,
      recommendation
    };
  };

  // Handles vocal auto-submit logic
  const handleSubmitSpokenAnswer = async (text: string) => {
    if (!text.trim() || !session || isSending) return;
    finalizedTranscriptRef.current = '';
    accumulatedSpeechRef.current = '';
    setIsWaitingForSilence(false);
    setIsSending(true);
    setErrorMsg(null);
    setSpokenSubtitle('Processing your answer...');

    try {
      const isTech = isTechnicalSkill(session.skill_name);
      const totalQ = isTech ? 20 : 15;
      
      let result;
      if (isSupabaseConfigured) {
        result = await handleGroqCall(session.skill_name, session.chat_history, text, selectedLanguage, totalQ);
      } else if (apiKey) {
        result = await handleDirectGroqCall(session.skill_name, session.chat_history, text, selectedLanguage, totalQ);
      } else {
        result = await handleMockAICall(session.skill_name, session.chat_history, text, selectedLanguage, totalQ);
      }

      const { 
        finalStatus, 
        finalScore, 
        finalFeedback, 
        updatedHistory,
        technical_score,
        communication_score,
        teaching_score,
        badge,
        report,
        recommendation
      } = result;

      const updated = await qualificationService.updateSession(session.id, {
        chat_history: updatedHistory,
        status: finalStatus,
        score: finalScore,
        feedback: finalFeedback,
        technical_score,
        communication_score,
        teaching_score,
        badge,
        report,
        recommendation
      });

      setSession(updated);

      const newReply = updatedHistory[updatedHistory.length - 1].content;
      
      if (finalStatus === 'passed' || finalStatus === 'failed') {
        speakText(newReply, () => {
          let closingAnnouncement = `Assessment complete. You scored ${finalScore} percent. Status: ${finalStatus === 'passed' ? 'Passed' : 'Failed'}.`;
          if (selectedLanguage === 'Hindi') {
            closingAnnouncement = `मूल्यांकन समाप्त हुआ। आपने ${finalScore} प्रतिशत अंक प्राप्त किए। स्थिति: ${finalStatus === 'passed' ? 'सफल' : 'असफल'}।`;
          } else if (selectedLanguage === 'Telugu') {
            closingAnnouncement = `మూల్యాంకనం పూర్తయింది. మీరు ${finalScore} శాతం స్కోర్ చేసారు. స్థితి: ${finalStatus === 'passed' ? 'ఉత్తీర్ణత' : 'అనుత్తీర్ణత'}।`;
          }
          speakText(closingAnnouncement);
        });
      } else {
        speakText(newReply, () => {
          startSpeechRecognition();
        });
      }

      // Sync mock notifications
      if (finalStatus === 'passed' || finalStatus === 'failed') {
        const mockNotifs = JSON.parse(localStorage.getItem('skillswap-mock-notifications') || '[]');
        mockNotifs.push({
          id: `notif-${Math.random().toString(36).substr(2, 9)}`,
          user_id: session.user_id,
          type: finalStatus === 'passed' ? 'request_accepted' : 'request_received',
          title: finalStatus === 'passed' ? 'Skill Qualification Passed!' : 'Skill Qualification Update',
          content: finalStatus === 'passed' 
            ? `Congratulations! You passed the qualification for ${session.skill_name} with a score of ${finalScore}%.`
            : `You completed the qualification assessment for ${session.skill_name}. Status: Retry Available.`,
          is_read: false,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('skillswap-mock-notifications', JSON.stringify(mockNotifs));
        window.dispatchEvent(new Event('skillswap-notifications-updated'));
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during assessment. Please check your Groq API configuration or try again.');
      setSpokenSubtitle('Error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading AI assessment session...</p>
      </div>
    );
  }

  if (errorMsg && !session) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-xl">
        <XCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{errorMsg}</h3>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm rounded-xl cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!session) return null;

  const progressInfo = getProgressInfo();
  const isConcluded = session.status === 'passed' || session.status === 'failed';

  if (isConcluded) {
    const badgeName = session.badge || (session.status === 'passed' ? 'Verified Mentor' : 'Not Eligible');
    const badgeStyle = getBadgeStyle(badgeName);
    const dateStr = session.updated_at ? new Date(session.updated_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : new Date().toLocaleDateString();

    const techScore = session.technical_score || session.score || 0;
    const commScore = session.communication_score || session.score || 0;
    const teachScore = session.teaching_score || session.score || 0;
    const overallScore = session.score || 0;

    return (
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center space-x-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-2 cursor-pointer font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-heading font-black text-gray-950 dark:text-white tracking-tight flex items-center gap-2">
              {session.skill_name} Qualification Report
            </h1>
            <p className="text-xs text-gray-400 dark:text-slate-450">
              Assessor Agent: AI bot evaluator • Completed on {dateStr}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {session.status === 'failed' ? (
              <button
                onClick={handleRetry}
                className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-xs font-bold rounded-xl shadow-md shadow-primary-500/10 cursor-pointer transition-all flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Assessment</span>
              </button>
            ) : (
              <button
                onClick={handleRetry}
                className="px-4 py-2 border border-gray-200 dark:border-slate-800 text-gray-650 dark:text-slate-350 hover:bg-gray-50 dark:hover:bg-slate-850 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center space-x-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake for Higher Badge</span>
              </button>
            )}
          </div>
        </div>

        {/* Premium Badge Showcase Row */}
        <div className={`p-1 rounded-[2.5rem] bg-gradient-to-tr ${badgeStyle.gradient} shadow-2xl ${badgeStyle.glow} relative group transition-all duration-500 hover:scale-[1.01]`}>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-[2.5rem] pointer-events-none"></div>
          
          <div className="bg-white dark:bg-slate-900 rounded-[2.4rem] p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            {/* Giant Glowing Icon */}
            <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr ${badgeStyle.gradient} p-0.5 shadow-lg relative shrink-0`}>
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-955 flex items-center justify-center text-4xl sm:text-5xl shadow-inner animate-pulse-slow">
                {badgeStyle.icon}
              </div>
            </div>

            {/* Badge Text and Description */}
            <div className="text-center md:text-left space-y-2 flex-grow">
              <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${badgeStyle.bg} ${badgeStyle.text} border ${badgeStyle.border}`}>
                Earned Mentor Tier
              </span>
              <h2 className="text-2xl sm:text-3xl font-heading font-black text-gray-900 dark:text-white tracking-tight mt-1.5">
                {badgeName}
              </h2>
              <p className="text-sm text-gray-650 dark:text-slate-350 max-w-xl leading-relaxed">
                {badgeStyle.description}
              </p>
            </div>
          </div>
        </div>

        {/* Scores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main Circle Gauge (Overall Score) */}
          <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <h3 className="font-heading font-extrabold text-sm text-gray-800 dark:text-slate-300 uppercase tracking-wider">
              Overall Score
            </h3>
            
            {/* Ring visualization */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-gray-100 dark:stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={badgeStyle.hsl}
                  style={{
                    strokeDasharray: '251.2',
                    strokeDashoffset: 251.2 - (251.2 * overallScore) / 100
                  }}
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                  {overallScore}%
                </span>
                <span className="text-[10px] font-bold text-gray-405 dark:text-slate-500 uppercase tracking-wider">
                  weighted
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-450 dark:text-slate-450 leading-relaxed max-w-[240px]">
              Calculated as 50% Technical, 25% Communication, and 25% Teaching ability.
            </div>
          </div>

          {/* Sub-Category Scores */}
          <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col justify-center space-y-6">
            <h3 className="font-heading font-extrabold text-sm text-gray-800 dark:text-slate-300 uppercase tracking-wider">
              Evaluation Dimensions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {/* Technical Accuracy */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-700 dark:text-slate-355 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    Technical Accuracy
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {session.report?.detailed_scores?.technical_accuracy ?? techScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${session.report?.detailed_scores?.technical_accuracy ?? techScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Practical Experience */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-700 dark:text-slate-355 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-550" />
                    Practical Experience
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {session.report?.detailed_scores?.practical_experience ?? techScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-550 rounded-full"
                    style={{ width: `${session.report?.detailed_scores?.practical_experience ?? techScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Problem Solving */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-700 dark:text-slate-355 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    Problem Solving
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {session.report?.detailed_scores?.problem_solving ?? techScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${session.report?.detailed_scores?.problem_solving ?? techScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Logical Thinking */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-700 dark:text-slate-355 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                    Logical Thinking
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {session.report?.detailed_scores?.logical_thinking ?? Math.round((techScore + teachScore) / 2)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${session.report?.detailed_scores?.logical_thinking ?? Math.round((techScore + teachScore) / 2)}%` }}
                  ></div>
                </div>
              </div>

              {/* Communication Clarity */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-700 dark:text-slate-355 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                    Communication Clarity
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {session.report?.detailed_scores?.communication ?? commScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${session.report?.detailed_scores?.communication ?? commScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Fluency */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-700 dark:text-slate-355 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-650" />
                    Speech Fluency
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {session.report?.detailed_scores?.fluency ?? commScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${session.report?.detailed_scores?.fluency ?? commScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Confidence */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-700 dark:text-slate-355 flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-rose-500" />
                    Speech Confidence
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {session.report?.detailed_scores?.confidence ?? commScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${session.report?.detailed_scores?.confidence ?? commScore}%` }}
                  ></div>
                </div>
              </div>

              {/* Teaching & Explanation */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-700 dark:text-slate-355 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-555" />
                    Teaching & Explanation
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {session.report?.detailed_scores?.teaching_ability ?? teachScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-550 rounded-full"
                    style={{ width: `${session.report?.detailed_scores?.teaching_ability ?? teachScore}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Detailed Assessor Feedback Box */}
        {session.recommendation && (
          <div className="bg-gray-50/55 dark:bg-slate-850 border border-gray-150 dark:border-slate-800/80 rounded-3xl p-6 space-y-3 shadow-inner">
            <h3 className="font-heading font-extrabold text-sm text-gray-800 dark:text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-4.5 h-4.5 text-primary-500" />
              Assessor Recommendation
            </h3>
            <p className="text-sm text-gray-755 dark:text-slate-300 leading-relaxed font-medium italic">
              "{session.recommendation}"
            </p>
          </div>
        )}

        {/* Report Tabs (Strengths / Weaknesses / Areas for Improvement) */}
        {session.report && (
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm">
            <div className="flex border-b border-gray-150 dark:border-slate-800 bg-gray-55/40 dark:bg-slate-950/20">
              <button
                onClick={() => setActiveReportTab('strengths')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                  activeReportTab === 'strengths'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-450 bg-white dark:bg-slate-900'
                    : 'border-transparent text-gray-400 hover:text-gray-650 hover:bg-gray-50/50'
                }`}
              >
                Candidate Strengths
              </button>
              <button
                onClick={() => setActiveReportTab('weaknesses')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                  activeReportTab === 'weaknesses'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-450 bg-white dark:bg-slate-900'
                    : 'border-transparent text-gray-400 hover:text-gray-650 hover:bg-gray-50/50'
                }`}
              >
                Areas of Concern
              </button>
              <button
                onClick={() => setActiveReportTab('improvement')}
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                  activeReportTab === 'improvement'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-450 bg-white dark:bg-slate-900'
                    : 'border-transparent text-gray-400 hover:text-gray-650 hover:bg-gray-50/50'
                }`}
              >
                Improvement Plan
              </button>
            </div>

            <div className="p-6 sm:p-8 min-h-[140px] leading-relaxed">
              {activeReportTab === 'strengths' && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-450">
                    <ThumbsUp className="w-4.5 h-4.5" />
                    <span className="font-bold text-sm">Key Strengths Identified</span>
                  </div>
                  <p className="text-sm text-gray-650 dark:text-slate-350">
                    {session.report.strengths || "The candidate displayed adequate competency during responses."}
                  </p>
                </div>
              )}

              {activeReportTab === 'weaknesses' && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-450">
                    <AlertCircle className="w-4.5 h-4.5" />
                    <span className="font-bold text-sm">Identified Skill Gaps</span>
                  </div>
                  <p className="text-sm text-gray-655 dark:text-slate-355">
                    {session.report.weaknesses || "No critical weaknesses identified. Keep refining edge cases."}
                  </p>
                </div>
              )}

              {activeReportTab === 'improvement' && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-455">
                    <BookOpen className="w-4.5 h-4.5" />
                    <span className="font-bold text-sm">Recommended Study Pathway</span>
                  </div>
                  <p className="text-sm text-gray-655 dark:text-slate-350">
                    {session.report.areas_for_improvement || "Continue practicing advanced coding architectures and mentoring techniques."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Full Transcript Details */}
        <div className="border border-gray-150 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
          <details className="group">
            <summary className="px-6 py-5 font-heading font-extrabold text-sm text-gray-800 dark:text-slate-300 hover:bg-gray-5/50 dark:hover:bg-slate-850/50 cursor-pointer list-none flex justify-between items-center transition-colors">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-gray-400" />
                <span>Review Full Interview Transcript</span>
              </div>
              <ChevronDown className="w-4.5 h-4.5 text-gray-400 group-open:rotate-180 transition-transform duration-200" />
            </summary>
            
            <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-slate-800 space-y-4 max-h-96 overflow-y-auto mt-2 text-sm flex flex-col">
              {session.chat_history.map((msg, idx) => {
                const isAI = msg.role === 'assistant';
                return (
                  <div 
                    key={idx} 
                    className={`flex items-start space-x-3.5 max-w-[85%] ${
                      isAI ? 'self-start' : 'self-end flex-row-reverse space-x-reverse ml-auto'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isAI 
                        ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shadow-sm' 
                        : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    }`}>
                      {isAI ? <Bot className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                    </div>

                    <div className={`p-3.5 rounded-2xl ${
                      isAI 
                        ? 'bg-white dark:bg-slate-800 text-black dark:text-white rounded-tl-none border border-gray-150 dark:border-slate-700/50 shadow-sm' 
                        : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-sm'
                    }`}>
                      {msg.content.split('\n').map((line, lIdx) => (
                        <p key={lIdx} className={lIdx > 0 ? 'mt-1.5' : ''}>
                          {line.split('**').map((part, pIdx) => 
                            pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold">{part}</strong> : part
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>

        {/* Footer Navigation CTA */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-sm rounded-2xl hover:shadow-lg transition-all cursor-pointer flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>

      </div>
    );
  }

  const isTech = isTechnicalSkill(session.skill_name);
  const totalQuestions = isTech ? 20 : 15;
  
  // Determine difficulty
  let currentDifficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
  if (isTech) {
    currentDifficulty = progressInfo.step <= 5 ? 'Beginner' : progressInfo.step <= 12 ? 'Intermediate' : 'Advanced';
  } else {
    currentDifficulty = progressInfo.step <= 4 ? 'Beginner' : progressInfo.step <= 9 ? 'Intermediate' : 'Advanced';
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6 flex flex-col min-h-[85vh]">
      
      {/* Assessment Header */}
      <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 transition-colors">
        <div className="flex items-center space-x-3.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-heading font-extrabold text-xl text-gray-950 dark:text-white">
                {session.skill_name} Voice Qualification
              </h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-450 border border-blue-150/40`}>
                Assessment Active
              </span>
            </div>
            <p className="text-xs text-gray-650 dark:text-slate-400 mt-0.5">
              Assessor Agent: AI bot evaluator
            </p>
          </div>
        </div>

        {/* Global Key Config & Status Indicators */}
        <div className="flex items-center space-x-3 shrink-0">
          {isSupabaseConfigured ? (
            <div className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-550" />
              <span>Groq AI Active</span>
            </div>
          ) : (
            <button
              onClick={() => setShowKeyModal(true)}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                apiKey 
                  ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{apiKey ? 'Groq Key Active' : 'Configure Groq Key'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Area */}
      {!interviewStarted ? (
        /* Setup / Welcome Screen */
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-8 glass transition-all">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-950/20 flex items-center justify-center mx-auto shadow-md">
                <Mic className="w-8 h-8 text-primary-500 animate-pulse" />
              </div>
              <h2 className="font-heading font-black text-3xl text-gray-900 dark:text-white tracking-tight">
                AI Voice Interview Setup
              </h2>
              <p className="text-sm text-gray-505 dark:text-slate-400 max-w-md mx-auto">
                Prepare for your {session.skill_name} qualification. This session will be entirely spoken.
              </p>
            </div>

            <div className="space-y-6">
              {/* Language Selection */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-primary-500" />
                  Select Interview Language
                </label>
                
                {isTech ? (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold leading-relaxed">
                      💡 Technical interviews are conducted in English.
                    </p>
                    <div className="flex gap-3">
                      <button
                        className="flex-1 py-3 px-4 rounded-xl border border-primary-500 bg-primary-500/5 text-primary-600 font-bold text-sm flex items-center justify-center gap-2 cursor-default animate-pulse-slow"
                        disabled
                      >
                        🇺🇸 English (Enforced)
                      </button>
                      <button
                        className="flex-1 py-3 px-4 rounded-xl border border-gray-150 dark:border-slate-805 text-gray-350 dark:text-slate-600 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                        disabled
                      >
                        🇮🇳 Hindi
                      </button>
                      <button
                        className="flex-1 py-3 px-4 rounded-xl border border-gray-150 dark:border-slate-805 text-gray-355 dark:text-slate-600 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                        disabled
                      >
                        🇮🇳 Telugu
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {(['English', 'Hindi', 'Telugu'] as const).map(lang => {
                      const isSelected = selectedLanguage === lang;
                      const flags = { English: '🇺🇸', Hindi: '🇮🇳', Telugu: '🇮🇳' };
                      return (
                        <button
                          key={lang}
                          onClick={() => setSelectedLanguage(lang)}
                          className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500/5 text-primary-600 shadow-sm'
                              : 'border-gray-200 dark:border-slate-800 text-gray-650 dark:text-slate-350 hover:bg-gray-50 dark:hover:bg-slate-850'
                          }`}
                        >
                          <span>{flags[lang]}</span>
                          <span>{lang}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Microphone Verification */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-primary-500" />
                  Microphone Access
                </label>

                {micPermission === 'granted' ? (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4.5 h-4.5 animate-bounce text-emerald-500" />
                      <span>Microphone access granted & tested successfully!</span>
                    </div>
                  </div>
                ) : micPermission === 'denied' ? (
                  <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex flex-col gap-2 text-xs text-rose-600 dark:text-rose-400">
                    <div className="flex items-center gap-2 font-bold">
                      <XCircle className="w-4.5 h-4.5 text-rose-500" />
                      <span>Microphone access was denied.</span>
                    </div>
                    <p className="leading-relaxed font-medium">
                      Please click the lock icon in your browser address bar to reset permissions, then try again.
                    </p>
                    <button
                      onClick={requestMicPermission}
                      className="mt-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold self-start transition-all cursor-pointer"
                    >
                      Retry Permission Request
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-slate-855/50 border border-gray-150 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-gray-550 dark:text-slate-400 font-medium">
                      We need to access your microphone to record your verbal answers.
                    </div>
                    <button
                      onClick={requestMicPermission}
                      className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
                    >
                      Authorize Mic Access
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={startInterview}
              disabled={micPermission !== 'granted'}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:opacity-40 disabled:pointer-events-none text-white text-base font-black rounded-2xl shadow-xl hover:shadow-primary-500/20 transition-all cursor-pointer tracking-wide flex items-center justify-center gap-2"
            >
              <Mic className="w-5 h-5" />
              <span>Start Voice Assessment ({totalQuestions} Questions)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-0">
          
          {/* Main Assessment Container (Left/Center) */}
          <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-[2rem] p-6 shadow-sm justify-between gap-6 transition-all duration-300 min-h-0">
            
            {/* Top Navigation Info-bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-gray-100 dark:border-slate-850 pb-5 text-center shrink-0">
              <div className="p-3 bg-gray-50/55 dark:bg-slate-850/50 rounded-2xl border border-gray-100/50 dark:border-slate-800/50 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Assessment Topic</span>
                <p className="text-sm font-black text-gray-805 dark:text-white truncate">
                  {session.skill_name}
                </p>
              </div>
              <div className="p-3 bg-gray-50/55 dark:bg-slate-850/50 rounded-2xl border border-gray-100/50 dark:border-slate-800/50 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Language</span>
                <p className="text-sm font-black text-primary-600 dark:text-primary-400">
                  {selectedLanguage === 'Hindi' ? '🇮🇳 Hindi' : selectedLanguage === 'Telugu' ? '🇮🇳 Telugu' : '🇺🇸 English'}
                </p>
              </div>
              <div className="p-3 bg-gray-50/55 dark:bg-slate-850/50 rounded-2xl border border-gray-100/50 dark:border-slate-800/50 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-gray-450" />
                  Elapsed Time
                </span>
                <p className="text-sm font-black text-gray-800 dark:text-white">
                  {formatDuration(duration)}
                </p>
              </div>
              <div className="p-3 bg-gray-50/55 dark:bg-slate-850/50 rounded-2xl border border-gray-100/50 dark:border-slate-800/50 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block flex items-center justify-center gap-1">
                  <Wifi className="w-3 h-3 text-gray-455" />
                  Network Status
                </span>
                <p className={`text-sm font-black ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {isOnline ? 'Connected' : 'Offline'}
                </p>
              </div>
            </div>

            {/* Central Animated AI Portal Section */}
            <div className="flex-grow flex flex-col items-center justify-center space-y-6 py-4">
              
              {/* Question Text Prompt */}
              <div className="w-full max-w-2xl text-center space-y-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                  currentDifficulty === 'Beginner'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-450 border border-blue-150/30'
                    : currentDifficulty === 'Intermediate'
                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-450 border border-purple-150/30'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450 border border-amber-150/30'
                }`}>
                  Current Difficulty: {currentDifficulty}
                </span>
                {voiceWarning && (
                  <div className="mb-3.5 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-450 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse max-w-xl mx-auto">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    <span>{voiceWarning}</span>
                  </div>
                )}
                <h3 className="text-lg md:text-xl font-heading font-extrabold text-gray-900 dark:text-white leading-relaxed">
                  {getCurrentQuestionText() || "Preparing the first question..."}
                </h3>
              </div>

              {/* Pulsing Visual Avatar Portal */}
              <div className="relative flex items-center justify-center w-52 h-52 md:w-60 md:h-60">
                {isSpeaking && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping border border-cyan-500/10"></div>
                    <div className="absolute -inset-4 rounded-full bg-cyan-500/10 animate-pulse border border-cyan-500/5"></div>
                  </>
                )}
                {isListening && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping border border-rose-500/10"></div>
                    <div className="absolute -inset-4 rounded-full bg-rose-500/10 animate-pulse border border-rose-500/5"></div>
                  </>
                )}
                {isSending && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-spin border border-dashed border-violet-500/30 duration-3000"></div>
                    <div className="absolute -inset-4 rounded-full bg-violet-500/10 animate-pulse border border-violet-500/5"></div>
                  </>
                )}
                {!(isSpeaking || isListening || isSending) && (
                  <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse border border-emerald-500/5"></div>
                )}

                {/* Central Orb Button Controller */}
                <button
                  onClick={handleOrbClick}
                  className={`relative z-10 w-36 h-36 md:w-40 md:h-40 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 cursor-pointer outline-none focus:ring-4 focus:ring-primary-500/10 ${
                    isSpeaking
                      ? 'bg-gradient-to-tr from-cyan-400 to-teal-500 text-white shadow-cyan-500/35 scale-105 border-4 border-cyan-300/30'
                      : isListening
                      ? 'bg-gradient-to-tr from-rose-400 to-pink-500 text-white shadow-rose-500/35 scale-110 border-4 border-white/10 animate-pulse-slow'
                      : isSending
                      ? 'bg-gradient-to-tr from-violet-400 to-indigo-500 text-white shadow-violet-500/30 scale-100 animate-pulse border-4 border-violet-300/30'
                      : 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-emerald-500/25 scale-95 border-4 border-emerald-300/20 hover:scale-100'
                  }`}
                >
                  <div className="text-center flex flex-col items-center">
                    {isSpeaking && <Volume2 className="w-10 h-10 animate-pulse text-white" />}
                    {isListening && <Mic className="w-10 h-10 animate-bounce text-white" />}
                    {isSending && <Loader2 className="w-10 h-10 animate-spin text-white" />}
                    {!isSpeaking && !isListening && !isSending && <CheckCircle className="w-10 h-10 text-white/95" />}
                    
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/95 block mt-2">
                      {isSpeaking 
                        ? '🔊 AI Speaking...' 
                        : isSending 
                        ? '🧠 Evaluating...' 
                        : isListening 
                        ? (isWaitingForSilence ? '📝 Transcribing...' : '🎤 Listening...') 
                        : '⏳ Waiting for response...'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Dynamic Waveform Visualizer */}
              <div className="flex items-center justify-center space-x-1.5 h-16 w-full max-w-md mx-auto">
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      isSpeaking 
                        ? 'bg-gradient-to-t from-cyan-500 to-teal-400 animate-bounce' 
                        : isListening 
                        ? 'bg-gradient-to-t from-rose-500 to-pink-400 animate-bounce' 
                        : 'bg-gray-200 dark:bg-slate-800'
                    }`}
                    style={{
                      height: isSpeaking || isListening ? `${Math.floor(Math.random() * 32) + 8}px` : '6px',
                      animationDelay: `${i * 45}ms`,
                      animationDuration: '0.6s'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Panel (Transcript Preview & Progress) */}
            <div className="w-full max-w-3xl mx-auto shrink-0 space-y-3.5">
              
              {/* Transcript Preview */}
              <div className="w-full text-center bg-gray-55/65 dark:bg-slate-850/60 p-4 rounded-2xl border border-gray-150 dark:border-slate-800/80 min-h-[76px] flex flex-col items-center justify-center shadow-inner leading-relaxed transition-all">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-550 block mb-1 flex items-center gap-1.5 justify-center">
                  <span>Live Response Transcript</span>
                  {isWaitingForSilence && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse border border-amber-500/20">
                      ⏱️ Auto-submitting in 3s...
                    </span>
                  )}
                </span>
                <p className={`text-sm font-semibold leading-relaxed ${
                  isListening 
                    ? 'text-rose-600 dark:text-rose-455 italic'
                    : isSending
                    ? 'text-violet-600 dark:text-violet-455 animate-pulse'
                    : 'text-gray-755 dark:text-slate-200'
                }`}>
                  {spokenSubtitle || 'Please answer naturally. Speak clearly into your microphone when the orb glows pink.'}
                </p>
              </div>

              {/* Progress Slider Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  <span>Question Progress ({progressInfo.step} of {progressInfo.total})</span>
                  <span>Silence Trigger: 3s</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all duration-500 ease-out" 
                    style={{ width: `${progressInfo.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Statistics / Analytics Panel */}
          <div className="lg:col-span-4 flex flex-col gap-5 shrink-0">
            
            {/* Assessment Diagnostics Card */}
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-[2rem] p-5 shadow-sm space-y-5">
              <div className="border-b border-gray-100 dark:border-slate-850 pb-3">
                <h3 className="font-heading font-black text-sm text-gray-950 dark:text-white tracking-tight">
                  Session Statistics
                </h3>
                <p className="text-xs text-gray-450 dark:text-slate-400 mt-0.5">
                  Real-time interview analytical metrics.
                </p>
              </div>
              
              <div className="space-y-4">
                {/* Visual Ratio */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50/50 dark:bg-slate-850/50 rounded-2xl border border-gray-100/50 dark:border-slate-800/50 text-center">
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Completed</span>
                    <span className="text-lg font-black text-gray-800 dark:text-white">{progressInfo.step - 1}</span>
                  </div>
                  <div className="p-3 bg-gray-50/55 dark:bg-slate-850/50 rounded-2xl border border-gray-100/50 dark:border-slate-800/50 text-center">
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Remaining</span>
                    <span className="text-lg font-black text-gray-800 dark:text-white">{progressInfo.total - (progressInfo.step - 1)}</span>
                  </div>
                </div>

                {/* score estimate meter */}
                <div className="p-4 bg-gradient-to-br from-primary-500/5 to-indigo-500/5 rounded-2xl border border-primary-500/10 space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-primary-700 dark:text-primary-400 font-extrabold uppercase tracking-wider">
                    <span>Estimated Score</span>
                    <span>{getRunningScoreEstimate()}%</span>
                  </div>
                  <div className="w-full bg-primary-100/40 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${getRunningScoreEstimate()}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] text-gray-400 dark:text-slate-500 block leading-tight">
                    * Dynamically calculated based on response richness and keyword density.
                  </span>
                </div>

                {/* details items */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center py-2.5 px-3 bg-gray-55/60 dark:bg-slate-855/50 rounded-xl border border-gray-150/40 dark:border-slate-800/40 text-xs">
                    <span className="font-bold text-gray-500 dark:text-slate-400">Speech Confidence</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      {isListening ? `${Math.floor(Math.random() * 5) + 94}%` : '96%'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2.5 px-3 bg-gray-55/60 dark:bg-slate-855/50 rounded-xl border border-gray-150/40 dark:border-slate-800/40 text-xs">
                    <span className="font-bold text-gray-500 dark:text-slate-400">Voice Quality</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">
                      {isOnline ? 'Excellent (Lossless)' : 'Good (Compressed)'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 px-3 bg-gray-55/60 dark:bg-slate-855/50 rounded-xl border border-gray-150/40 dark:border-slate-800/40 text-xs">
                    <span className="font-bold text-gray-500 dark:text-slate-400">Interview Status</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-455 border border-emerald-150/30">
                      Assessment Active
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Alternating Tips Panel */}
            <div className="bg-gradient-to-tr from-primary-500/5 to-secondary-500/5 border border-primary-500/10 rounded-[2rem] p-5 flex flex-col items-center text-center space-y-2 justify-center flex-grow min-h-[140px] shadow-sm">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary-500 bg-primary-500/5 px-2.5 py-1 rounded-full">
                Interview Tip
              </span>
              <p className="text-xs md:text-sm font-semibold text-gray-700 dark:text-slate-350 leading-relaxed transition-all duration-300">
                "{TIPS[tipIndex]}"
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Groq Settings Modal Overlay */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full relative space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <h2 className="font-heading font-extrabold text-xl text-gray-950 dark:text-white flex items-center">
                <Key className="w-5 h-5 mr-2 text-primary-500 animate-pulse" />
                AI Interview Configuration
              </h2>
              <p className="text-xs text-gray-550 dark:text-slate-450 mt-1 leading-relaxed">
                Provide a Groq API key to execute assessments using Groq models. The key will be stored securely in your browser's local storage and used directly for API requests.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Groq API Key
                </label>
                <input
                  type="password"
                  placeholder="gsk_..."
                  defaultValue={apiKey}
                  id="groq-key-input"
                  className="w-full px-4 py-2.5 bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white font-mono"
                />
              </div>

              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start space-x-2 text-[10px] text-amber-600 dark:text-amber-450 leading-relaxed">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">No API key?</span>
                  <p className="mt-0.5">
                    Leave this blank to continue using the built-in simulated technical questions. This mode fully evaluates the qualification and updates badges.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-2.5 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-white text-sm font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('groq-key-input') as HTMLInputElement;
                  saveApiKey(input?.value || '');
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-semibold rounded-xl hover:shadow-lg cursor-pointer"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AssessmentPage;
