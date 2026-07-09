import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechService } from '../services/SpeechService';
import { GroqService } from '../services/GroqService';
import { voiceService } from '../lib/VoiceService';
import { qualificationService } from '../lib/qualificationService';
import type { QualificationSession } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export interface UseInterviewControllerProps {
  currentSession: QualificationSession;
  selectedLanguage: string;
  totalQ: number;
}

export const useInterviewController = ({ currentSession, selectedLanguage, totalQ }: UseInterviewControllerProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [session, setSession] = useState<QualificationSession>(currentSession);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isWaitingForSilence, setIsWaitingForSilence] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);
  const preExitHistoryRef = useRef<any[] | null>(null);
  
  const sessionRef = useRef<QualificationSession>(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const interviewStarted = session && session.chat_history && session.chat_history.length > 1;

  useEffect(() => {
    let interval: any;
    if (interviewStarted && !isProcessing && session?.status !== 'passed' && session?.status !== 'failed') {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [interviewStarted, isProcessing, session?.status]);
  
  const navigate = useNavigate();
  const { updateProfile } = useAuth();

  const speechServiceRef = useRef<SpeechService | null>(null);

  // Initialize SpeechService
  useEffect(() => {
    speechServiceRef.current = new SpeechService({
      onInterimTranscript: (interimText, finalizedText) => {
        setTranscript((finalizedText + ' ' + interimText).trim());
      },
      onSilenceTimeout: (fullText) => {
        submitAnswer(fullText);
      },
      onWaitingForSilence: (isWaiting) => {
        setIsWaitingForSilence(isWaiting);
      },
      onError: (err) => {
        if (err && err.error !== 'no-speech') {
          console.error("Speech error", err);
        }
      },
      onEnd: () => setIsListening(false),
    });
    
    const initMic = async () => {
      const allowed = await speechServiceRef.current!.requestPermission();
      setHasMicPermission(allowed);
    };
    initMic();

    return () => {
      speechServiceRef.current?.stop();
      voiceService.stop();
    };
  }, []);

  // Update language when it changes
  useEffect(() => {
    if (speechServiceRef.current) {
      speechServiceRef.current.setLanguage(selectedLanguage);
    }
  }, [selectedLanguage]);

  // Derived progress
  const userMessages = session.chat_history.filter(m => m.role === 'user' && !m.is_pre_interview);
  const userAnswersCount = userMessages.length;
  const progress = Math.min(100, Math.round((userAnswersCount / totalQ) * 100));

  const speak = useCallback((text: string, onEnd?: () => void) => {
    setIsPlaying(true);
    setTtsError(null); // Clear previous TTS errors
    voiceService.speak({
      text,
      language: selectedLanguage as any,
      onEnd: () => {
        setIsPlaying(false);
        if (onEnd) onEnd();
      },
      onError: (err) => {
        setTtsError(err);
      }
    });
  }, [selectedLanguage]);

  const endInterview = useCallback(async (isManualExit = false, existingResult?: any, duration?: number) => {
    // 1. Immediately stop everything
    speechServiceRef.current?.stop();
    voiceService?.stop();
    setIsListening(false);
    setIsPlaying(false);
    setIsProcessing(true);

    const currentSession = sessionRef.current;
    const actualUserMessages = currentSession.chat_history.filter((m: any) => m.role === 'user' && !m.is_pre_interview);
    const answersCount = actualUserMessages.length;

    if (answersCount === 0) {
      try {
        const updated = await qualificationService.updateSession(currentSession.id, {
          status: 'failed',
          score: 0,
          feedback: "Interview ended before any assessment was completed.",
          badge: "Not Eligible",
          report: null,
          recommendation: "Interview ended before any assessment was completed."
        });
        setSession(updated);
      } catch (e) {
        console.error("Failed to cancel interview:", e);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    try {
      let result = existingResult;
      
      if (!result) {
        // 2. Submit with forceEnd = true. Send empty string if manual exit to avoid confusing Groq.
        result = await GroqService.evaluateAnswer(
          currentSession.skill_name,
          currentSession.chat_history,
          isManualExit ? "" : "End Interview",
          selectedLanguage,
          totalQ,
          true
        );
      }

      // 3. Save to DB (only if we generated a new result, otherwise submitAnswer already saved it)
      if (!existingResult) {
        const updated = await qualificationService.updateSession(currentSession.id, {
          chat_history: result.updatedHistory,
          status: result.finalStatus,
          score: result.finalScore,
          feedback: result.finalFeedback,
          technical_score: result.technical_score,
          communication_score: result.communication_score,
          teaching_score: result.teaching_score,
          badge: result.badge,
          report: result.report,
          recommendation: result.recommendation
        });
        setSession(updated);
      }

      // 4. Update Profile
      if (result.finalStatus === 'passed' || result.finalStatus === 'failed') {
        const certId = `CERT-${currentSession.id.split('-')[0].toUpperCase()}-${new Date().getFullYear()}`;
        const newCertificate = {
          id: certId,
          skill: currentSession.skill_name,
          score: result.finalScore,
          date: new Date().toISOString(),
          badge: result.badge
        };

        // Fetch existing profile from Supabase
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('skills_teach, certificates')
          .eq('id', currentSession.user_id)
          .single();

        const existingCertificates = (dbProfile?.certificates as any[]) || [];
        const isVerified = result.finalStatus === 'passed';
        
        let newSkillsTeach = [...((dbProfile?.skills_teach as string[]) || [])];
        if (isVerified && !newSkillsTeach.includes(currentSession.skill_name)) {
          newSkillsTeach.push(currentSession.skill_name);
        }

        await qualificationService.updateProfileAfterInterview(currentSession.user_id, {
          skills_teach: newSkillsTeach,
          certificates: isVerified ? [...existingCertificates, newCertificate] : existingCertificates
        });

        // Trigger local context update so UI refreshes without reload
        updateProfile({
          skills_teach: newSkillsTeach,
          certificates: isVerified ? [...existingCertificates, newCertificate] : existingCertificates
        });
      }

      // 5. Do not navigate to summary page; instead show summary popup modal directly on this page
      // navigate(`/summary/${currentSession.id}`, { replace: true, state: { duration } });

    } catch (e) {
      console.error("Failed to end interview gracefully:", e);
      // Fallback logic to ensure it always completes successfully even if Groq fails
      const fallbackUpdated = await qualificationService.updateSession(currentSession.id, {
        status: 'failed',
        score: 0,
        feedback: "We could not generate a complete evaluation due to a network error. Please try again.",
        badge: "Not Eligible",
        report: { 
          summary: "Network error during evaluation.",
          strengths: "N/A",
          weaknesses: "N/A",
          areas_for_improvement: "N/A"
        }
      });
      setSession(fallbackUpdated);
      // Do not navigate on fallback
      // navigate(`/summary/${currentSession.id}`, { replace: true, state: { duration } });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedLanguage, totalQ, navigate, updateProfile]);

  const toggleMic = useCallback(() => {
    if (isListening) {
      speechServiceRef.current?.stop();
    } else {
      if (isPlaying) {
        voiceService.stop();
        setIsPlaying(false);
      }
      setTranscript('');
      setIsWaitingForSilence(false);
      speechServiceRef.current?.start();
      setIsListening(true);
    }
  }, [isListening, isPlaying]);

  const submitAnswer = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    // Check for exit commands (robust matching)
    const textLower = text.toLowerCase().trim();
    
    if (isConfirmingExit) {
      const isAffirmative = 
        textLower.includes("yes") || 
        textLower.includes("confirm") || 
        textLower.includes("close") || 
        textLower.includes("exit") || 
        textLower.includes("end") || 
        textLower.includes("हाँ") || 
        textLower.includes("हां") || 
        textLower.includes("అవును") || 
        textLower.includes("సరే") ||
        textLower === "y" ||
        textLower === "ok" ||
        textLower === "okay";

      const isNegative = 
        textLower.includes("no") || 
        textLower.includes("cancel") || 
        textLower.includes("continue") || 
        textLower.includes("resume") || 
        textLower.includes("नहीं") || 
        textLower.includes("వద్దు") || 
        textLower.includes("లేదు") ||
        textLower === "n";

      if (isAffirmative) {
        setIsConfirmingExit(false);
        await endInterview(true);
      } else {
        setIsConfirmingExit(false);
        const currentSession = sessionRef.current;
        const prevHistory = preExitHistoryRef.current || currentSession.chat_history;
        
        setIsProcessing(true);
        try {
          const updated = await qualificationService.updateSession(currentSession.id, {
            chat_history: prevHistory
          });
          setSession(updated);
          
          const lastQuestion = prevHistory.filter(m => m.role === 'assistant').pop()?.content || "";
          speak(lastQuestion, () => {
            console.log("[useInterviewController] AI finished speaking last question. Auto-starting mic...");
            speechServiceRef.current?.start();
            setIsListening(true);
          });
        } catch (e) {
          console.error("Failed to restore history", e);
        } finally {
          setIsProcessing(false);
        }
      }
      return;
    }

    const hasExitIntent = 
      textLower.includes("end interview") ||
      textLower.includes("close interview") ||
      textLower.includes("stop interview") ||
      textLower.includes("finish interview") ||
      textLower.includes("terminate interview") ||
      textLower.includes("exit interview") ||
      textLower.includes("close the interview") ||
      textLower.includes("end the interview") ||
      textLower.includes("stop the interview") ||
      textLower.includes("terminate the interview") ||
      textLower.includes("exit the interview") ||
      textLower === "exit" ||
      textLower === "quit" ||
      textLower === "stop" ||
      textLower === "close" ||
      (textLower.includes("close") && textLower.includes("interview")) ||
      (textLower.includes("end") && textLower.includes("interview")) ||
      (textLower.includes("exit") && textLower.includes("interview")) ||
      (textLower.includes("stop") && textLower.includes("interview")) ||
      (textLower.includes("terminate") && textLower.includes("interview")) ||
      textLower === "i'm done" ||
      textLower === "that's it";

    if (hasExitIntent) {
      if (userAnswersCount === 0) {
        speechServiceRef.current?.stop();
        voiceService?.stop();
        setIsListening(false);
        setIsPlaying(false);
        setIsProcessing(true);
        const currentSession = sessionRef.current;
        try {
          const updated = await qualificationService.updateSession(currentSession.id, {
            status: 'failed',
            score: 0,
            feedback: "Interview ended before any assessment was completed.",
            badge: "Not Eligible",
            report: null,
            recommendation: "Interview ended before any assessment was completed."
          });
          setSession(updated);
        } catch (e) {
          console.error("Failed to cancel interview before Q1:", e);
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      setIsConfirmingExit(true);
      const currentSession = sessionRef.current;
      preExitHistoryRef.current = currentSession.chat_history;

      const userMessages = currentSession.chat_history.filter((m: any) => m.role === 'user');
      const assistantMessages = currentSession.chat_history.filter((m: any) => m.role === 'assistant');
      const evaluations = assistantMessages
        .map((m: any) => m.evaluation)
        .filter((ev: any) => ev && typeof ev.score === 'number');

      const evaluatedCount = evaluations.length;
      const avgScore = evaluatedCount > 0 
        ? (evaluations.reduce((sum: number, ev: any) => sum + ev.score, 0) / evaluatedCount).toFixed(1)
        : 'N/A';

      const strengths = evaluations.map((ev: any) => ev.strength).filter(Boolean).slice(-2).join(', ');

      let confirmationPrompt = "";
      if (selectedLanguage === 'Hindi') {
        confirmationPrompt = `क्या आप वाकई साक्षात्कार बंद करना चाहते हैं? प्रश्न ${userAnswersCount} तक आपका औसत स्कोर ${avgScore}/10 है। ${strengths ? 'ताकत: ' + strengths : ''} बंद करने के लिए 'हाँ' कहें, या जारी रखने के लिए 'नहीं' कहें।`;
      } else if (selectedLanguage === 'Telugu') {
        confirmationPrompt = `మీరు నిజంగా ఇంటర్వ్యూను ముగించాలనుకుంటున్నారా? ప్రశ్న ${userAnswersCount} వరకు మీ సగటు స్కోరు ${avgScore}/10. ${strengths ? 'బలాలు: ' + strengths : ''} ముగించడానికి 'అవును' అని, లేదా కొనసాగించడానికి 'వద్దు' అని చెప్పండి.`;
      } else {
        confirmationPrompt = `Are you sure you want to close the interview? Up to question ${userAnswersCount}, your average score is ${avgScore}/10. ${strengths ? 'Strengths identified: ' + strengths + '.' : ''} Do you confirm you want to close and go to the dashboard? Say 'yes' to close, or 'no' to continue.`;
      }

      setIsProcessing(true);
      try {
        const updatedHistory = [
          ...currentSession.chat_history,
          { role: 'user' as const, content: text },
          { role: 'assistant' as const, content: confirmationPrompt }
        ];
        const updated = await qualificationService.updateSession(currentSession.id, {
          chat_history: updatedHistory
        });
        setSession(updated);
        
        speak(confirmationPrompt, () => {
          console.log("[useInterviewController] AI finished speaking exit confirmation. Auto-starting mic...");
          speechServiceRef.current?.start();
          setIsListening(true);
        });
      } catch (e) {
        console.error("Failed to set exit confirmation", e);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setIsProcessing(true);
    setTranscript('');
    const currentSession = sessionRef.current;

    try {
      const result = await GroqService.evaluateAnswer(
        currentSession.skill_name,
        currentSession.chat_history,
        text,
        selectedLanguage,
        totalQ,
        false
      );

      const updated = await qualificationService.updateSession(currentSession.id, {
        chat_history: result.updatedHistory,
        status: result.finalStatus,
        score: result.finalScore,
        feedback: result.finalFeedback,
        technical_score: result.technical_score,
        communication_score: result.communication_score,
        teaching_score: result.teaching_score,
        badge: result.badge,
        report: result.report,
        recommendation: result.recommendation
      });
      
      setSession(updated);

      if (result.finalStatus === 'passed' || result.finalStatus === 'failed') {
        // Complete interview flow, pass the already evaluated result to prevent double-evaluation
        await endInterview(false, result);
      } else {
        // Speak next question and auto-start mic when done
        speak(result.cleanedReply, () => {
          console.log("[useInterviewController] AI finished speaking next question. Auto-starting mic...");
          speechServiceRef.current?.start();
          setIsListening(true);
        });
      }

    } catch (err) {
      console.error("Error evaluating answer:", err);
      const getErrorMessage = (lang: string) => {
        if (lang === 'Hindi') return "क्षमा करें, मुझे नेटवर्क की समस्या का सामना करना पड़ा। क्या आप कृपया अपना उत्तर दोहरा सकते हैं?";
        if (lang === 'Telugu') return "క్షమించండి, కనెక్షన్ లోపపం ఏర్పడింది. దయచేసి మీ సమాధానాన్ని మళ్లీ చెప్పగలరా?";
        return "I'm sorry, I experienced a connection issue. Could you please repeat your answer?";
      };
      
      speak(getErrorMessage(selectedLanguage), () => {
        console.log("[useInterviewController] AI finished speaking error message. Auto-starting mic...");
        speechServiceRef.current?.start();
        setIsListening(true);
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedLanguage, totalQ, endInterview, speak, isConfirmingExit]);

  const startInterview = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (isProcessing) return; 

    // Check if we already have user messages
    const hasUserMessages = currentSession.chat_history.some((m: any) => m.role === 'user');
    
    setIsProcessing(true);
    try {
      if (hasUserMessages) {
        // Resume interview: just start the mic
        console.log("[useInterviewController] Resuming interview, auto-starting mic...");
        speechServiceRef.current?.start();
        setIsListening(true);
      } else {
        // Start fresh: speak the welcome message
        let reply = "";
        if (currentSession.chat_history.length > 0) {
          reply = currentSession.chat_history[0].content;
        } else {
          const getWelcomeMessage = (skill: string, lang: string) => {
            if (lang === 'Hindi') return `नमस्ते! ${skill} में आपकी दक्षता के आकलन में स्वागत है। जब आप तैयार हों तो शुरू करें।`;
            if (lang === 'Telugu') return `నమస్కారం! ${skill} లో మీ నైపుణ్యాన్ని అంచనా వేయడానికి స్వాగతం. మీరు సిద్ధంగా ఉన్నప్పుడు ప్రారంభించండి.`;
            return `Welcome to the ${skill} proficiency assessment! Are you ready to begin?`;
          };
          
          reply = getWelcomeMessage(currentSession.skill_name, selectedLanguage);
          const updated = await qualificationService.updateSession(currentSession.id, {
            chat_history: [{ role: 'assistant', content: reply }]
          });
          setSession(updated);
        }
        
        speak(reply, () => {
          console.log("[useInterviewController] AI finished speaking first question. Auto-starting mic...");
          speechServiceRef.current?.start();
          setIsListening(true);
        });
      }
    } catch (e) {
      console.error("Failed to start interview:", e);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedLanguage, speak, isProcessing]);

  return {
    session,
    progress,
    isListening,
    isPlaying,
    isProcessing,
    hasMicPermission,
    transcript,
    isWaitingForSilence,
    ttsError,
    toggleMic,
    submitAnswer,
    startInterview,
    endInterview,
    userAnswersCount,
    duration
  };
};
