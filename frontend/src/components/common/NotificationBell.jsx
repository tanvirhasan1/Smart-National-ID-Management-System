import React, { useEffect, useRef, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import { useNotifications } from '../context/NotificationContext';

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const wrapperRef = useRef(null);
  const previousUnreadCount = useRef(0);
  const ringTimerRef = useRef(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  useEffect(() => {
    if (unreadCount > previousUnreadCount.current) {
      setIsRinging(false);

      window.requestAnimationFrame(() => {
        setIsRinging(true);
      });

      if (ringTimerRef.current) {
        window.clearTimeout(ringTimerRef.current);
      }

      ringTimerRef.current = window.setTimeout(() => {
        setIsRinging(false);
      }, 900);
    }

    previousUnreadCount.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (ringTimerRef.current) {
        window.clearTimeout(ringTimerRef.current);
      }
    };
  }, []);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification._id);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async (event) => {
    event.stopPropagation();

    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const formatDate = (value) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString();
  };

  return (
    <div
      ref={wrapperRef}
      className="snid-notification-bell"
    >
      <style>{`
        .snid-notification-bell {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
        }

        .snid-notification-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          padding: 0;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          color: #059669;
          cursor: pointer;
          transition:
            background-color 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease,
            transform 0.15s ease;
        }

        .snid-notification-button:hover,
        .snid-notification-button.is-open {
          border-color: #d1fae5;
          background: #ecfdf5;
          color: #047857;
        }

        .snid-notification-button:active {
          transform: scale(0.96);
        }

        .snid-notification-button:focus-visible {
          outline: 3px solid rgba(5, 150, 105, 0.18);
          outline-offset: 2px;
        }

        .snid-notification-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          line-height: 1;
          transform-origin: 50% 8%;
        }

        .snid-notification-icon.is-ringing {
          animation: snidBellRing 0.9s ease-in-out;
        }

        .snid-notification-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 19px;
          height: 19px;
          padding: 0 5px;
          border: 2px solid #ffffff;
          border-radius: 999px;
          background: #ef2b1f;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
          box-shadow: 0 2px 7px rgba(239, 43, 31, 0.25);
        }

        .snid-notification-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          z-index: 9999;
          width: min(390px, calc(100vw - 24px));
          max-height: 460px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
        }

        .snid-notification-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 15px 16px;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .snid-notification-title {
          margin: 0;
          color: #1f2937;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.25;
        }

        .snid-notification-read-all {
          padding: 4px 0;
          border: 0;
          background: transparent;
          color: #059669;
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .snid-notification-read-all:hover {
          color: #047857;
          text-decoration: underline;
        }

        .snid-notification-list {
          max-height: 395px;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .snid-notification-empty {
          padding: 34px 20px;
          color: #64748b;
          text-align: center;
          font-size: 14px;
        }

        .snid-notification-item {
          display: flex;
          gap: 10px;
          width: 100%;
          padding: 14px 16px;
          border: 0;
          border-bottom: 1px solid #eef2f7;
          background: #ffffff;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.18s ease;
        }

        .snid-notification-item:last-child {
          border-bottom: 0;
        }

        .snid-notification-item:hover {
          background: #f8fafc;
        }

        .snid-notification-item.is-unread {
          background: #ecfdf5;
        }

        .snid-notification-item.is-unread:hover {
          background: #dcfce7;
        }

        .snid-notification-dot {
          flex: 0 0 auto;
          width: 8px;
          height: 8px;
          margin-top: 7px;
          border-radius: 999px;
          background: #059669;
          box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.1);
        }

        .snid-notification-content {
          min-width: 0;
          flex: 1;
        }

        .snid-notification-item-title {
          display: block;
          margin: 0 0 5px;
          color: #1f2937;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.35;
        }

        .snid-notification-message {
          margin: 0;
          color: #4b5563;
          font-size: 13px;
          font-weight: 400;
          line-height: 1.5;
        }

        .snid-notification-time {
          display: block;
          margin-top: 7px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 400;
          line-height: 1.35;
        }

        @keyframes snidBellRing {
          0% { transform: rotate(0deg); }
          12% { transform: rotate(18deg); }
          24% { transform: rotate(-16deg); }
          36% { transform: rotate(13deg); }
          48% { transform: rotate(-10deg); }
          60% { transform: rotate(7deg); }
          72% { transform: rotate(-4deg); }
          84% { transform: rotate(2deg); }
          100% { transform: rotate(0deg); }
        }

        @media (max-width: 640px) {
          .snid-notification-button {
            width: 40px;
            height: 40px;
          }

          .snid-notification-dropdown {
            position: fixed;
            top: 72px;
            right: 12px;
            left: 12px;
            width: auto;
            max-height: calc(100vh - 90px);
          }

          .snid-notification-list {
            max-height: calc(100vh - 155px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .snid-notification-icon.is-ringing {
            animation: none;
          }

          .snid-notification-button,
          .snid-notification-item {
            transition: none;
          }
        }
      `}</style>

      <button
        type="button"
        className={`snid-notification-button ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : 'Notifications'
        }
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span
          className={`snid-notification-icon ${
            isRinging ? 'is-ringing' : ''
          }`}
          aria-hidden="true"
        >
          <FaBell />
        </span>

        {unreadCount > 0 && (
          <span className="snid-notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="snid-notification-dropdown"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="snid-notification-header">
            <h3 className="snid-notification-title">
              Notifications
            </h3>

            {unreadCount > 0 && (
              <button
                type="button"
                className="snid-notification-read-all"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="snid-notification-list">
            {notifications.length === 0 ? (
              <div className="snid-notification-empty">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification._id}
                  className={`snid-notification-item ${
                    notification.isRead ? '' : 'is-unread'
                  }`}
                  onClick={() =>
                    handleNotificationClick(notification)
                  }
                >
                  {!notification.isRead && (
                    <span
                      className="snid-notification-dot"
                      aria-hidden="true"
                    />
                  )}

                  <span className="snid-notification-content">
                    <strong className="snid-notification-item-title">
                      {notification.title}
                    </strong>

                    <span className="snid-notification-message">
                      {notification.message}
                    </span>

                    <span className="snid-notification-time">
                      {formatDate(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
