import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, AlertCircle, Info, Sparkles, Eye, EyeOff } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, user, isMock, resetPasswordForEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine starting tab
  const initialTab = (location.state as any)?.tab === 'signup' ? 'signup' : 'login';
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot-password'>(initialTab);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (activeTab === 'login') {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError.message || 'Failed to sign in. Please check your credentials.');
      } else {
        setSuccess('Logged in successfully!');
      }
    } else if (activeTab === 'signup') {
      // Validate Sign Up input
      if (!fullName.trim() || !username.trim()) {
        setError('Please fill in all profile fields.');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-type your password correctly.');
        setLoading(false);
        return;
      }
      
      const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');

      const { error: signUpError } = await signUp(email, password, fullName.trim(), cleanUsername);
      if (signUpError) {
        setError(signUpError.message || 'Failed to sign up.');
      } else {
        setSuccess('Account created successfully! Welcome to SkillSwap.');
      }
    } else {
      // Forgot Password flow
      const { error: resetError } = await resetPasswordForEmail(email);
      if (resetError) {
        setError(resetError.message || 'Failed to send recovery email. Please try again.');
      } else {
        setSuccess('Recovery email sent! Please check your inbox for the reset link.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 py-12 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl">
        <div className="text-center space-y-2">
          <h2 className="font-heading font-extrabold text-3xl text-gray-900 dark:text-white">
            {activeTab === 'forgot-password' ? 'Reset Password' : 'Welcome to SkillSwap'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {activeTab === 'login' 
              ? 'Sign in to match and swap skills' 
              : activeTab === 'signup' 
              ? 'Create an account to start sharing' 
              : 'Enter your email to receive a password recovery link'}
          </p>
        </div>

        {/* Local mode helper banner */}
        {isMock && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start space-x-2 text-xs text-amber-800 dark:text-amber-300">
            <Info className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Demo Mode Active:</span> You can sign up or log in using any email/password. Data will be saved locally in your browser.
            </div>
          </div>
        )}

        {/* Tab Buttons */}
        {activeTab !== 'forgot-password' && (
          <div className="flex border-b border-gray-100 dark:border-slate-800">
            <button
              onClick={() => {
                setActiveTab('login');
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-all ${
                activeTab === 'login'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-650 dark:hover:text-slate-350'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-all ${
                activeTab === 'signup'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-650 dark:hover:text-slate-350'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error / Success Banners */}
        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-center space-x-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-2xl flex items-center space-x-2 text-sm text-emerald-700 dark:text-emerald-400">
            <Sparkles className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'signup' && (
            <>
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all dark:text-white"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-gray-400">@</span>
                  <input
                    type="text"
                    required
                    placeholder="janedoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all dark:text-white"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all dark:text-white"
              />
            </div>
          </div>

          {/* Password */}
          {activeTab !== 'forgot-password' && (
            <>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {activeTab === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('forgot-password');
                        setError(null);
                        setSuccess(null);
                      }}
                      className="text-xs font-semibold text-primary-500 hover:text-primary-600 focus:outline-none"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-white focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (only for signup) */}
              {activeTab === 'signup' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-white focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>
              {loading 
                ? 'Processing...' 
                : activeTab === 'login' 
                ? 'Sign In' 
                : activeTab === 'signup' 
                ? 'Create Account' 
                : 'Send Reset Link'}
            </span>
          </button>

          {activeTab === 'forgot-password' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs font-semibold text-primary-500 hover:text-primary-600 focus:outline-none"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
export default AuthPage;
