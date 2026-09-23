/**
 * Server-side validation (§10). Zod parses the payload; the messages shown to the user
 * are mapped to Russian here so the schema stays declarative.
 */
import { z } from 'zod';
import { normalizePhone } from '@/lib/phone';

export const MAX_COMMENT = 500;

export const bookingInputSchema = z.object({
  serviceId: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  carBrand: z.string().trim().min(1).max(40),
  carModel: z.string().trim().min(1).max(60),
  carYear: z.string().trim().max(9).nullable().optional(),
  carPlate: z.string().trim().max(16).nullable().optional(),
  clientName: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(5).max(25),
  contactMethod: z.enum(['call', 'whatsapp', 'telegram']),
  comment: z.string().trim().max(MAX_COMMENT).nullable().optional(),
  consent: z.literal(true),
  utmSource: z.string().trim().max(64).nullable().optional(),
  utmMedium: z.string().trim().max(64).nullable().optional(),
  utmCampaign: z.string().trim().max(64).nullable().optional(),
  honeypot: z.string().max(0).nullable().optional(),
  formElapsedMs: z.number().int().min(0).max(86_400_000).nullable().optional(),
  turnstileToken: z.string().max(4096).nullable().optional(),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

const RU_MESSAGES: Record<string, string> = {
  serviceId: 'Выберите услугу.',
  date: 'Выберите дату.',
  time: 'Выберите время.',
  carBrand: 'Укажите марку автомобиля.',
  carModel: 'Укажите модель автомобиля.',
  carYear: 'Год указан неверно.',
  carPlate: 'Гос. номер слишком длинный.',
  clientName: 'Укажите имя (минимум 2 символа).',
  phone: 'Укажите телефон в формате +7 XXX XXX XX XX.',
  contactMethod: 'Выберите способ связи.',
  comment: `Комментарий не длиннее ${MAX_COMMENT} символов.`,
  consent: 'Нужно согласие на обработку персональных данных.',
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

export function parseBookingInput(payload: unknown): ValidationResult<BookingInput> {
  const parsed = bookingInputSchema.safeParse(payload);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '_');
      errors[field] = RU_MESSAGES[field] ?? 'Проверьте значение поля.';
    }
    return { ok: false, errors };
  }
  return { ok: true, data: parsed.data };
}

/** Admin forms are trusted more, but still validated (lengths, enums, numbers). */
export const serviceInputSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'slug: только латиница, цифры и дефис'),
  title: z.string().trim().min(2).max(120),
  short_description: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  icon: z.string().trim().max(40).optional(),
  price_from: z.number().int().min(0).max(100_000_000).nullable().optional(),
  price_note: z.string().trim().max(120).nullable().optional(),
  duration_min: z.number().int().min(15).max(600).optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(100_000).optional(),
});

export const settingsPatchSchema = z.object({
  schedule: z
    .record(
      z.string(),
      z.object({ open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/) }).nullable(),
    )
    .optional(),
  posts_count: z.number().int().min(1).max(20).optional(),
  slot_step_min: z.number().int().min(5).max(240).optional(),
  buffer_min: z.number().int().min(0).max(240).optional(),
  min_lead_min: z.number().int().min(0).max(10_080).optional(),
  horizon_days: z.number().int().min(1).max(90).optional(),
  telegram_callbacks_enabled: z.boolean().optional(),
  retention_days: z.number().int().min(30).max(3650).optional(),
  contacts: z
    .object({
      phone_display: z.string().trim().max(32).optional(),
      phone_e164: z.string().trim().max(20).optional(),
      whatsapp: z.array(z.object({ display: z.string().trim().max(32), wa: z.string().trim().max(20) })).max(4).optional(),
      address: z.string().trim().max(200).optional(),
      instagram: z.string().trim().max(200).optional(),
    })
    .nullable()
    .optional(),
  texts: z
    .object({
      warranty: z.string().trim().max(600).nullable(),
      experience: z.string().trim().max(600).nullable(),
      equipment: z.string().trim().max(600).nullable(),
    })
    .optional(),
});

export const dayOffSchema = z.object({
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  open_from: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  open_to: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  reason: z.string().trim().max(120).optional(),
});

export const manualBookingSchema = z.object({
  serviceId: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  carBrand: z.string().trim().min(1).max(40),
  carModel: z.string().trim().min(1).max(60),
  carYear: z.string().trim().max(9).nullable().optional(),
  carPlate: z.string().trim().max(16).nullable().optional(),
  clientName: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(5).max(25),
  contactMethod: z.enum(['call', 'whatsapp', 'telegram']).optional(),
  comment: z.string().trim().max(MAX_COMMENT).nullable().optional(),
});

export function normalizedPhoneOrNull(raw: string): string | null {
  return normalizePhone(raw);
}

/** Honeypot / minimum-fill-time anti-spam (§10). */
export function looksLikeSpam(input: { honeypot?: string | null; formElapsedMs?: number | null }): boolean {
  if (input.honeypot && input.honeypot.trim().length > 0) return true;
  if (typeof input.formElapsedMs === 'number' && input.formElapsedMs < 3000) return true;
  return false;
}

/** Cloudflare Turnstile, enabled only when the keys are configured. */
export async function verifyTurnstile(token: string | null | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      cache: 'no-store',
    });
    const json = (await response.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
