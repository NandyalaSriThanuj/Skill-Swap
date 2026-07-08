export interface SpeechServiceOptions {
  onInterimTranscript: (interimText: string, finalizedText: string) => void;
  onSilenceTimeout: (fullText: string) => void;
  onWaitingForSilence: (isWaiting: boolean) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

export class SpeechService {
  private recognition: any = null;
  public isListening = false;
  private intentionallyStopped = false;
  
  private finalTranscript = '';
  private currentInterimTranscript = '';
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SILENCE_TIMEOUT_MS = 3000;
  
  private options: SpeechServiceOptions;
  
  constructor(options: SpeechServiceOptions) {
    this.options = options;
    this.init();
  }

  private init() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true; // Required for continuous speech
      this.recognition.interimResults = true; // Required for interim preview and accurate silence detection
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        this.clearSilenceTimer();
        this.options.onWaitingForSilence(false);

        let interimTranscript = '';
        let newFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newFinalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (newFinalTranscript) {
           this.finalTranscript += newFinalTranscript;
        }
        
        this.currentInterimTranscript = interimTranscript;

        this.options.onInterimTranscript(interimTranscript, this.finalTranscript);

        // Start the silence timer if we have ANY text (final or interim)
        if (this.finalTranscript.trim() || interimTranscript.trim()) {
          this.startSilenceTimer();
        }
      };

      this.recognition.onerror = (event: any) => {
        // network error, no-speech, not-allowed
        if (event.error !== 'no-speech') {
           console.warn('Speech recognition error:', event.error);
        }
        
        if (this.options.onError) {
          this.options.onError(event);
        }

        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
           this.intentionallyStopped = true;
           this.isListening = false;
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        
        // Auto-restart if we didn't intentionally stop
        if (!this.intentionallyStopped) {
           try {
              this.recognition.start();
              this.isListening = true;
           } catch(e) {
              console.error("Auto-restart failed", e);
           }
        } else if (this.options.onEnd) {
           this.options.onEnd();
        }
      };
    } else {
      console.warn('Speech Recognition API is not supported in this browser.');
    }
  }
  
  private startSilenceTimer() {
    this.silenceTimer = setTimeout(() => {
      this.options.onWaitingForSilence(false);
      this.stop(true); // stop intentionally, triggers timeout logic
    }, this.SILENCE_TIMEOUT_MS);
    this.options.onWaitingForSilence(true);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  public setLanguage(lang: string) {
    if (this.recognition) {
       if (lang === 'Hindi') this.recognition.lang = 'hi-IN';
       else if (lang === 'Telugu') this.recognition.lang = 'te-IN';
       else this.recognition.lang = 'en-US';
    }
  }

  public async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      return false;
    }
  }

  public start() {
    if (this.recognition && !this.isListening) {
      try {
        this.finalTranscript = '';
        this.currentInterimTranscript = '';
        this.intentionallyStopped = false;
        this.clearSilenceTimer();
        this.options.onWaitingForSilence(false);
        this.recognition.start();
        this.isListening = true;
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        this.isListening = false;
      }
    }
  }

  public stop(triggerSubmit = false) {
    if (this.recognition && this.isListening) {
      try {
        this.intentionallyStopped = true;
        this.clearSilenceTimer();
        this.options.onWaitingForSilence(false);
        this.recognition.stop();
        this.isListening = false;
        
        if (triggerSubmit) {
           const fullTranscript = (this.finalTranscript + ' ' + this.currentInterimTranscript).trim();
           if (fullTranscript) {
              this.options.onSilenceTimeout(fullTranscript);
           }
           this.finalTranscript = '';
           this.currentInterimTranscript = '';
        }
      } catch (e) {
        console.error("Failed to stop speech recognition:", e);
      }
    }
  }
}
