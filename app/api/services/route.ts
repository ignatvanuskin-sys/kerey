import { NextResponse } from 'next/server';
import { listServices } from '@/db/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/services — active services for the landing page and the booking wizard. */
export async function GET(): Promise<NextResponse> {
  const services = listServices(false).map((service) => ({
    id: service.id,
    slug: service.slug,
    title: service.title,
    shortDescription: service.short_description,
    description: service.description,
    icon: service.icon,
    priceFrom: service.price_from,
    priceNote: service.price_note,
    durationMin: service.duration_min,
    isFeatured: Boolean(service.is_featured),
  }));

  return NextResponse.json({ ok: true, services }, { headers: { 'Cache-Control': 'no-store' } });
}
