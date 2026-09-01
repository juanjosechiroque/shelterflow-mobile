import type { PrototypeFlowState } from './types';

export interface PrototypeFlowRepository {
  getSnapshot(): PrototypeFlowState;
}
