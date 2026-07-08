import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface SpeakOptions {
  text: string;
  language: 'English' | 'Hindi' | 'Telugu';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (errorMsg: string) => void;
}

export default class VoiceService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log("[VoiceService] Initializing TTS engine...");

    // Important: Unlock the speech synthesis engine on user gesture
    if (window.speechSynthesis) {
      try {
        const unlockUtterance = new SpeechSynthesisUtterance("");
        unlockUtterance.volume = 0;
        window.speechSynthesis.speak(unlockUtterance);
      } catch(e) {
        console.warn("[VoiceService] Failed to unlock TTS:", e);
      }
    }

    // Unlock HTML5 Audio
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        ctx.resume();
      }
      
      const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
      silentAudio.volume = 0;
      silentAudio.play().catch(e => console.warn("[VoiceService] Silent audio unlock failed", e));
    } catch(e) {
      console.warn("[VoiceService] Failed to unlock audio context:", e);
    }

    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        console.warn("[VoiceService] Browser does not support SpeechSynthesis");
        this.isInitialized = true;
        resolve();
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log(`[VoiceService] TTS initialized. Loaded ${voices.length} voices.`);
        this.isInitialized = true;
        resolve();
      } else {
        console.log("[VoiceService] Waiting for browser voices to load...");
        const timeout = setTimeout(() => {
          console.warn("[VoiceService] Voice load timeout. Proceeding anyway.");
          this.isInitialized = true;
          resolve();
        }, 3000);

        window.speechSynthesis.onvoiceschanged = () => {
          const loadedVoices = window.speechSynthesis.getVoices();
          console.log(`[VoiceService] Voices loaded asynchronously: ${loadedVoices.length} voices.`);
          clearTimeout(timeout);
          this.isInitialized = true;
          window.speechSynthesis.onvoiceschanged = null;
          resolve();
        };
      }
    });
  }

  private isStopped = false;

  stop() {
    this.isStopped = true;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  async speak(options: SpeakOptions) {
    this.stop(); // Stop any ongoing speech
    this.isStopped = false;

    const { text, language, onStart, onEnd, onError } = options;

    // Clean text of markdown highlights for cleaner pronunciation
    const cleanText = text
      .replace(/\*\*|__/g, '')
      .replace(/#+\s/g, '')
      .replace(/`[^`]+`/g, '')
      .trim();

    console.log(`[VoiceService] Preparing to speak in ${language}: "${cleanText.substring(0, 50)}..."`);
    console.log(`[VoiceService] Using Browser SpeechSynthesis directly for ${language}.`);
    
    // Always use fallback browser TTS
    this.fallbackSpeak(cleanText, language, onStart, onEnd);
  }

  private fallbackSpeak(
    cleanText: string, 
    language: 'English' | 'Hindi' | 'Telugu', 
    onStart?: () => void, 
    onEnd?: () => void,
    retriesLeft = 1,
    useDefaultVoice = false
  ) {
    if (!window.speechSynthesis) {
      console.error("[VoiceService] Browser does not support SpeechSynthesis");
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Set language locale
    if (language === 'Hindi') {
      utterance.lang = 'hi-IN';
    } else if (language === 'Telugu') {
      utterance.lang = 'te-IN';
    } else {
      utterance.lang = 'en-US';
    }
    
    utterance.rate = language === 'English' ? 0.95 : 1.0;

    utterance.onstart = () => {
      console.log(`[VoiceService] Fallback speech started (Language: ${language})`);
      if (onStart) onStart();
    };

    const handleSpeechEnd = () => {
      console.log("[VoiceService] Fallback speech ended.");
      if (onEnd) onEnd();
    };

    utterance.onend = () => {
      if (this.isStopped) return;
      handleSpeechEnd();
    };
    
    utterance.onerror = (e) => {
      if (e.error === 'canceled' || this.isStopped) {
        console.log("[VoiceService] Speech explicitly cancelled.");
        return;
      }
      console.error("[VoiceService] Fallback speech error:", e);
      if (retriesLeft > 0) {
        console.warn(`[VoiceService] Retrying TTS... (${retriesLeft} retries left)`);
        this.fallbackSpeak(cleanText, language, onStart, onEnd, retriesLeft - 1, false);
      } else if (!useDefaultVoice) {
        console.warn("[VoiceService] Retries exhausted. Falling back to default browser voice.");
        this.fallbackSpeak(cleanText, language, onStart, onEnd, 0, true);
      } else {
        console.error("[VoiceService] TTS completely failed.");
        handleSpeechEnd();
      }
    };

    if (!useDefaultVoice) {
      // Fetch and bind pleasant voice if available
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;

      if (language === 'Hindi') {
        selectedVoice = voices.find(v => {
          const l = v.lang.toLowerCase();
          return l === 'hi' || l.startsWith('hi-') || l.startsWith('hi_');
        });
        if (!selectedVoice) {
          console.warn("[VoiceService] Hindi voice not found. Choosing best matching English voice.");
          selectedVoice = voices.find(v => {
            const l = v.lang.toLowerCase();
            return (l === 'en' || l.startsWith('en-') || l.startsWith('en_')) && 
                   (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'));
          });
          utterance.lang = 'en-US';
        }
      } else if (language === 'Telugu') {
        selectedVoice = voices.find(v => {
          const l = v.lang.toLowerCase();
          return l === 'te' || l.startsWith('te-') || l.startsWith('te_');
        });
        
        if (!selectedVoice) {
          console.warn("[VoiceService] Local Telugu voice not found. Using free Google Translate TTS chunking hack!");
          
          // Google Translate TTS has a strict 200 character limit. 
          // We must split the text into smaller chunks (sentences) and play them sequentially.
          const chunks = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
          let currentChunkIndex = 0;

          if (onStart) onStart();

          const playNextChunk = async () => {
            if (this.isStopped) return;

            if (currentChunkIndex >= chunks.length) {
              console.log(`[VoiceService] Fallback speech ended.`);
              if (onEnd) onEnd();
              return;
            }

            const chunk = chunks[currentChunkIndex].trim();
            if (!chunk) {
              currentChunkIndex++;
              playNextChunk();
              return;
            }

            try {
              // Call our Supabase proxy to bypass browser tracking prevention!
              const { data, error } = await supabase.functions.invoke('google-tts', {
                body: { text: chunk, language }
              });

              if (error || !data || !data.audioContent) {
                throw new Error("Supabase proxy failed to return audio.");
              }

              const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
              const audio = new Audio(audioUrl);
              this.currentAudio = audio;

              audio.onended = () => {
                if (this.isStopped) return;
                currentChunkIndex++;
                playNextChunk(); // Play the next sentence
              };

              audio.onerror = () => {
                if (this.isStopped) return;
                console.error(`[VoiceService] Audio playback failed on chunk ${currentChunkIndex}.`);
                if (onEnd) onEnd();
              };

              await audio.play();
            } catch (err) {
              console.error("Audio play failed on chunk", err);
              if (onEnd) onEnd();
            }
          };

          // Start playing the first chunk
          playNextChunk();
          return; // Exit here since we are using Audio, not SpeechSynthesis
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
        console.log(`[VoiceService] Selected voice: ${selectedVoice.name}`);
        utterance.voice = selectedVoice;
      }
    } else {
      console.log("[VoiceService] Using browser default voice.");
    }

    this.currentUtterance = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}

export const voiceService = new VoiceService();
