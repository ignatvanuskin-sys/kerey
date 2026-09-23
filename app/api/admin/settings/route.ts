import type { NextRequest } from 'next/server';
import { deleteDayOff, getSettings, listDaysOff, saveDayOff, updateSettings, audit } from '@/lib/settings-store';
import { isAdminRequest } from '@/lib/auth';
import { isSameOrigin, jsonError, jsonOk, noStore } from '@/lib/http';
import { dayOffSchema, settingsPatchSchema } from '@/lib/validation';
import { localDate } from '@/lib/tz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function guard(request: NextRequest): Promise<Response | null> {
  if (!(await isAdminRequest())) return jsonError(401, 'Требуется вход.');
  if (!isSameOrigin(request)) return jsonError(403, 'Запрос отклонён.');
  return null;
}

/** GET /api/admin/settings — schedule, capacity, horizon and the calendar exceptions. */
export async function GET(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;
  return noStore({ settings: getSettings(), daysOff: listDaysOff(), today: localDate() });
}

/** PATCH /api/admin/settings — partial update of the settings object. */
export async function PATCH(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, 'Некорректный запрос.');
  }

  const parsed = settingsPatchSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, 'Проверьте значения.', { fields: parsed.error.issues });

  const settings = updateSettings(parsed.data);
  audit('settings_updated', 'admin', undefined, JSON.stringify(Object.keys(parsed.data)));
  return jsonOk({ settings });
}

/** POST /api/admin/settings — add or update a day off / reduced day. */
export async function POST(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, 'Некорректный запрос.');
  }

  const parsed = dayOffSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, 'Проверьте дату и время.', { fields: parsed.error.issues });

  const row = saveDayOff(parsed.data);
  audit('day_off_saved', 'admin', undefined, parsed.data.local_date);
  return jsonOk({ dayOff: row, daysOff: listDaysOff() });
}

/** DELETE /api/admin/settings?date=YYYY-MM-DD */
export async function DELETE(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  const date = new URL(request.url).searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError(422, 'Некорректная дата.');
  deleteDayOff(date);
  audit('day_off_deleted', 'admin', undefined, date);
  return jsonOk({ daysOff: listDaysOff() });
}
