import type { SupabaseClient } from '@supabase/supabase-js';

import {
  getCandidate,
  listCandidatesByAnimal,
} from '@/features/candidates/candidate-repository';
import {
  getEvaluationForCandidate,
  recordEvaluation,
} from '@/features/evaluations/evaluation-repository';
import {
  completeMeeting,
  listMeetingsForCandidate,
  scheduleMeeting,
} from '@/features/meetings/meeting-repository';
import type { Database } from '@/lib/database.types';

type Result = { data: unknown; error: unknown };

/**
 * Minimal PostgREST-shaped fake. `select()` returns a chain that ignores every
 * `.eq()` / `.order()` filter and resolves the configured result on the
 * terminating call (`.maybeSingle()`, `.order()` or awaiting the builder).
 */
function createClient(config: {
  tableResult?: Result;
  rpc?: Record<string, Result>;
}): {
  client: SupabaseClient<Database>;
  rpcMock: jest.Mock;
} {
  const tableResult = config.tableResult ?? { data: null, error: null };

  const builder: Record<string, unknown> = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.is = jest.fn(() => builder);
  builder.order = jest.fn(() => Promise.resolve(tableResult));
  builder.maybeSingle = jest.fn(() => Promise.resolve(tableResult));
  builder.single = jest.fn(() => Promise.resolve(tableResult));
  builder.then = (resolve: (value: Result) => unknown) => resolve(tableResult);

  const from = jest.fn(() => builder);

  const rpcMock = jest.fn((name: string) =>
    Promise.resolve(config.rpc?.[name] ?? { data: null, error: null }),
  );

  const client = { from, rpc: rpcMock } as unknown as SupabaseClient<Database>;
  return { client, rpcMock };
}

const shelterId = '00000000-0000-4000-8000-000000000001';
const candidateId = '00000000-0000-4000-8000-000000000903';

const personRow = {
  id: '00000000-0000-4000-8000-000000000902',
  shelter_id: shelterId,
  name: 'Workflow person',
  phone: '+51 900 000 901',
  email: null,
  archived_at: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

const animalRow = {
  id: '00000000-0000-4000-8000-000000000901',
  shelter_id: shelterId,
  name: 'Workflow fixture',
  species: 'DOG',
  sex: 'FEMALE',
  size: 'MEDIUM',
  approximate_age_months: 24,
  notes: null,
  primary_photo_path: null,
  status: 'READY',
  archived_at: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

function candidateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: candidateId,
    shelter_id: shelterId,
    person_id: personRow.id,
    animal_id: animalRow.id,
    source: null,
    notes: null,
    status: 'NEEDS_EVALUATION',
    archived_at: null,
    created_at: '2026-08-02T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    person: personRow,
    animal: animalRow,
    ...overrides,
  };
}

describe('candidate-repository mapping', () => {
  it('maps an embedded relation returned as a single object', async () => {
    const { client } = createClient({
      tableResult: { data: candidateRow(), error: null },
    });

    const candidate = await getCandidate(client, shelterId, candidateId);

    expect(candidate).not.toBeNull();
    expect(candidate?.person.name).toBe('Workflow person');
    expect(candidate?.animal.name).toBe('Workflow fixture');
    expect(candidate?.source).toBeNull();
  });

  it('maps an embedded relation returned as a one-element array', async () => {
    const { client } = createClient({
      tableResult: {
        data: candidateRow({ person: [personRow], animal: [animalRow] }),
        error: null,
      },
    });

    const candidate = await getCandidate(client, shelterId, candidateId);

    expect(candidate?.person.id).toBe(personRow.id);
    expect(candidate?.animal.id).toBe(animalRow.id);
  });

  it('drops rows whose relation is hidden by RLS instead of returning a partial candidate', async () => {
    const { client } = createClient({
      tableResult: {
        data: [candidateRow(), candidateRow({ id: 'x', person: null })],
        error: null,
      },
    });

    const candidates = await listCandidatesByAnimal(
      client,
      shelterId,
      animalRow.id,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe(candidateId);
  });

  it('returns null when the candidate is not visible', async () => {
    const { client } = createClient({
      tableResult: { data: null, error: null },
    });

    await expect(
      getCandidate(client, shelterId, candidateId),
    ).resolves.toBeNull();
  });

  it('throws the PostgREST error', async () => {
    const { client } = createClient({
      tableResult: { data: null, error: { message: 'boom' } },
    });

    await expect(getCandidate(client, shelterId, candidateId)).rejects.toEqual({
      message: 'boom',
    });
  });
});

describe('evaluation-repository', () => {
  it('maps a persisted evaluation row', async () => {
    const { client } = createClient({
      tableResult: {
        data: {
          id: 'eval-1',
          candidate_id: candidateId,
          overall_fit: 'STRONG',
          positive_factors: ['Prepared'],
          concerns: [],
          recommendation: 'CONTINUE',
          notes: 'Private note',
          created_at: '2026-09-01T00:00:00Z',
        },
        error: null,
      },
    });

    const evaluation = await getEvaluationForCandidate(
      client,
      shelterId,
      candidateId,
    );

    expect(evaluation).toEqual({
      id: 'eval-1',
      candidateId,
      overallFit: 'STRONG',
      positiveFactors: ['Prepared'],
      concerns: [],
      recommendation: 'CONTINUE',
      notes: 'Private note',
      createdAt: '2026-09-01T00:00:00Z',
    });
  });

  it('sends the RPC payload in snake_case and returns the new id', async () => {
    const { client, rpcMock } = createClient({
      rpc: { record_evaluation: { data: 'eval-2', error: null } },
    });

    const id = await recordEvaluation(client, {
      candidateId,
      overallFit: 'POSSIBLE',
      positiveFactors: ['Stable home'],
      concerns: ['Limited time'],
      recommendation: 'MORE_INFORMATION',
      notes: null,
    });

    expect(id).toBe('eval-2');
    expect(rpcMock).toHaveBeenCalledWith('record_evaluation', {
      p_candidate_id: candidateId,
      p_overall_fit: 'POSSIBLE',
      p_positive_factors: ['Stable home'],
      p_concerns: ['Limited time'],
      p_recommendation: 'MORE_INFORMATION',
      p_notes: null,
    });
  });

  it('rejects when the RPC returns no id', async () => {
    const { client } = createClient({
      rpc: { record_evaluation: { data: null, error: null } },
    });

    await expect(
      recordEvaluation(client, {
        candidateId,
        overallFit: 'STRONG',
        positiveFactors: ['x'],
        concerns: [],
        recommendation: 'CONTINUE',
        notes: null,
      }),
    ).rejects.toThrow('supabase_rpc_result_missing');
  });
});

describe('meeting-repository', () => {
  it('maps meeting rows for a candidate', async () => {
    const { client } = createClient({
      tableResult: {
        data: [
          {
            id: 'meeting-1',
            candidate_id: candidateId,
            type: 'MEET_AND_GREET',
            scheduled_at: '2026-09-10T12:00:00Z',
            status: 'SCHEDULED',
            result: null,
            notes: 'Private note',
          },
        ],
        error: null,
      },
    });

    const meetings = await listMeetingsForCandidate(
      client,
      shelterId,
      candidateId,
    );

    expect(meetings).toEqual([
      {
        id: 'meeting-1',
        candidateId,
        type: 'MEET_AND_GREET',
        scheduledAt: '2026-09-10T12:00:00Z',
        status: 'SCHEDULED',
        result: null,
        notes: 'Private note',
      },
    ]);
  });

  it('maps schedule_meeting arguments to snake_case', async () => {
    const { client, rpcMock } = createClient({
      rpc: { schedule_meeting: { data: 'meeting-2', error: null } },
    });

    const id = await scheduleMeeting(client, {
      candidateId,
      animalId: animalRow.id,
      type: 'HOME_VISIT',
      scheduledAt: '2026-09-12T12:00:00.000Z',
      notes: null,
    });

    expect(id).toBe('meeting-2');
    expect(rpcMock).toHaveBeenCalledWith('schedule_meeting', {
      p_candidate_id: candidateId,
      p_type: 'HOME_VISIT',
      p_scheduled_at: '2026-09-12T12:00:00.000Z',
      p_notes: null,
    });
  });

  it('maps complete_meeting arguments to snake_case', async () => {
    const { client, rpcMock } = createClient({
      rpc: { complete_meeting: { data: 'meeting-2', error: null } },
    });

    await completeMeeting(client, {
      meetingId: 'meeting-2',
      candidateId,
      animalId: animalRow.id,
      result: 'GOOD',
      notes: 'Went well',
    });

    expect(rpcMock).toHaveBeenCalledWith('complete_meeting', {
      p_meeting_id: 'meeting-2',
      p_result: 'GOOD',
      p_notes: 'Went well',
    });
  });
});
