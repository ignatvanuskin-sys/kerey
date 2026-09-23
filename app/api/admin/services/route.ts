import type { NextRequest } from 'next/server';
import { createService, deleteService, getService, listServices, reorderServices, updateService } from '@/db/repo';
import { isAdminRequest } from '@/lib/auth';
import { isSameOrigin, jsonError, jsonOk, noStore } from '@/lib/http';
import { serviceInputSchema } from '@/lib/validation';
import { audit } from '@/lib/settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function guard(request: NextRequest): Promise<Response | null> {
  if (!(await isAdminRequest())) return jsonError(401, 'Требуется вход.');
  if (!isSameOrigin(request)) return jsonError(403, 'Запрос отклонён.');
  return null;
}

/** GET /api/admin/services — every service, including the inactive ones. */
export async function GET(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;
  return noStore({ services: listServices(true) });
}

/** POST /api/admin/services — create or reorder. */
export async function POST(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(422, 'Некорректный запрос.');
  }

  if (body.action === 'reorder' && Array.isArray(body.ids)) {
    const ids = body.ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length === 0) return jsonError(422, 'Пустой список порядка.');
    audit('services_reordered', 'admin');
    return jsonOk({ services: reorderServices(ids) });
  }

  const parsed = serviceInputSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, 'Проверьте поля услуги.', { fields: parsed.error.issues });

  const existing = listServices(true).find((s) => s.slug === parsed.data.slug);
  if (existing) return jsonError(409, 'Услуга с таким slug уже есть.');

  const service = createService(parsed.data);
  audit('service_created', 'admin', undefined, service.slug);
  return jsonOk({ service });
}

/** PATCH /api/admin/services — update one service. */
export async function PATCH(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(422, 'Некорректный запрос.');
  }

  const parsed = serviceInputSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) {
    return jsonError(422, 'Проверьте поля услуги.', { fields: parsed.success ? [] : parsed.error.issues });
  }
  if (!getService(parsed.data.id)) return jsonError(404, 'Услуга не найдена.');

  const updated = updateService(parsed.data.id, parsed.data);
  audit('service_updated', 'admin', undefined, String(parsed.data.id));
  return jsonOk({ service: updated });
}

/** DELETE /api/admin/services?id=3 */
export async function DELETE(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return jsonError(422, 'Не найден идентификатор услуги.');
  deleteService(id);
  audit('service_deleted', 'admin', undefined, String(id));
  return jsonOk({ deleted: true });
}
