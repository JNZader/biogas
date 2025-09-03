import React from 'react';
import { useNotificationStore, Notification } from '../stores/notificationStore';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

interface ToastProps {
  notification: Notification;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const { message, type } = notification;

  const config = {
    success: {
      icon: <CheckCircleIcon className="h-6 w-6 text-success" />,
      bg: 'bg-success-bg border-success',
      text: 'text-success',
    },
    error: {
      icon: <XCircleIcon className="h-6 w-6 text-error" />,
      bg: 'bg-error-bg border-error',
      text: 'text-error',
    },
    info: {
      icon: <InformationCircleIcon className="h-6 w-6 text-primary" />,
      bg: 'bg-primary/10 border-primary',
      text: 'text-primary',
    },
  };

  return (
    <div
      className={`max-w-sm w-full bg-surface shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out animate-toast-in border-l-4 ${config[type].bg}`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{config[type].icon}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${config[type].text}`}>{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${config[type].text}`}
            >
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export const NotificationContainer: React.FC = () => {
    const { notifications, removeNotification } = useNotificationStore();
    return (
        <div
        aria-live="assertive"
        className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-end z-50"
        >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
            {notifications.map(notification => (
            <Toast
                key={notification.id}
                notification={notification}
                onClose={() => removeNotification(notification.id)}
            />
            ))}
        </div>
        </div>
    );
};
