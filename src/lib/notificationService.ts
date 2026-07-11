import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Notification } from '../types';

const MOCK_NOTIFS_KEY = 'skillswap-mock-notifications';

const getMockNotifications = (): Notification[] => {
  return JSON.parse(localStorage.getItem(MOCK_NOTIFS_KEY) || '[]');
};

const saveMockNotifications = (notifs: Notification[]) => {
  localStorage.setItem(MOCK_NOTIFS_KEY, JSON.stringify(notifs));
  window.dispatchEvent(new Event('skillswap-notifications-updated'));
};

export const notificationService = {
  isMock(): boolean {
    return !isSupabaseConfigured;
  },

  async fetchNotifications(userId: string): Promise<Notification[]> {
    if (this.isMock()) {
      const all = getMockNotifications();
      return all
        .filter(n => n.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
      return (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        type: item.type,
        title: item.title,
        message: item.message || item.content || '',
        priority: item.priority || 'Medium',
        is_read: item.is_read,
        action_url: item.action_url,
        created_at: item.created_at,
        content: item.content || item.message || '',
        roomId: item.action_url?.startsWith('/session/') ? item.action_url.replace('/session/', '') : undefined
      }));
    }
  },

  async createNotification(
    userId: string,
    notif: Omit<Notification, 'id' | 'created_at' | 'is_read'>
  ): Promise<void> {
    if (this.isMock()) {
      const all = getMockNotifications();
      const newNotif: Notification = {
        id: `notif-${Math.random().toString(36).substring(2, 9)}`,
        user_id: userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        priority: notif.priority || 'Medium',
        is_read: false,
        action_url: notif.action_url,
        created_at: new Date().toISOString(),
        content: notif.message,
        roomId: notif.action_url?.startsWith('/session/') ? notif.action_url.replace('/session/', '') : undefined
      };
      all.push(newNotif);
      saveMockNotifications(all);
      await this.trimNotifications(userId);
    } else {
      const payload = {
        user_id: userId,
        type: notif.type,
        title: notif.title,
        content: notif.message,
        message: notif.message,
        priority: notif.priority || 'Medium',
        action_url: notif.action_url,
        is_read: false
      };
      const { error } = await supabase.from('notifications').insert(payload);
      if (error) {
        console.error('Error creating notification:', error);
      } else {
        await this.trimNotifications(userId);
      }
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    if (this.isMock()) {
      const all = getMockNotifications();
      const updated = all.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
      saveMockNotifications(updated);
    } else {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (this.isMock()) {
      const all = getMockNotifications();
      const updated = all.map(n => n.user_id === userId ? { ...n, is_read: true } : n);
      saveMockNotifications(updated);
    } else {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
      if (error) {
        console.error('Error marking all notifications as read:', error);
      }
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    if (this.isMock()) {
      const all = getMockNotifications();
      const updated = all.filter(n => n.id !== notificationId);
      saveMockNotifications(updated);
    } else {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) {
        console.error('Error deleting notification:', error);
      }
    }
  },

  async clearAllNotifications(userId: string): Promise<void> {
    if (this.isMock()) {
      const all = getMockNotifications();
      const updated = all.filter(n => n.user_id !== userId);
      saveMockNotifications(updated);
    } else {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
      if (error) {
        console.error('Error clearing notifications:', error);
      }
    }
  },

  async trimNotifications(userId: string): Promise<void> {
    if (this.isMock()) {
      const all = getMockNotifications();
      const userNotifs = all.filter(n => n.user_id === userId);
      if (userNotifs.length > 100) {
        userNotifs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const toDeleteCount = userNotifs.length - 100;
        const idsToDelete = userNotifs.slice(0, toDeleteCount).map(n => n.id);
        const updated = all.filter(n => !idsToDelete.includes(n.id));
        saveMockNotifications(updated);
      }
    } else {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data && data.length > 100) {
          const idsToDelete = data.slice(100).map(item => item.id);
          await supabase
            .from('notifications')
            .delete()
            .in('id', idsToDelete);
        }
      } catch (err) {
        console.error('Error trimming notifications in database:', err);
      }
    }
  }
};
