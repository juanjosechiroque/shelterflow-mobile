#!/usr/bin/env node
/**
 * Phase 5 RLS and authentication integration test.
 *
 * Exercises the local Supabase Auth flow and the public-data Row Level
 * Security policies with the real publishable key. The script is meant to
 * run after `npm run supabase:reset` and while the local stack is healthy.
 *
 * Usage:
 *   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
 *     EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<from supabase status> \
 *     node scripts/supabase-rls-test.mjs
 *
 * Failure exits with a non-zero status so it can run from CI.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!key) {
  // eslint-disable-next-line no-console
  console.error(
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required. ' +
      'Run `supabase status` to obtain the local publishable key.',
  );
  process.exit(2);
}

const ADMIN_EMAIL = 'admin@shelter.com';
const ADMIN_PASSWORD = 'shelter2026';
const ISOLATION_EMAIL = 'rls-fixture@example.com';
const ISOLATION_PASSWORD = 'rls-fixture-2026';
const INVALID_PASSWORD = 'wrong-password';

const PRIMARY_SHELTER_ID = '00000000-0000-4000-8000-000000000001';
const SECONDARY_SHELTER_ID = '00000000-0000-4000-8000-000000000002';
const NALA_DECISION_CANDIDATE_ID = '00000000-0000-4000-8000-000000000055';

const failures = [];
function expect(label, condition) {
  if (!condition) {
    failures.push(label);
    // eslint-disable-next-line no-console
    console.error(`  ✕ ${label}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${label}`);
  }
}

async function signInAs(email, password) {
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    throw new Error(
      `sign-in for ${email} failed: ${error?.message ?? 'no session'}`,
    );
  }
  return createClient(url, key, {
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function anonymousClient() {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function expectError(label, promise) {
  try {
    const result = await promise;
    if (!result.error) {
      expect(label, false);
    } else {
      // eslint-disable-next-line no-console
      console.log(`  ✓ ${label} (${result.error.code ?? 'rejected'})`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${label} (threw: ${error?.message ?? 'unknown'})`);
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`Connecting to ${url} with the local publishable key.`);

  // 1. Primary administrator signs in successfully.
  let adminClient;
  try {
    adminClient = await signInAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect('primary administrator signs in with email and password', true);
  } catch (error) {
    expect(`primary administrator signs in (${error.message})`, false);
    return;
  }

  // 2. Invalid credentials fail safely.
  await expectError(
    'invalid login credentials fail with a normalised error',
    (async () => {
      const anon = await anonymousClient();
      return anon.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: INVALID_PASSWORD,
      });
    })(),
  );

  // 3. Authenticated user sees only their own profile.
  {
    const { data, error } = await adminClient
      .from('profiles')
      .select('id, display_name, shelter_id');
    expect('authenticated user reads own profile without error', !error);
    expect(
      'authenticated user sees exactly one profile row',
      data?.length === 1,
    );
    expect(
      'authenticated user sees the administrator profile',
      data?.[0]?.id === '00000000-0000-4000-8000-000000000103',
    );
  }

  // 4. Authenticated user sees only their own shelter.
  {
    const { data, error } = await adminClient
      .from('shelters')
      .select('id, name, country');
    expect('authenticated user reads shelters without error', !error);
    expect(
      'authenticated user sees only their own shelter',
      data?.length === 1 && data[0]?.id === PRIMARY_SHELTER_ID,
    );
  }

  // 5. Authenticated user cannot read Shelter B's identity through Supabase.
  {
    const { data: shelter, error: shelterError } = await adminClient
      .from('shelters')
      .select('id, name')
      .eq('id', SECONDARY_SHELTER_ID);
    expect(
      'administrator cannot read Shelter B fixture',
      !shelterError && shelter?.length === 0,
    );
  }

  // 6. Authenticated user cannot read Shelter B's animals.
  {
    const { data: animals, error: animalError } = await adminClient
      .from('animals')
      .select('id, name')
      .eq('shelter_id', SECONDARY_SHELTER_ID);
    expect(
      'administrator cannot read Shelter B animals',
      !animalError && animals?.length === 0,
    );
  }

  // 7. RLS fixture signs in and only sees Shelter B.
  let isolationClient;
  try {
    isolationClient = await signInAs(ISOLATION_EMAIL, ISOLATION_PASSWORD);
    expect('RLS isolation user signs in with email and password', true);
  } catch (error) {
    expect(`RLS isolation user signs in (${error.message})`, false);
    return;
  }
  {
    const { data, error } = await isolationClient
      .from('shelters')
      .select('id, name');
    expect('RLS user reads shelters without error', !error);
    expect(
      'RLS user only sees their own shelter',
      data?.length === 1 && data[0]?.id === SECONDARY_SHELTER_ID,
    );
  }

  // 8. RLS fixture cannot read Shelter A's animals.
  {
    const { data, error } = await isolationClient
      .from('animals')
      .select('id, name')
      .eq('shelter_id', PRIMARY_SHELTER_ID);
    expect(
      'RLS user cannot read Shelter A animals',
      !error && data?.length === 0,
    );
  }

  // 9. A candidate detail query must not disclose a real decision from a
  // different shelter, including its embedded person and animal details.
  {
    const { data, error } = await isolationClient
      .from('candidates')
      .select('id, people ( name ), animals ( id, name, status )')
      .eq('id', NALA_DECISION_CANDIDATE_ID);
    expect(
      'RLS user cannot read the primary shelter adoption-decision detail',
      !error && data?.length === 0,
    );
  }

  // 10. Authenticated direct INSERT/UPDATE/DELETE are denied.
  await expectError(
    'authenticated INSERT into animals is denied',
    (async () =>
      adminClient
        .from('animals')
        .insert({
          shelter_id: PRIMARY_SHELTER_ID,
          name: 'X',
          species: 'DOG',
          sex: 'MALE',
          size: 'SMALL',
        })
        .select())(),
  );
  await expectError(
    'authenticated UPDATE on animals is denied',
    (async () =>
      adminClient
        .from('animals')
        .update({ notes: 'hacked' })
        .eq('id', '00000000-0000-4000-8000-000000000011')
        .select())(),
  );
  await expectError(
    'authenticated DELETE on animals is denied',
    (async () =>
      adminClient
        .from('animals')
        .delete()
        .eq('id', '00000000-0000-4000-8000-000000000011')
        .select())(),
  );

  // 10. Anonymous reads are denied.
  const anon = await anonymousClient();
  await expectError(
    'anonymous SELECT from animals is denied',
    anon.from('animals').select('id').limit(1),
  );
  await expectError(
    'anonymous SELECT from profiles is denied',
    anon.from('profiles').select('id').limit(1),
  );

  if (failures.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `\n${failures.length} integration assertion(s) failed:\n` +
        failures.map((label) => `  - ${label}`).join('\n'),
    );
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.log('\nAll real Auth/RLS integration assertions passed.');
  }
}

await main();
