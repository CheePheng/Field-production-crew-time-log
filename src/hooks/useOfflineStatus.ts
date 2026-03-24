import { useEffect, useRef, useState } from 'react';

export interface OfflineStatus {
  isOnline: boolean;
}

/**
 * Tracks network online/offline status using navigator.onLine and the
 * browser's 'online'/'offline' events.
 *
 * Fires optional callbacks when connectivity changes so callers can
 * show toast notifications.
 */
export function useOfflineStatus(options?: {
  onOnline?: () => void;
  onOffline?: () => void;
}): OfflineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  // Use a ref so the callbacks in event listeners always see the latest values
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  useEffect(() => {
    // Skip the first mount — only fire on actual transitions
    let mounted = false;

    function handleOnline() {
      setIsOnline(true);
      if (mounted) optionsRef.current?.onOnline?.();
    }

    function handleOffline() {
      setIsOnline(false);
      if (mounted) optionsRef.current?.onOffline?.();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    mounted = true;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
