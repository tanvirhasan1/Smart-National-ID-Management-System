import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import { toast } from 'react-toastify';

import api from '../api/axios';
import { useAuth } from './AuthContext';
import socket from '../../services/socket';

const NotificationContext = createContext(null);

export const useNotifications = () =>
  useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const {
    token,
    isAuthenticated
  } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      socket.disconnect();
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const loadNotifications = async () => {
      try {
        const response = await api.get('/notifications');

        setNotifications(
          response.data.notifications || []
        );

        setUnreadCount(
          response.data.unreadCount || 0
        );
      } catch (error) {
        console.error(
          'Failed to load notifications',
          error
        );
      }
    };

    loadNotifications();

    socket.auth = {
      token
    };

    socket.connect();

    const handleNewNotification = (notification) => {
      setNotifications((previous) => [
        notification,
        ...previous
      ]);

      setUnreadCount((count) => count + 1);

      toast.info(notification.title);
    };

    socket.on(
      'notification:new',
      handleNewNotification
    );

    return () => {
      socket.off(
        'notification:new',
        handleNewNotification
      );

      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  const markAsRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);

    setNotifications((previous) =>
      previous.map((notification) =>
        notification._id === id
          ? {
              ...notification,
              isRead: true
            }
          : notification
      )
    );

    setUnreadCount((count) =>
      Math.max(0, count - 1)
    );
  };

  const markAllAsRead = async () => {
    await api.patch('/notifications/read-all');

    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        isRead: true
      }))
    );

    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};