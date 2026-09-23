import type { NextRequest } from 'next/server';
import { listBookings } from '@/db/bookings';
import { isAdminRequest } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import { formatLocal } from '@/lib/tz';
import { statusLabelRu } from '@/lib/availability';
import { bookingNumber } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

/** GET /api/admin/bookings/csv — export for the owner's bookkeeping (§8.1). */
export async function GET(request: NextRequest): Promise<Response> {
  if (!(await isAdminRequest())) return jsonError(401, 'Требуется вход.');

  const params = new URL(request.url).searchParams;
  const bookings = listBookings({
    status: (params.get('status') as never) ?? 'all',
    dateFrom: params.get('from') ?? undefined,
    dateTo: params.get('to') ?? undefined,
    limit: 5000,
  }).sort((a, b) => a.start_at.localeCompare(b.start_at));

  const header = [
    '№',
    'Статус',
    'Услуга',
    'Марка',
    'Модель',
    'Год',
    'Гос.номер',
    'Имя',
    'Телефон',
    'Связь',
    'Комментарий',
    'Дата',
    'Время',
    'Источник',
    'Создана',
  ];

  const rows = bookings.map((b) => [
    bookingNumber(b.id),
    statusLabelRu(b.status),
    b.service_title,
    b.car_brand,
    b.car_model,
    b.car_year ?? '',
    b.car_plate ?? '',
    b.client_name,
    b.client_phone,
    b.contact_method,
    b.comment ?? '',
    formatLocal(b.start_at, 'dd.MM.yyyy'),
    formatLocal(b.start_at, 'HH:mm'),
    b.source === 'admin' ? 'админка' : 'сайт',
    formatLocal(b.created_at, 'dd.MM.yyyy HH:mm'),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  // BOM so that Excel opens Cyrillic correctly.
  const body = `\uFEFF${csv}`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kerey-bookings-${formatLocal(new Date(), 'yyyy-MM-dd')}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
