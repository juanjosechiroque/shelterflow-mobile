import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/database.types';
import type { MeetingResult, MeetingStatus, MeetingType } from './types';

export interface PersistedMeeting {
  id: string;
  candidateId: string;
  type: MeetingType;
  scheduledAt: string;
  status: MeetingStatus;
  result: MeetingResult | null;
  notes: string | null;
}

export interface ScheduleMeetingInput {
  candidateId: string;
  animalId: string;
  type: MeetingType;
  scheduledAt: string;
  notes: string | null;
}

export interface CompleteMeetingInput {
  meetingId: string;
  candidateId: string;
  animalId: string;
  result: MeetingResult;
  notes: string | null;
}

interface MeetingRow {
  id: string;
  candidate_id: string;
  type: MeetingType;
  scheduled_at: string;
  status: MeetingStatus;
  result: MeetingResult | null;
  notes: string | null;
}

function toPersistedMeeting(row: MeetingRow): PersistedMeeting {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    type: row.type,
    scheduledAt: row.scheduled_at,
    status: row.status,
    result: row.result,
    notes: row.notes,
  };
}

export async function listMeetingsForCandidate(
  client: SupabaseClient<Database>,
  shelterId: string,
  candidateId: string,
): Promise<PersistedMeeting[]> {
  const { data, error } = await client
    .from('meetings')
    .select('id, candidate_id, type, scheduled_at, status, result, notes')
    .eq('shelter_id', shelterId)
    .eq('candidate_id', candidateId)
    .order('scheduled_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as MeetingRow[]).map(toPersistedMeeting);
}

export async function scheduleMeeting(
  client: SupabaseClient<Database>,
  input: ScheduleMeetingInput,
): Promise<string> {
  const { data, error } = await client.rpc('schedule_meeting', {
    p_candidate_id: input.candidateId,
    p_type: input.type,
    p_scheduled_at: input.scheduledAt,
    // See recordEvaluation in evaluation-repository.ts: the generated type
    // omits `| null` for this text param, but the function accepts null.
    p_notes: input.notes as string,
  });

  if (error) throw error;
  if (data === null) throw new Error('supabase_rpc_result_missing');
  return data;
}

export async function completeMeeting(
  client: SupabaseClient<Database>,
  input: CompleteMeetingInput,
): Promise<string> {
  const { data, error } = await client.rpc('complete_meeting', {
    p_meeting_id: input.meetingId,
    p_result: input.result,
    p_notes: input.notes as string,
  });

  if (error) throw error;
  if (data === null) throw new Error('supabase_rpc_result_missing');
  return data;
}
