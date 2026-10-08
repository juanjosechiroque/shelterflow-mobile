import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

// Not a domain store — callers must never persist signed URLs or tokens
// through this hook.
export function usePersistedState<T>(
  key: string,
  initialValue: T,
  validate?: (value: unknown) => value is T,
): { value: T; setValue: (next: T) => void } {
  const [value, setValueState] = useState<T>(initialValue);
  const userChangedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!isMounted || raw === null || userChangedRef.current) return;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!validate || validate(parsed)) setValueState(parsed as T);
        } catch {
          // Ignore a corrupt value; the initial value stays in effect.
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [key, validate]);

  const setValue = useCallback(
    (next: T) => {
      userChangedRef.current = true;
      setValueState(next);
      void AsyncStorage.setItem(key, JSON.stringify(next)).catch(
        () => undefined,
      );
    },
    [key],
  );

  return { value, setValue };
}
