import { NextResponse } from 'next/server';
import { saveSubmission, storageMode } from '../../../lib/submissions-repository.js';
import { validateSubmission } from '../../../lib/submission-validation.js';

export const dynamic = 'force-dynamic';

const requestWindows = new Map();
let rateLimitChecks = 0;

function isRateLimited(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = forwarded || 'local';
  const now = Date.now();
  const previous = requestWindows.get(key) || [];
  const active = previous.filter((timestamp) => now - timestamp < 60_000);
  active.push(now);
  requestWindows.set(key, active);
  rateLimitChecks += 1;
  if (rateLimitChecks % 500 === 0) {
    for (const [entryKey, timestamps] of requestWindows) {
      if (!timestamps.some((timestamp) => now - timestamp < 60_000)) requestWindows.delete(entryKey);
    }
  }
  return active.length > 45;
}

function hasValidOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json(
    { storage: storageMode() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: 'Origen de solicitud no permitido.' }, { status: 403 });
  }
  if (isRateLimited(request)) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }

  if (Number(request.headers.get('content-length') || 0) > 20_000) {
    return NextResponse.json({ error: 'El contenido enviado es demasiado grande.' }, { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'No pudimos leer la información enviada.' }, { status: 400 });
  }

  const result = validateSubmission(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const saved = await saveSubmission(result.submission);
    return NextResponse.json({ ok: true, storage: saved.mode });
  } catch {
    return NextResponse.json(
      { error: 'No pudimos guardar tu avance. Tus respuestas siguen en este dispositivo.' },
      { status: 503 },
    );
  }
}
