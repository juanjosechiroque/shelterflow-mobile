#!/usr/bin/env node
/**
 * Phase 8.1 Storage isolation integration test.
 *
 * Exercises the local Supabase Auth flow and the shelter-scoped Storage
 * policies with the real publishable key. The script proves that shelter A
 * cannot read, list, or write under shelter B's prefix, that shelter B is
 * symmetrically confined, and that anonymous clients have no access.
 *
 * Usage:
 *   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
 *     EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<from supabase status> \
 *     npm run supabase:test:storage
 *
 * Failure exits with a non-zero status so it can run from CI.
 */

import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!key) {
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

const PRIMARY_SHELTER_ID = '00000000-0000-4000-8000-000000000001';
const SECONDARY_SHELTER_ID = '00000000-0000-4000-8000-000000000002';

const failures = [];
function expect(label, condition) {
  if (!condition) {
    failures.push(label);
    console.error(`  ✕ ${label}`);
  } else {
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
      console.log(`  ✓ ${label} (${result.error.code ?? 'rejected'})`);
    }
  } catch (error) {
    console.log(`  ✓ ${label} (threw: ${error?.message ?? 'unknown'})`);
  }
}

async function expectEmptyOrError(label, promise) {
  try {
    const result = await promise;
    if (result.error) {
      console.log(`  ✓ ${label} (rejected: ${result.error.message})`);
    } else if (Array.isArray(result.data) && result.data.length === 0) {
      expect(label, true);
    } else {
      expect(label, false);
    }
  } catch (error) {
    console.log(`  ✓ ${label} (threw: ${error?.message ?? 'unknown'})`);
  }
}

function makeImageBlob() {
  // Minimal valid JPEG bytes (SOI + EOI). Enough for the MIME/size checks.
  return Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
}

function uploadPath(shelterId, fileName) {
  return `${shelterId}/animals/${randomUUID()}/${fileName}`;
}

async function upload(client, path) {
  return client.storage.from('shelter-media').upload(path, makeImageBlob(), {
    contentType: 'image/jpeg',
  });
}

// `.remove()` resolves to `{ data: [], error: null }` whether RLS blocked the
// delete or the key was simply absent, so it cannot prove a delete outcome on
// its own. Verify through the object instead: `download` succeeds only while the
// object still exists and the caller may read it.
async function objectExists(client, path) {
  const { error } = await client.storage.from('shelter-media').download(path);
  return !error;
}

async function main() {
  const uploadedPaths = [];

  console.log(`Connecting to ${url} with the local publishable key.`);

  // 1. Primary administrator signs in and uploads under their shelter.
  let adminClient;
  try {
    adminClient = await signInAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect('primary administrator signs in with email and password', true);
  } catch (error) {
    expect(`primary administrator signs in (${error.message})`, false);
    return;
  }

  const adminUploadPath = uploadPath(PRIMARY_SHELTER_ID, 'primary.jpg');
  const adminUpload = await upload(adminClient, adminUploadPath);
  expect(
    'administrator uploads an image under their own shelter prefix',
    !adminUpload.error,
  );
  if (!adminUpload.error) {
    uploadedPaths.push(adminUploadPath);
  }

  // 2. Same administrator cannot write under shelter B's prefix.
  const adminIntrusionPath = uploadPath(SECONDARY_SHELTER_ID, 'intrusion.jpg');
  await expectError(
    'administrator upload under shelter B prefix is denied',
    upload(adminClient, adminIntrusionPath),
  );

  // 3. Shelter B fixture signs in and only operates within shelter B.
  let isolationClient;
  try {
    isolationClient = await signInAs(ISOLATION_EMAIL, ISOLATION_PASSWORD);
    expect('RLS isolation user signs in with email and password', true);
  } catch (error) {
    expect(`RLS isolation user signs in (${error.message})`, false);
    return;
  }

  await expectEmptyOrError(
    'shelter B cannot list shelter A prefix',
    isolationClient.storage
      .from('shelter-media')
      .list(`${PRIMARY_SHELTER_ID}/animals/`),
  );

  const isolationDownload = await isolationClient.storage
    .from('shelter-media')
    .download(adminUploadPath);
  expect(
    'shelter B cannot download shelter A object',
    !!isolationDownload.error,
  );

  const isolationUploadPath = uploadPath(SECONDARY_SHELTER_ID, 'own.jpg');
  const isolationUpload = await upload(isolationClient, isolationUploadPath);
  expect(
    'shelter B uploads an image under its own shelter prefix',
    !isolationUpload.error,
  );
  if (!isolationUpload.error) {
    uploadedPaths.push(isolationUploadPath);
  }

  // 4. Shelter B cannot write under shelter A's prefix.
  const isolationIntrusionPath = uploadPath(
    PRIMARY_SHELTER_ID,
    'intrusion.jpg',
  );
  await expectError(
    'shelter B upload under shelter A prefix is denied',
    upload(isolationClient, isolationIntrusionPath),
  );

  // 5. Cross-shelter reads are denied in both directions.
  await expectEmptyOrError(
    'administrator cannot list shelter B prefix',
    adminClient.storage
      .from('shelter-media')
      .list(`${SECONDARY_SHELTER_ID}/animals/`),
  );

  const adminDownloadB = await adminClient.storage
    .from('shelter-media')
    .download(isolationUploadPath);
  expect(
    'administrator cannot download shelter B object',
    !!adminDownloadB.error,
  );

  // 6. Cross-shelter deletes change nothing; own deletes remove the object.
  //    Each delete outcome is checked by whether the object is still readable by
  //    its owner afterwards — a positive post-condition, not the `.remove()`
  //    result, which is `{ data: [], error: null }` in both the blocked and the
  //    already-absent case.
  await adminClient.storage.from('shelter-media').remove([isolationUploadPath]);
  expect(
    'shelter B object survives an administrator cross-shelter delete attempt',
    await objectExists(isolationClient, isolationUploadPath),
  );

  await isolationClient.storage.from('shelter-media').remove([adminUploadPath]);
  expect(
    'shelter A object survives a shelter B cross-shelter delete attempt',
    await objectExists(adminClient, adminUploadPath),
  );

  await adminClient.storage.from('shelter-media').remove([adminUploadPath]);
  expect(
    'administrator own object is gone after it deletes it',
    !(await objectExists(adminClient, adminUploadPath)),
  );

  await isolationClient.storage
    .from('shelter-media')
    .remove([isolationUploadPath]);
  expect(
    'shelter B own object is gone after it deletes it',
    !(await objectExists(isolationClient, isolationUploadPath)),
  );

  // 7. Anonymous clients have no access.
  const anon = await anonymousClient();
  await expectError(
    'anonymous upload is denied',
    upload(anon, uploadPath(PRIMARY_SHELTER_ID, 'anon.jpg')),
  );
  await expectEmptyOrError(
    'anonymous list is denied',
    anon.storage.from('shelter-media').list(`${PRIMARY_SHELTER_ID}/animals/`),
  );

  // 8. Best-effort cleanup of any objects that remain.
  if (uploadedPaths.length > 0) {
    console.log(`Cleaning up ${uploadedPaths.length} uploaded object(s).`);
    await adminClient.storage.from('shelter-media').remove(uploadedPaths);
    await isolationClient.storage.from('shelter-media').remove(uploadedPaths);
  }

  if (failures.length > 0) {
    console.error(
      `\n${failures.length} integration assertion(s) failed:\n` +
        failures.map((label) => `  - ${label}`).join('\n'),
    );
    process.exit(1);
  } else {
    console.log('\nAll real Auth/Storage integration assertions passed.');
  }
}

await main();
