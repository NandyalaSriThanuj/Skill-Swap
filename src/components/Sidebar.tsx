import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Mic, 
  Award, 
  ShieldCheck, 
  User as UserIcon, 
  Bell, 
  Settings,
  X,
  Repeat
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { user } = useAuth();

  const overviewNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Discover Swappers', path: '/browse', icon: Search },
  ];

  const accountNav = [
    { name: 'Swap Requests', path: '/requests', icon: Bell },
    { name: 'Profile', path: '/profile', icon: UserIcon },
    { name: 'Certificates', path: '/certificates', icon: Award },
    { name: 'Interview Summaries', path: '/summaries', icon: ShieldCheck },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const renderNavGroup = (items: typeof overviewNav) => (
    items.map((item) => {
      const active = isActive(item.path);
      return (
        <Link
          key={item.name}
          to={item.path}
          onClick={() => setIsOpen(false)}
          className={`
            group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
            ${active 
              ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800/50 dark:hover:text-white'}
          `}
        >
          <item.icon className={`
            mr-3 flex-shrink-0 h-5 w-5 transition-colors
            ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300'}
          `} />
          {item.name}
        </Link>
      );
    })
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar component */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:w-64 lg:flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100 dark:border-slate-800">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-1.5 bg-primary-500 text-white rounded-lg shadow-sm">
              <Repeat className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
            </div>
            <span className="font-heading font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
              SkillSwap
            </span>
          </Link>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto py-4">
          <nav className="flex-1 px-4 space-y-1">
            <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">
              Overview
            </p>
            {renderNavGroup(overviewNav)}

            <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-8">
              Account
            </p>
            {renderNavGroup(accountNav)}
          </nav>
        </div>
        
        {/* User profile brief at bottom */}
        {user && (
          <div className="flex-shrink-0 flex border-t border-gray-100 dark:border-slate-800 p-4">
            <Link to="/profile" className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary-100 text-primary-700 font-bold dark:bg-primary-900 dark:text-primary-300">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-white group-hover:text-gray-900">
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700 dark:text-gray-400">
                    View profile
                  </p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};
