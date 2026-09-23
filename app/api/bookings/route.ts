import { NextResponse, type NextRequest } from 'next/server';
import { createBooking, getBookings } from '@/lib/booking';
import { looksLikeBot, parseBookingPayload } from '@/lib/validation';
import { hitLimit } from '@/lib/rate-limit';
import { isAdmin, ipHash } from '@/lib/auth';
import { isStorageWritable, isTemporaryStorage } from '@/lib/storage';
import { maskPhoneForLog } from '@/lib/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IP_LIMIT = 5;
const IP_WINDOW_MS = 60 * 60 * 1000; // 5 заявок в час с одного адреса

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || '0.0.0.0';
}

/**
 * POST /api/bookings — создать заявку.
 * Порядок: валидация → антиспам → лимит → сохранение → уведомление.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Некорректный запрос' }, { status: 400 });
  }

  const parsed = parseBookingPayload(raw);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, message: 'Проверьте поля формы', errors: parsed.errors }, { status: 422 });
  }

  const elapsed = typeof (raw as { elapsedMs?: unknown }).elapsedMs === 'number'
    ? ((raw as { elapsedMs: number }).elapsedMs)
    : undefined;

  if (looksLikeBot(parsed.data, elapsed)) {
    // Не подсказываем боту, что именно его выдало.
    return NextResponse.json({ ok: false, message: 'Не удалось отправить заявку. Позвоните нам, пожалуйста.' }, { status: 422 });
  }

  // На serverless-хостинге без подключённой базы запись невозможна:
  // честно говорим об этом, а не отдаём непонятную ошибку 500.
  if (!(await isStorageWritable())) {
    console.error('[заявка] хранилище недоступно, заявка не сохранена');
    return NextResponse.json(
      {
        ok: false,
        message: `Не удалось сохранить заявку на сервере. Позвоните нам, пожалуйста: примем запись по телефону.`,
      },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  const limit = hitLimit(`booking:${ipHash(ip)}`, IP_LIMIT, IP_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Слишком много заявок с этого устройства. Позвоните нам — примем запись по телефону.',
        retryAfterSec: limit.retryAfterSec,
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const result = await createBooking(parsed.data, { source: 'site' });

  if (!result.ok) {
    if (result.reason === 'storage') {
      return NextResponse.json(
        { ok: false, message: 'Не удалось сохранить заявку на сервере. Позвоните нам, пожалуйста.' },
        { status: 503 },
      );
    }

    const message =
      result.reason === 'taken'
        ? 'Это время только что заняли — выберите другое.'
        : result.reason === 'past'
          ? 'Это время уже прошло — выберите другое.'
          : 'Это время недоступно — выберите другое.';
    return NextResponse.json({ ok: false, message, reason: result.reason }, { status: 409 });
  }

  console.info('[заявка] создана', {
    number: result.booking.number,
    date: result.booking.date,
    time: result.booking.time,
    phone: maskPhoneForLog(result.booking.phone),
  });

  return NextResponse.json(
    {
      ok: true,
      // На хостинге без базы заявка живёт только во временном хранилище —
      // говорим об этом прямо, чтобы владелец не потерял реальные обращения.
      demo: await isTemporaryStorage(),
      booking: {
        id: result.booking.id,
        number: result.booking.number,
        name: result.booking.name,
        date: result.booking.date,
        time: result.booking.time,
        serviceTitle: result.booking.serviceTitle,
        car: `${result.booking.carBrand} ${result.booking.carModel}`.trim(),
      },
    },
    { status: 201 },
  );
}

/** GET /api/bookings — список для панели (только для авторизованных). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, message: 'Требуется вход' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const status = (params.get('status') ?? 'ALL') as never;
  const date = params.get('date') ?? undefined;
  const search = params.get('search') ?? undefined;

  const bookings = await getBookings({ status, date, search });
  return NextResponse.json({ ok: true, bookings }, { headers: { 'Cache-Control': 'no-store' } });
}
