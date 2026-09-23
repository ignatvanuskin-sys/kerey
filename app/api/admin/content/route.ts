import type { NextRequest } from 'next/server';
import {
  createPhoto,
  createReview,
  deletePhoto,
  deleteReview,
  listPhotos,
  listReviews,
  updatePhoto,
  updateReview,
} from '@/db/repo';
import { isAdminRequest } from '@/lib/auth';
import { isSameOrigin, jsonError, jsonOk, noStore } from '@/lib/http';
import { audit } from '@/lib/settings-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function guard(request: NextRequest): Promise<Response | null> {
  if (!(await isAdminRequest())) return jsonError(401, 'Требуется вход.');
  if (!isSameOrigin(request)) return jsonError(403, 'Запрос отклонён.');
  return null;
}

/**
 * GET /api/admin/content — reviews and photos (§8.4).
 * Both lists start empty: the owner adds REAL reviews and photos, nothing is invented (§12).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;
  return noStore({ reviews: listReviews(false), photos: listPhotos(false) });
}

/** POST /api/admin/content — create a review or a photo. */
export async function POST(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(422, 'Некорректный запрос.');
  }

  const entity = String(body.entity ?? '');

  if (entity === 'review') {
    const author = String(body.author ?? '').trim();
    const text = String(body.text ?? '').trim();
    if (author.length < 2 || text.length < 5) return jsonError(422, 'Укажите имя и текст отзыва.');
    const review = createReview({
      author: author.slice(0, 80),
      text: text.slice(0, 2000),
      rating: body.rating === null || body.rating === undefined ? null : Number(body.rating),
      review_date: typeof body.reviewDate === 'string' ? body.reviewDate : null,
      is_published: body.isPublished !== false,
    });
    audit('review_created', 'admin');
    return jsonOk({ review });
  }

  if (entity === 'photo') {
    const url = String(body.url ?? '').trim();
    if (!/^(\/|https?:\/\/)/.test(url)) return jsonError(422, 'Укажите ссылку на фото (/images/… или https://…).');
    const photo = createPhoto({
      url: url.slice(0, 500),
      alt: typeof body.alt === 'string' ? body.alt.slice(0, 200) : '',
      sort_order: Number(body.sortOrder ?? 0) || 0,
    });
    audit('photo_created', 'admin');
    return jsonOk({ photo });
  }

  return jsonError(422, 'Неизвестный тип контента.');
}

/** PATCH /api/admin/content — update a review or a photo (publish / hide / edit). */
export async function PATCH(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(422, 'Некорректный запрос.');
  }

  const entity = String(body.entity ?? '');
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(422, 'Не найден идентификатор.');

  if (entity === 'review') {
    updateReview(id, {
      author: typeof body.author === 'string' ? body.author.slice(0, 80) : undefined,
      text: typeof body.text === 'string' ? body.text.slice(0, 2000) : undefined,
      rating: body.rating === undefined ? undefined : body.rating === null ? null : Number(body.rating),
      is_published: typeof body.isPublished === 'boolean' ? body.isPublished : undefined,
      sort_order: body.sortOrder === undefined ? undefined : Number(body.sortOrder),
    });
  } else if (entity === 'photo') {
    updatePhoto(id, {
      url: typeof body.url === 'string' ? body.url.slice(0, 500) : undefined,
      alt: typeof body.alt === 'string' ? body.alt.slice(0, 200) : undefined,
      is_published: typeof body.isPublished === 'boolean' ? body.isPublished : undefined,
      sort_order: body.sortOrder === undefined ? undefined : Number(body.sortOrder),
    });
  } else {
    return jsonError(422, 'Неизвестный тип контента.');
  }

  return jsonOk({ reviews: listReviews(false), photos: listPhotos(false) });
}

/** DELETE /api/admin/content?entity=review&id=5 */
export async function DELETE(request: NextRequest): Promise<Response> {
  const blocked = await guard(request);
  if (blocked) return blocked;

  const params = new URL(request.url).searchParams;
  const id = Number(params.get('id'));
  const entity = params.get('entity');
  if (!Number.isInteger(id) || id <= 0) return jsonError(422, 'Не найден идентификатор.');

  if (entity === 'review') deleteReview(id);
  else if (entity === 'photo') deletePhoto(id);
  else return jsonError(422, 'Неизвестный тип контента.');

  return jsonOk({ reviews: listReviews(false), photos: listPhotos(false) });
}
