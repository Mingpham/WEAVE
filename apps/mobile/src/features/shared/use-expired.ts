import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// UI-only deadline hint. The mutation adapter/server still validates expiration.
export function useExpired(expiresAt?: string) {
  const deadline = expiresAt ? Date.parse(expiresAt) : NaN;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!Number.isFinite(deadline) || now >= deadline) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, Math.min(deadline - Date.now() + 1, 2147483647)));
    const subscription = AppState.addEventListener('change', status => {if (status === 'active') setNow(Date.now());});
    return () => {clearTimeout(timer); subscription.remove();};
  }, [deadline, now]);
  return Number.isFinite(deadline) && now >= deadline;
}
