import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="flex flex-col items-center space-y-4">
          {/* Pulsing rings */}
          <div className="relative flex items-center justify-center">
            <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-primary-500 opacity-75"></div>
            <div className="relative rounded-full h-8 w-8 bg-primary-600"></div>
          </div>
          <p className="text-gray-500 dark:text-slate-400 font-medium text-sm animate-pulse">
            Loading SkillSwap...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to the login page, but save the current location they were trying to go to
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
export default ProtectedRoute;
