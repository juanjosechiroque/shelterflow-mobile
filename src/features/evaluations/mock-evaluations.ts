import type { MockEvaluation } from './types';

export const mockEvaluations: readonly MockEvaluation[] = [
  {
    id: 'luna-ana-eval',
    candidateId: 'luna-ana',
    overallFit: 'STRONG',
    positiveFactors: [
      'Experiencia previa con perros medianos.',
      'Disposición a visitas de seguimiento.',
    ],
    concerns: ['Espacio disponible limitado en el departamento.'],
    notes: 'Buena actitud y expectativas realistas sobre la adaptación.',
    recommendation: 'CONTINUE',
    recordedOn: '2026-07-24',
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
