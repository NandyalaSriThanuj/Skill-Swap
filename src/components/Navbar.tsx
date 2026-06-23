import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Repeat, 
  LayoutDashboard, 
  Search, 
  Inbox, 
  User as UserIcon, 
  LogOut, 
  Sparkles,
  Bell,
  Check
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, signOut, isMock } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = user 
    ? [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Browse Skills', path: '/browse', icon: Search },
        { name: 'Swap Requests', path: '/requests', icon: Inbox },
        { name: 'Profile', path: '/profile', icon: UserIcon },
      ]
    : [
        { name: 'Browse', path: '/browse', icon: Search },
      ];

  return (
    <nav className="sticky top-0 z-50 w-full glass shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-primary-500 text-white rounded-xl shadow-md shadow-primary-500/20 group-hover:scale-110 transition-transform duration-300">
                <Repeat className="h-5 w-5 animate-pulse-slow" />
              </div>
              <span className="font-heading font-extrabold text-xl tracking-tight bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                SkillSwap
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-primary-500/10 text-primary-600 dark:text-primary-500'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Supabase Mock Mode Indicator */}
            {isMock && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Sparkles className="w-3 h-3 mr-1" />
                Local Mode
              </span>
            )}

            {/* Light/Dark Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications Bell */}
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

                {/* Dropdown menu */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden glass z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-850">
                      <h3 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
                        Notifications Inbox
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
                  <img
                    src={profile?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.email}`}
                    alt="Profile"
                    className="h-8 w-8 rounded-full border border-primary-500/20 object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200 max-w-[120px] truncate">
                    {profile?.full_name || 'My Profile'}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
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

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden space-x-2">
            {isMock && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Local
              </span>
            )}
            
            {/* Mobile Notifications Bell */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  aria-label="View notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown menu */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden glass z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-850">
                      <h3 className="font-heading font-bold text-xs text-gray-900 dark:text-white">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] font-semibold text-primary-500 hover:text-primary-650 flex items-center space-x-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-850">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 dark:text-slate-500 text-xs">
                          Inbox is empty
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full text-left p-3.5 hover:bg-gray-50/50 dark:hover:bg-slate-805 transition-colors flex flex-col space-y-1 cursor-pointer ${
                              !notif.is_read ? 'bg-primary-500/5 dark:bg-primary-500/3' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-gray-800 dark:text-slate-200 truncate max-w-[140px]">
                                {notif.title}
                              </span>
                              <span className="text-[9px] text-gray-405">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
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

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-gray-100 dark:border-slate-800 animate-in slide-in-from-top-5 duration-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-base font-medium transition-all ${
                    isActive(link.path)
                      ? 'bg-primary-500/10 text-primary-600 dark:text-primary-500'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
            
            {user ? (
              <div className="pt-4 pb-2 border-t border-gray-200 dark:border-slate-800 mt-2 px-3">
                <div className="flex items-center space-x-3 mb-4">
                  <img
                    src={profile?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.email}`}
                    alt="Profile"
                    className="h-10 w-10 rounded-full border border-primary-500/20"
                  />
                  <div>
                    <div className="text-base font-bold text-gray-800 dark:text-white">{profile?.full_name}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">@{profile?.username}</div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 w-full px-3 py-2.5 text-left text-base font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="pt-4 pb-2 border-t border-gray-200 dark:border-slate-800 mt-2 px-3 flex flex-col space-y-2">
                <Link
                  to="/auth"
                  onClick={() => setIsOpen(false)}
                  className="flex justify-center items-center px-4 py-2.5 text-center text-base font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  state={{ tab: 'signup' }}
                  onClick={() => setIsOpen(false)}
                  className="flex justify-center items-center px-4 py-2.5 text-center text-base font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-md shadow-primary-500/10"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
