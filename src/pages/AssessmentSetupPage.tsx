import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { qualificationService } from '../lib/qualificationService';
import { 
  ArrowLeft, ArrowRight, Mic, Globe, CheckCircle, 
  XCircle, AlertCircle, Volume2, ShieldCheck, Play 
} from 'lucide-react';
import { SpeechService } from '../services/SpeechService';
import { voiceService } from '../lib/VoiceService';

type SetupStep = 'language' | 'system' | 'instructions';

export const AssessmentSetupPage: React.FC = () => {
  const { skillName } = useParams<{ skillName: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const decodedSkillName = skillName ? decodeURIComponent(skillName) : '';

  // Check if it's a programming or Design & UX skill
  const programmingSkills = [
    'react', 'typescript', 'python', 'tailwind css', 'node.js', 'node', 'machine learning', 
    'javascript', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 
    'programming',
    'kotlin', 'html', 'css', 'sql', 'nosql', 'git', 'docker', 'kubernetes', 
    'aws', 'android development', 'ios development', 'cyber security', 'blockchain'
  ];

  const designSkills = [
    'figma', 'ui/ux design', 'ui/ux', 'ux', 'ui', 'branding', 'photoshop', 'illustrator', 'graphic design', 
    'web design', 'motion graphics', '3d modeling', 'video editing', 'product design', 
    'logo design', 'interaction design', 'wireframing', 'prototyping', 'design'
  ];

  const isTechOrDesign = [...programmingSkills, ...designSkills].some(
    keyword => decodedSkillName.toLowerCase().includes(keyword.toLowerCase())
  );
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('language');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (isTechOrDesign) {
      setSelectedLanguage('English');
    }
  }, [isTechOrDesign]);

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

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the tracks immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
    } catch (err) {
      console.error('Mic permission denied', err);
      setMicPermission('denied');
    }
  };

  const handleStartInterview = async () => {
    if (!profile || !skillName || !selectedLanguage) return;
    
    setIsInitializing(true);
    try {
      await voiceService.init();
      const session = await qualificationService.createSession(profile.id, decodeURIComponent(skillName), selectedLanguage);
      navigate(`/assessment/${session.id}`, { state: { selectedLanguage } });
    } catch (err) {
      console.error('Error starting qualification assessment:', err);
      setIsInitializing(false);
    }
  };

  if (!skillName) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col min-h-[85vh] animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-950 dark:text-white flex items-center">
            {decodedSkillName} Voice Interview Setup
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Complete the pre-interview checklist to begin your assessment.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar: Steps Progress */}
        <div className="md:w-64 shrink-0">
          <div className="card-premium p-6 sticky top-24">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-6">Setup Progress</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-200 dark:before:bg-slate-700">
              
              {/* Step 1 */}
              <div className="relative flex items-center space-x-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-colors ${
                  currentStep === 'language' ? 'bg-primary-500 border-primary-500 text-white' : 
                  selectedLanguage ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                }`}>
                  {selectedLanguage && currentStep !== 'language' ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">1</span>}
                </div>
                <div className={`text-sm font-bold ${currentStep === 'language' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`}>
                  Language
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex items-center space-x-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-colors ${
                  currentStep === 'system' ? 'bg-primary-500 border-primary-500 text-white' : 
                  micPermission === 'granted' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                }`}>
                  {micPermission === 'granted' && currentStep !== 'system' ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">2</span>}
                </div>
                <div className={`text-sm font-bold ${currentStep === 'system' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`}>
                  System Check
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex items-center space-x-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-colors ${
                  currentStep === 'instructions' ? 'bg-primary-500 border-primary-500 text-white' : 
                  hasAgreed ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                }`}>
                  {hasAgreed ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">3</span>}
                </div>
                <div className={`text-sm font-bold ${currentStep === 'instructions' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`}>
                  Instructions
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-grow card-premium p-8 md:p-10 flex flex-col">
          
          {/* STEP 1: LANGUAGE */}
          {currentStep === 'language' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2 mb-8">
                <div className="flex items-center gap-3 text-primary-500 mb-2">
                  <Globe className="w-6 h-6" />
                  <h2 className="font-heading font-black text-2xl text-gray-900 dark:text-white">Choose Language</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Select the language you are most comfortable speaking in for this interview.
                </p>
              </div>
              <div className="space-y-4 flex-grow">
                {isTechOrDesign ? (
                  <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-4">
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium leading-relaxed flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      Programming and Design & UX interviews must be conducted in English to properly evaluate industry-standard terminology.
                    </p>
                    <button
                      onClick={() => setSelectedLanguage('English')}
                      className={`w-full py-4 px-6 rounded-xl border-2 font-bold text-base flex items-center justify-between cursor-pointer transition-all ${
                        selectedLanguage === 'English'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 shadow-sm'
                          : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-3"><span className="text-xl">🇺🇸</span> English (Enforced)</span>
                      {selectedLanguage === 'English' && <CheckCircle className="w-5 h-5 text-primary-500" />}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(['English', 'Hindi', 'Telugu'] as const).map(lang => {
                      const isSelected = selectedLanguage === lang;
                      const flags = { English: '🇺🇸', Hindi: '🇮🇳', Telugu: '🇮🇳' };
                      return (
                        <button
                          key={lang}
                          onClick={() => setSelectedLanguage(lang)}
                          className={`py-6 px-4 rounded-2xl border-2 font-bold text-base flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 shadow-md transform scale-[1.02]'
                              : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-3xl">{flags[lang]}</span>
                          <span>{lang}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-8 mt-auto border-t border-gray-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setCurrentStep('system')}
                  disabled={!selectedLanguage}
                  className="btn-primary disabled:opacity-50 disabled:pointer-events-none"
                >
                  Continue to System Check
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SYSTEM CHECK */}
          {currentStep === 'system' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
               <div className="space-y-2 mb-8">
                <div className="flex items-center gap-3 text-primary-500 mb-2">
                  <ShieldCheck className="w-6 h-6" />
                  <h2 className="font-heading font-black text-2xl text-gray-900 dark:text-white">System Check</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Ensure your microphone and internet connection are working properly.
                </p>
              </div>

              <div className="space-y-4 flex-grow">
                {/* Network Check */}
                <div className="p-5 border border-gray-150 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isOnline ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Internet Connection</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Required for AI processing</p>
                    </div>
                  </div>
                  {isOnline ? (
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Stable
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Offline
                    </span>
                  )}
                </div>

                {/* Mic Check */}
                <div className={`p-5 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  micPermission === 'granted' ? 'border-emerald-500/30 bg-emerald-500/5' : 
                  micPermission === 'denied' ? 'border-red-500/30 bg-red-500/5' : 
                  'border-gray-150 dark:border-slate-700'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      micPermission === 'granted' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                      micPermission === 'denied' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 
                      'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                    }`}>
                      <Mic className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Microphone Access</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Required for answering questions</p>
                    </div>
                  </div>
                  
                  {micPermission === 'granted' ? (
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Allowed
                    </span>
                  ) : micPermission === 'denied' ? (
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Blocked
                      </span>
                      <button onClick={requestMicPermission} className="text-xs text-primary-500 font-bold hover:underline">Try Again</button>
                    </div>
                  ) : (
                    <button 
                      onClick={requestMicPermission}
                      className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Test Microphone
                    </button>
                  )}
                </div>

                {micPermission === 'denied' && (
                  <p className="text-xs text-red-500 font-medium px-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Please click the lock icon in your browser's address bar to allow microphone access.
                  </p>
                )}
              </div>

              <div className="pt-8 mt-auto border-t border-gray-100 dark:border-slate-800 flex justify-between">
                <button
                  onClick={() => setCurrentStep('language')}
                  className="px-5 py-2.5 text-gray-600 dark:text-slate-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <button
                  onClick={() => setCurrentStep('instructions')}
                  disabled={micPermission !== 'granted' || !isOnline}
                  className="btn-primary disabled:opacity-50 disabled:pointer-events-none"
                >
                  Review Instructions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: INSTRUCTIONS */}
          {currentStep === 'instructions' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
               <div className="space-y-2 mb-8">
                <div className="flex items-center gap-3 text-primary-500 mb-2">
                  <Volume2 className="w-6 h-6" />
                  <h2 className="font-heading font-black text-2xl text-gray-900 dark:text-white">Interview Instructions</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Please read the following guidelines carefully before starting your assessment.
                </p>
              </div>

              <div className="space-y-5 flex-grow">
                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 flex items-center justify-center font-bold shrink-0">1</div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">Quiet Environment</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">Ensure you are in a quiet room with minimal background noise. Background voices may interfere with the AI transcription.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 flex items-center justify-center font-bold shrink-0">2</div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">Clear Articulation</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">Speak clearly and at a normal pace in <b>{selectedLanguage}</b>. Pause naturally between sentences.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 flex items-center justify-center font-bold shrink-0">3</div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">Automatic Submission (Silence Timeout)</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">The AI will automatically detect when you have finished speaking after a brief pause of silence. Do not stop midway through a thought.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 flex items-center justify-center font-bold shrink-0">4</div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">Evaluation Criteria</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">You will be evaluated on technical accuracy (50%), communication clarity (25%), and teaching ability (25%).</p>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="relative flex items-center pt-0.5">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 cursor-pointer accent-primary-500" 
                      checked={hasAgreed}
                      onChange={(e) => setHasAgreed(e.target.checked)}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300 select-none">
                    I have read and understood the instructions. I am ready to begin the voice assessment.
                  </span>
                </label>
              </div>

              <div className="pt-8 mt-auto border-t border-gray-100 dark:border-slate-800 flex justify-between">
                <button
                  onClick={() => setCurrentStep('system')}
                  className="px-5 py-2.5 text-gray-600 dark:text-slate-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <button
                  onClick={handleStartInterview}
                  disabled={!hasAgreed || isInitializing}
                  className="btn-primary disabled:opacity-50 disabled:pointer-events-none px-8 shadow-xl shadow-primary-500/20"
                >
                  {isInitializing ? (
                    <>Initializing...</>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2 fill-current" />
                      Start AI Interview
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AssessmentSetupPage;
