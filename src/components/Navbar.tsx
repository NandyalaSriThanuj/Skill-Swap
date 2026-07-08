import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { 
  Sun, 
  Moon, 
  Menu,
  Sparkles,
  Bell,
  Check,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  onMenuClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, signOut, isMock, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadNotifications = async () => {
    if (!user) return;
    if (isMock) {
      const allNotifs = JSON.parse(localStorage.getItem('skillswap-mock-notifications') || '[]');
      const userNotifs = allNotifs.filter((n: any) => n.user_id === user.id);
      setNotifications(userNotifs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } else {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setNotifications(data);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    }
  };

  useEffect(() => {
    loadNotifications();

    window.addEventListener('skillswap-notifications-updated', loadNotifications);

    let interval: any;
    if (isMock) {
      interval = setInterval(loadNotifications, 3000);
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
    if (isMock) {
      const allNotifs = JSON.parse(localStorage.getItem('skillswap-mock-notifications') || '[]');
      const updated = allNotifs.map((n: any) => n.user_id === user.id ? { ...n, is_read: true } : n);
      localStorage.setItem('skillswap-mock-notifications', JSON.stringify(updated));
      loadNotifications();
    } else {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id);
        if (!error) loadNotifications();
      } catch (err) {
        console.error('Error marking notifications read:', err);
      }
    }
  };

  const handleNotificationClick = async (notif: any) => {
    // Mark as read
    if (isMock) {
      const allNotifs = JSON.parse(localStorage.getItem('skillswap-mock-notifications') || '[]');
      const updated = allNotifs.map((n: any) => n.id === notif.id ? { ...n, is_read: true } : n);
      localStorage.setItem('skillswap-mock-notifications', JSON.stringify(updated));
      loadNotifications();
    } else {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notif.id);
      loadNotifications();
    }

    setShowNotifications(false);
    
    // Navigate if there is a room ID
    if (notif.roomId) {
      navigate(`/session/${notif.roomId}`);
    } else {
      navigate('/requests');
    }
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
            <div className="hidden lg:block ml-4 text-sm text-gray-800 dark:text-gray-200">
              <div className="text-[10px] text-gray-450 dark:text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">
                Welcome back,
              </div>
              <div className="font-extrabold text-gray-900 dark:text-white flex items-center leading-none">
                {profile?.full_name || user?.email?.split('@')[0] || 'Swapper'} 👋
              </div>
            </div>
          </div>

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
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-850">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs font-semibold text-primary-500 hover:text-primary-650 flex items-center space-x-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-850">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 dark:text-slate-500 text-xs">
                          Your inbox is empty
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full text-left p-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors flex flex-col space-y-1 cursor-pointer ${
                              !notif.is_read ? 'bg-primary-500/5 dark:bg-primary-500/3' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-gray-800 dark:text-slate-200 truncate max-w-[170px]">
                                {notif.title}
                              </span>
                              <span className="text-[9px] text-gray-405">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {notif.content}
                            </p>
                          </button>
                        ))
                      )}
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
