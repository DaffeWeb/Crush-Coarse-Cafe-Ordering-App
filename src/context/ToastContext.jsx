import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

function ToastItem({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentOffsetRef = useRef(0);
  const hasMovedRef = useRef(false);
  const pointerIdRef = useRef(null);
  const timerRef = useRef(null);

  const duration = toast.duration || 4000;

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 200);
  }, [onRemove, toast.id]);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, handleDismiss]);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    startXRef.current = e.clientX;
    currentOffsetRef.current = 0;
    hasMovedRef.current = false;
    pointerIdRef.current = e.pointerId;
    setIsDragging(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const diff = e.clientX - startXRef.current;
    if (Math.abs(diff) > 5) {
      hasMovedRef.current = true;
    }
    currentOffsetRef.current = diff;
    setDragOffset(diff);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      if (pointerIdRef.current !== null) {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      }
    } catch {
      // ignore
    }

    const threshold = 70;
    if (Math.abs(currentOffsetRef.current) > threshold) {
      setIsExiting(true);
      const exitTarget = currentOffsetRef.current > 0 ? 350 : -350;
      setDragOffset(exitTarget);
      setTimeout(() => {
        onRemove(toast.id);
      }, 200);
    } else {
      setDragOffset(0);
      currentOffsetRef.current = 0;
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    }
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setDragOffset(0);
    currentOffsetRef.current = 0;
  };

  const handleClick = () => {
    if (!hasMovedRef.current) {
      handleDismiss();
    }
  };

  const opacity = Math.max(0, 1 - Math.abs(dragOffset) / 220);

  return (
    <div
      className={`toast toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      style={{
        transform: dragOffset !== 0 ? `translateX(${dragOffset}px)` : undefined,
        opacity: dragOffset !== 0 ? opacity : undefined,
        transition: isDragging
          ? 'none'
          : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'pan-y',
        userSelect: 'none',
      }}
    >
      <span className="toast-icon">
        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : toast.type === 'warning' ? '⚠' : 'ℹ'}
      </span>
      <span className="toast-message">{toast.message}</span>
      <span className="toast-close-btn" aria-label="Dismiss">✕</span>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const success = useCallback((msg, duration) => addToast(msg, 'success', duration), [addToast]);
  const error = useCallback((msg, duration) => addToast(msg, 'error', duration), [addToast]);
  const warning = useCallback((msg, duration) => addToast(msg, 'warning', duration), [addToast]);
  const info = useCallback((msg, duration) => addToast(msg, 'info', duration), [addToast]);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
