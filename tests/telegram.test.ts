import { describe, expect, it } from 'vitest';
import {
  bookingCreatedCard,
  humanDuration,
  ownerStatusHeader,
  parseCallbackData,
  statusKeyboard,
  waLinkToClient,
  whatsappConfirmText,
} from '@/lib/telegram';
import { escapeHtml } from '@/lib/utils';
import type { BookingRow } from '@/db/bookings';

const MALICIOUS_NAME = '<b>x</b> & <script>alert(1)</script>';

function booking(overrides: Partial<BookingRow> = {}): BookingRow {
  return {
    id: 42,
    token: '11111111-2222-3333-4444-555555555555',
    status: 'new',
    service_id: 1,
    service_title: 'Компьютерная диагностика',
    duration_min: 60,
    car_brand: 'Toyota',
    car_model: 'Camry',
    car_year: '2012',
    car_plate: '123ABC02',
    client_name: 'Асхат',
    client_phone: '+77011234567',
    contact_method: 'whatsapp',
    comment: 'стук спереди справа',
    start_at: '2026-09-26T09:30:00.000Z',
    end_at: '2026-09-26T10:30:00.000Z',
    source: 'site',
    utm_source: '2gis',
    utm_medium: null,
    utm_campaign: null,
    idempotency_key: null,
    ip_hash: null,
    status_changed_by: null,
    status_changed_at: null,
    tg_chat_id: null,
    confirmed_at: null,
    created_at: '2026-09-21T07:05:00.000Z',
    updated_at: '2026-09-21T07:05:00.000Z',
    ...overrides,
  };
}

const OPTIONS = { callbacksEnabled: true, adminUrl: 'https://kerey.example' };

describe('escaping (QA 5)', () => {
  it('escapes HTML control characters', () => {
    expect(escapeHtml(MALICIOUS_NAME)).toBe(
      '&lt;b&gt;x&lt;/b&gt; &amp; &lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('never lets user input break the Telegram markup', () => {
    const { text } = bookingCreatedCard(
      booking({ client_name: MALICIOUS_NAME, comment: '<a href="x">тык</a>', car_model: '<i>Camry</i>' }),
      OPTIONS,
    );
    expect(text).not.toContain('<script>');
    expect(text).not.toContain('<a href');
    expect(text).not.toContain('<i>');
    expect(text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(text).toContain('&amp;');
  });

  it('keeps the booking number and formatted time in the card', () => {
    const { text } = bookingCreatedCard(booking(), OPTIONS);
    expect(text).toContain('Новая запись №0042');
    expect(text).toContain('14:30'); // 09:30 UTC = 14:30 в Кокшетау
    expect(text).toContain('≈ 1 ч');
    expect(text).toContain('+7 701 123 45 67');
  });

  it('keeps the comment within the Telegram limits', () => {
    const { text } = bookingCreatedCard(booking({ comment: 'а'.repeat(900) }), OPTIONS);
    expect(text.length).toBeLessThanOrEqual(4096);
    expect(text).toContain('…');
  });
});

describe('keyboard', () => {
  it('offers confirm and reject for a new booking', () => {
    const { keyboard } = bookingCreatedCard(booking(), OPTIONS);
    const flat = JSON.stringify(keyboard);
    expect(flat).toContain('bk:42:ok');
    expect(flat).toContain('bk:42:no');
    expect(flat).toContain('https://wa.me/77011234567');
    expect(flat).toContain('https://kerey.example/admin/bookings/42');
  });

  it('switches to result buttons after confirmation and drops actions for terminal states', () => {
    const confirmed = JSON.stringify(statusKeyboard(booking({ status: 'confirmed' }), OPTIONS));
    expect(confirmed).toContain('bk:42:done');
    expect(confirmed).toContain('bk:42:ns');
    expect(confirmed).toContain('bk:42:cancel');

    const done = JSON.stringify(statusKeyboard(booking({ status: 'done' }), OPTIONS));
    expect(done).not.toContain('bk:42:ok');
    expect(done).toContain('/admin/bookings/42');
  });

  it('uses URL buttons only when callbacks are disabled', () => {
    const { keyboard } = bookingCreatedCard(booking(), { ...OPTIONS, callbacksEnabled: false });
    const flat = JSON.stringify(keyboard);
    expect(flat).not.toContain('bk:42:ok');
    expect(flat).toContain('https://wa.me/77011234567');
  });

  it('keeps a button URL within the Telegram limit', () => {
    expect(waLinkToClient(booking(), whatsappConfirmText(booking())).length).toBeLessThan(4096);
  });
});

describe('callback payloads', () => {
  it('parses valid payloads', () => {
    expect(parseCallbackData('bk:42:ok')).toEqual({ bookingId: 42, action: 'ok' });
    expect(parseCallbackData('bk:7:cancel')).toEqual({ bookingId: 7, action: 'cancel' });
  });

  it('rejects anything else', () => {
    for (const data of ['', 'bk:42', 'bk:x:ok', 'bk:42:delete', 'evil:42:ok', 'bk:42:ok;drop table']) {
      expect(parseCallbackData(data), data).toBeNull();
    }
  });
});

describe('formatting helpers', () => {
  it('formats durations', () => {
    expect(humanDuration(30)).toBe('30 мин');
    expect(humanDuration(60)).toBe('1 ч');
    expect(humanDuration(90)).toBe('1 ч 30 мин');
  });

  it('builds the owner-facing WhatsApp text with the business address', () => {
    const text = whatsappConfirmText(booking());
    expect(text).toContain('Здравствуйте, Асхат!');
    expect(text).toContain('ул. Шокана Уалиханова, 94');
    expect(text).toContain('26 сентября');
    expect(text).toContain('14:30');
  });

  it('marks who changed the status', () => {
    const header = ownerStatusHeader(booking({ status: 'confirmed' }), '✅ <b>Подтверждена</b>', 'owner_tg', '2026-09-21T08:00:00.000Z');
    expect(header).toContain('№0042');
    expect(header).toContain('владелец');
    expect(header).toContain('21.09 13:00');
  });
});

describe('card length guard', () => {
  it('truncates a very long card instead of failing the API call', () => {
    const { text } = bookingCreatedCard(
      booking({ client_name: 'я'.repeat(500), comment: 'ю'.repeat(500) }),
      OPTIONS,
    );
    expect(text.length).toBeLessThanOrEqual(4096);
  });
});
