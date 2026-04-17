import React from 'react';
import { FaExclamationCircle } from 'react-icons/fa';

// Shared error message component
const ErrorMessage = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div
      className={`error-message-wrapper mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <FaExclamationCircle className="error-message-icon mt-[2px] shrink-0 text-red-600" />
      <span className="error-message-text leading-6">{message}</span>
    </div>
  );
};

export default ErrorMessage;