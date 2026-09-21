import type { MockEvaluation } from './types';

export const mockEvaluations: readonly MockEvaluation[] = [
  {
    id: 'luna-sofia-eval',
    candidateId: 'luna-sofia',
    overallFit: 'POSSIBLE',
    positiveFactors: ['Interés real en la adopción responsable.'],
    concerns: ['Necesita coordinar horarios de la visita al hogar.'],
    notes: 'Buena disposición general.',
    recommendation: 'MORE_INFORMATION',
    recordedOn: '2026-08-18',
  },
  {
    id: 'nala-jorge-eval',
    candidateId: 'nala-jorge',
    overallFit: 'POSSIBLE',
    positiveFactors: ['Familia interesada en adopción responsable.'],
    concerns: ['Necesita confirmar horarios laborales.'],
    recommendation: 'MORE_INFORMATION',
    recordedOn: '2026-08-22',
  },
];

export function getEvaluationForCandidate(
  candidateId: string,
): MockEvaluation | undefined {
  return mockEvaluations.find(
    (evaluation) => evaluation.candidateId === candidateId,
  );
}
