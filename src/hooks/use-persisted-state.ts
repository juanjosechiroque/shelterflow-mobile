import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Small UI preference that survives an application restart.
 *
 * Intended for lightweight, non-sensitive UI state such as a selected filter.
 * It is not a domain store and must never hold signed URLs or tokens.
 */
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
