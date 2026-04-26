import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`toast ${type}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onClick={onClose}
    >
      {type === 'success' ? '✅' : '❌'} {message}
    </div>
  );
}
