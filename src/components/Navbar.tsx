import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { notificationService } from '../lib/notificationService';
import { 
  Sun, 
  Moon, 
  Menu,
  Sparkles,
  Bell,
  Check,
  LogOut,
  Trash2,
  Award,
  Bot,
  Repeat,
  User,
  Search,
  Inbox,
  ShieldCheck,
  Eye
} from 'lucide-react';

const formatRelativeTime = (dateStr: string) => {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return 'N/A';
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return 'N/A';
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'interview':
      return <Bot className="w-4 h-4 text-purple-500" />;
    case 'swap':
      return <Repeat className="w-4 h-4 text-blue-500" />;
    case 'match':
      return <Sparkles className="w-4 h-4 text-amber-500" />;
    case 'certificate':
      return <Award className="w-4 h-4 text-emerald-500" />;
    case 'profile':
      return <User className="w-4 h-4 text-indigo-500" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" />;
  }
};

const getNotificationIconBg = (type: string) => {
  switch (type) {
    case 'interview':
      return 'bg-purple-100 dark:bg-purple-950/30';
    case 'swap':
      return 'bg-blue-100 dark:bg-blue-950/30';
    case 'match':
      return 'bg-amber-100 dark:bg-amber-950/30';
    case 'certificate':
      return 'bg-emerald-100 dark:bg-emerald-950/30';
    case 'profile':
      return 'bg-indigo-100 dark:bg-indigo-950/30';
    default:
      return 'bg-gray-100 dark:bg-slate-800';
  }
};

interface NavbarProps {
  onMenuClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, signOut, isMock, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  const scrollToSection = (id: string) => {
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
  
  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNotificationTab, setActiveNotificationTab] = useState<'all' | 'unread' | 'interview' | 'certificate' | 'swap' | 'match' | 'system'>('all');

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await notificationService.fetchNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();

    window.addEventListener('skillswap-notifications-updated', loadNotifications);

    let interval: any;
    if (isMock) {
      interval = setInterval(loadNotifications, 2500);
    } else if (user) {
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          loadNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('skillswap-notifications-updated', loadNotifications);
      };
    }

    return () => {
      window.removeEventListener('skillswap-notifications-updated', loadNotifications);
      if (interval) clearInterval(interval);
    };
  }, [user, isMock]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await notificationService.markAllAsRead(user.id);
      await loadNotifications();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleMarkRead = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(notifId);
      await loadNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(notifId);
      await loadNotifications();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    const confirmClear = window.confirm("Are you sure you want to delete all notifications?");
    if (!confirmClear) return;
    try {
      await notificationService.clearAllNotifications(user.id);
      await loadNotifications();
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      await notificationService.markAsRead(notif.id);
      await loadNotifications();
    } catch (err) {
      console.error('Error marking clicked notification as read:', err);
    }

    setShowNotifications(false);
    
    // Direct action URL routing
    if (notif.action_url) {
      navigate(notif.action_url);
      return;
    }

    // Fallback routing by type
    switch (notif.type) {
      case 'interview':
        navigate('/summaries');
        break;
      case 'certificate':
        navigate('/certificates');
        break;
      case 'swap':
        navigate('/requests');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'match':
        navigate('/browse');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {onMenuClick && (
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none"
                onClick={onMenuClick}
              >
                <Menu className="h-6 w-6" />
              </button>
            )}
            
            {/* Title / Breadcrumb could go here */}
          </div>

          {/* Middle Navigation Links (visible only on Landing Page) */}
          {isLandingPage && (
            <nav className="hidden lg:flex items-center space-x-8 text-sm font-bold text-gray-650 dark:text-slate-300">
              <button 
                onClick={() => scrollToSection('home')} 
                className="hover:text-primary-500 dark:hover:text-primary-400 transition-colors cursor-pointer focus:outline-none"
              >
                Home
              </button>
              <Link 
                to="/browse" 
                className="hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              >
                Discover Swappers
              </Link>
              <button 
                onClick={() => scrollToSection('how-it-works')} 
                className="hover:text-primary-500 dark:hover:text-primary-400 transition-colors cursor-pointer focus:outline-none"
              >
                How It Works
              </button>
              <button 
                onClick={() => scrollToSection('features')} 
                className="hover:text-primary-500 dark:hover:text-primary-400 transition-colors cursor-pointer focus:outline-none"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('about-us')} 
                className="hover:text-primary-500 dark:hover:text-primary-400 transition-colors cursor-pointer focus:outline-none"
              >
                About Us
              </button>
            </nav>
          )}

          <div className="flex items-center space-x-4">
            {isMock && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Sparkles className="w-3 h-3 mr-1" />
                Local Mode
              </span>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  aria-label="View notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 sm:w-[440px] w-[320px] rounded-2xl bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/50">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-primary-500 text-white">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2.5">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs font-semibold text-primary-500 hover:text-primary-650 flex items-center space-x-1 cursor-pointer"
                            title="Mark all as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Mark all read</span>
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={handleClearAll}
                            className="text-xs font-semibold text-red-500 hover:text-red-650 flex items-center space-x-1 cursor-pointer"
                            title="Clear all notifications"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Clear all</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search & Filter Section */}
                    <div className="p-3 border-b border-gray-100 dark:border-slate-800/80 space-y-2 bg-gray-50/20 dark:bg-slate-900/20">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search notifications..."
                          className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 placeholder-gray-400 dark:placeholder-slate-500"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-2 text-gray-450 hover:text-gray-650 text-[10px] font-bold"
                          >
                            CLEAR
                          </button>
                        )}
                      </div>

                      {/* Filter Tabs */}
                      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {(['all', 'unread', 'interview', 'certificate', 'swap', 'match', 'system'] as const).map((tab) => {
                          const isActive = activeNotificationTab === tab;
                          return (
                            <button
                              key={tab}
                              onClick={() => setActiveNotificationTab(tab)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer whitespace-nowrap ${
                                isActive
                                  ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                                  : 'bg-white dark:bg-slate-950 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-905'
                              }`}
                            >
                              {tab}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* List */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/60 scrollbar-thin">
                      {(() => {
                        const filtered = notifications.filter((n) => {
                          // Search query filter
                          const matchSearch =
                            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            n.message.toLowerCase().includes(searchQuery.toLowerCase());
                          
                          if (!matchSearch) return false;

                          // Tab filter
                          if (activeNotificationTab === 'all') return true;
                          if (activeNotificationTab === 'unread') return !n.is_read;
                          return n.type === activeNotificationTab;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-xs space-y-2.5">
                              <Inbox className="w-8 h-8 mx-auto opacity-30 text-primary-500" />
                              <p>No notifications found</p>
                            </div>
                          );
                        }

                        return filtered.map((notif) => {
                          const priorityStyle = 
                            notif.priority === 'High'
                              ? 'border-red-500/30 bg-red-500/5 text-red-500 dark:text-red-400'
                              : notif.priority === 'Medium'
                              ? 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400'
                              : 'border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400';

                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`w-full p-3.5 hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-all flex items-start space-x-3 cursor-pointer group relative ${
                                !notif.is_read ? 'bg-primary-500/[0.02] dark:bg-primary-500/[0.02]' : ''
                              } ${notif.priority === 'High' && !notif.is_read ? 'border-l-2 border-red-500' : ''}`}
                            >
                              {/* Left Icon with Circle Background */}
                              <div className={`p-2 rounded-xl shrink-0 flex items-center justify-center ${getNotificationIconBg(notif.type)}`}>
                                {getNotificationIcon(notif.type)}
                              </div>

                              {/* Center Message details */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-bold text-xs text-gray-850 dark:text-slate-200 truncate pr-4">
                                    {notif.title}
                                  </span>
                                  <span className="text-[9px] text-gray-400 dark:text-slate-500 shrink-0 font-medium">
                                    {formatRelativeTime(notif.created_at)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed pr-6 line-clamp-2">
                                  {notif.message}
                                </p>
                                
                                <div className="flex items-center space-x-2 pt-0.5">
                                  {/* Priority Pill */}
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border tracking-widest ${priorityStyle}`}>
                                    {notif.priority}
                                  </span>
                                  {/* Unread indicator */}
                                  {!notif.is_read && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse"></span>
                                  )}
                                </div>
                              </div>

                              {/* Right Action buttons (visible on hover) */}
                              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                {!notif.is_read && (
                                  <button
                                    onClick={(e) => handleMarkRead(e, notif.id)}
                                    className="p-1 rounded bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 text-gray-505 hover:text-primary-500 dark:hover:text-primary-400 hover:shadow-sm"
                                    title="Mark as read"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDeleteNotification(e, notif.id)}
                                  className="p-1 rounded bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 text-gray-505 hover:text-red-500 dark:hover:text-red-400 hover:shadow-sm"
                                  title="Delete notification"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="flex items-center space-x-3">
                <Link to="/profile" className="flex items-center space-x-2 group">
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 text-primary-700 font-bold dark:bg-primary-900 dark:text-primary-300">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200 max-w-[120px] truncate">
                    {user.email?.split('@')[0]}
                  </span>
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/auth"
                  className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:text-primary-500 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  state={{ tab: 'signup' }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
export default Navbar;
