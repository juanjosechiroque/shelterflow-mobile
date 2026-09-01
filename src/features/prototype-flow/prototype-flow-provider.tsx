import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { prototypeFlowReducer } from './prototype-flow-reducer';
import type { PrototypeFlowAction, PrototypeFlowState } from './types';
import { getInitialPrototypeState } from './prototype-flow-selectors';

interface PrototypeFlowContextValue {
  state: PrototypeFlowState;
  dispatch: React.Dispatch<PrototypeFlowAction>;
  reset: () => void;
}

const PrototypeFlowContext = createContext<PrototypeFlowContextValue | null>(
  null,
);

export function PrototypeFlowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    prototypeFlowReducer,
    undefined,
    getInitialPrototypeState,
  );

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value = useMemo(() => ({ state, dispatch, reset }), [state, reset]);

  return (
    <PrototypeFlowContext.Provider value={value}>
      {children}
    </PrototypeFlowContext.Provider>
  );
}

export function usePrototypeFlow(): PrototypeFlowContextValue {
  const context = useContext(PrototypeFlowContext);
  if (!context) {
    throw new Error(
      'usePrototypeFlow must be used within a PrototypeFlowProvider',
    );
  }
  return context;
}
