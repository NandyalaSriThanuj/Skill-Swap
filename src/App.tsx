import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import BrowseSkillsPage from './pages/BrowseSkillsPage';
import ProfilePage from './pages/ProfilePage';
import RequestsPage from './pages/RequestsPage';
import SkillsPage from './pages/SkillsPage';
import SessionPage from './pages/SessionPage';
import MySessionsPage from './pages/MySessionsPage';
import AssessmentPage from './pages/AssessmentPage';
import AssessmentSetupPage from './pages/AssessmentSetupPage';
import CertificatesPage from './pages/CertificatesPage';
import InterviewSummaryPage from './pages/InterviewSummaryPage';
import InterviewSummariesPage from './pages/InterviewSummariesPage';
import { Repeat } from 'lucide-react';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<div className="flex flex-col min-h-screen"><Navbar /><main className="flex-grow"><LandingPage /></main></div>} />
            <Route path="/auth" element={<div className="flex flex-col min-h-screen"><Navbar /><main className="flex-grow"><AuthPage /></main></div>} />
            <Route path="/reset-password" element={<div className="flex flex-col min-h-screen"><Navbar /><main className="flex-grow"><ResetPasswordPage /></main></div>} />
            
            {/* Protected Routes inside Dashboard Layout */}
            <Route path="/dashboard" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
            <Route path="/browse" element={<ProtectedRoute><Layout><BrowseSkillsPage /></Layout></ProtectedRoute>} />
            <Route path="/skills" element={<ProtectedRoute><Layout><SkillsPage /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Layout><RequestsPage /></Layout></ProtectedRoute>} />
            <Route path="/sessions" element={<ProtectedRoute><Layout><MySessionsPage /></Layout></ProtectedRoute>} />
            <Route path="/session/:roomId" element={<ProtectedRoute><Layout><SessionPage /></Layout></ProtectedRoute>} />
            <Route path="/assessment-setup/:skillName" element={<ProtectedRoute><Layout><AssessmentSetupPage /></Layout></ProtectedRoute>} />
            <Route path="/assessment/:sessionId" element={<ProtectedRoute><Layout><AssessmentPage /></Layout></ProtectedRoute>} />
            <Route path="/summary/:sessionId" element={<ProtectedRoute><Layout><InterviewSummaryPage /></Layout></ProtectedRoute>} />
            <Route path="/summaries" element={<ProtectedRoute><Layout><InterviewSummariesPage /></Layout></ProtectedRoute>} />
            <Route path="/certificates" element={<ProtectedRoute><Layout><CertificatesPage /></Layout></ProtectedRoute>} />
            
            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
