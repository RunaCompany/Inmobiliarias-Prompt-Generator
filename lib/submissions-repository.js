import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const localStorePath = path.join(process.cwd(), 'data', 'submissions.json');
let localWriteQueue = Promise.resolve();

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const configured = Boolean(url && serviceRoleKey && !url.includes('YOUR_PROJECT') && !serviceRoleKey.includes('YOUR_'));
  return { url, serviceRoleKey, configured };
}

async function performLocalSave(submission) {
  let rows = [];
  try {
    rows = JSON.parse(await fs.readFile(localStorePath, 'utf8'));
    if (!Array.isArray(rows)) rows = [];
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const index = rows.findIndex(
    (row) => row.participant_id === submission.participant_id
      && row.session_slug === submission.session_slug
      && row.submission_id === submission.submission_id,
  );
  const previous = index >= 0 ? rows[index] : null;
  const next = previous
    ? {
      ...previous,
      ...submission,
      created_at: previous.created_at,
      completed_at: previous.completed_at || submission.completed_at,
    }
    : { ...submission, created_at: new Date().toISOString() };

  if (previous) {
    const withoutWriteMetadata = ({ updated_at, created_at, completed_at, ...rest }) => rest;
    const contentDidNotChange = JSON.stringify(withoutWriteMetadata(previous))
      === JSON.stringify(withoutWriteMetadata(next));
    if (contentDidNotChange) return { mode: 'local' };
  }

  if (index >= 0) rows[index] = next;
  else rows.push(next);

  await fs.mkdir(path.dirname(localStorePath), { recursive: true });
  const temporaryPath = `${localStorePath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(rows, null, 2));
  await fs.rename(temporaryPath, localStorePath);
  return { mode: 'local' };
}

function saveLocally(submission) {
  const save = localWriteQueue.then(() => performLocalSave(submission));
  localWriteQueue = save.catch(() => undefined);
  return save;
}

export function storageMode() {
  return supabaseConfig().configured ? 'supabase' : 'local';
}

export async function saveSubmission(submission) {
  const config = supabaseConfig();
  if (!config.configured) return saveLocally(submission);

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase
    .from('prompt_builder_submissions')
    .upsert(submission, { onConflict: 'session_slug,participant_id,submission_id' });

  if (error) throw new Error(`Supabase rechazó el guardado: ${error.message}`);
  return { mode: 'supabase' };
}
