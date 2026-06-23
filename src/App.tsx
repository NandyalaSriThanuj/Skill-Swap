import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import BrowseSkillsPage from './pages/BrowseSkillsPage';
import ProfilePage from './pages/ProfilePage';
import RequestsPage from './pages/RequestsPage';
import SkillsPage from './pages/SkillsPage';
import SessionPage from './pages/SessionPage';
import AssessmentPage from './pages/AssessmentPage';
import { Repeat } from 'lucide-react';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-300">
            {/* Header / Navbar */}
            <Navbar />

            {/* Main Content Areas */}
            <main className="flex-grow">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/browse" element={<BrowseSkillsPage />} />
                <Route path="/skills" element={<SkillsPage />} />

                {/* Protected Members Routes */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/requests" 
                  element={
                    <ProtectedRoute>
                      <RequestsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/session/:roomId" 
                  element={
                    <ProtectedRoute>
                      <SessionPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/assessment/:sessionId" 
                  element={
                    <ProtectedRoute>
                      <AssessmentPage />
                    </ProtectedRoute>
                  } 
                />

                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-slate-900 border-t border-gray-200/60 dark:border-slate-800/80 transition-colors duration-300 py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-primary-500 text-white rounded-lg">
                    <Repeat className="h-4 w-4" />
                  </div>
                  <span className="font-heading font-extrabold text-sm tracking-tight text-gray-900 dark:text-white">
                    SkillSwap
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  &copy; {new Date().getFullYear()} SkillSwap Inc. Exchange knowledge, empower growth.
                </p>
                <div className="flex space-x-4 text-xs text-gray-500 dark:text-slate-400">
                  <a href="#" className="hover:text-primary-500 transition-colors">Privacy Policy</a>
                  <a href="#" className="hover:text-primary-500 transition-colors">Terms of Service</a>
                  <a href="#" className="hover:text-primary-500 transition-colors">Contact Support</a>
                </div>
              </div>
            </footer>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
