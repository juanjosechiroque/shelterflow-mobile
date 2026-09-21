export type TodayTaskKind =
  'evaluations' | 'meeting' | 'decisions' | 'followups' | 'reevaluation';

export interface MockTodayTask {
  id: string;
  kind: TodayTaskKind;
  count: number;
  animalId: string;
  animalName: string;
  tone: 'primary' | 'info' | 'warning';
}

export const mockTodayTasks: readonly MockTodayTask[] = [
  {
    id: 'evaluations-luna',
    kind: 'evaluations',
    count: 2,
    animalId: 'luna',
    animalName: 'Luna',
    tone: 'primary',
  },
  {
    id: 'meeting-luna',
    kind: 'meeting',
    count: 1,
    animalId: 'luna',
    animalName: 'Luna',
    tone: 'info',
  },
  {
    id: 'decisions-luna',
    kind: 'decisions',
    count: 2,
    animalId: 'luna',
    animalName: 'Luna',
    tone: 'warning',
  },
  {
    id: 'followups-mia',
    kind: 'followups',
    count: 3,
    animalId: 'mia',
    animalName: 'Mia',
    tone: 'primary',
  },
  {
    id: 'reevaluation-bruno',
    kind: 'reevaluation',
    count: 1,
    animalId: 'bruno',
    animalName: 'Bruno',
    tone: 'warning',
  },
];
