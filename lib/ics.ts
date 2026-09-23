/**
 * Minimal iCalendar (.ics) generator — runs in the browser on the success screen (§6.3).
 */

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function buildIcs(input: {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  now?: Date;
}): string {
  const stamp = toIcsUtc((input.now ?? new Date()).toISOString());
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kerey Autoservice//Booking//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}@kerey`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsUtc(input.startAt)}`,
    `DTEND:${toIcsUtc(input.endAt)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    ...(input.description ? [`DESCRIPTION:${escapeIcs(input.description)}`] : []),
    ...(input.location ? [`LOCATION:${escapeIcs(input.location)}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Запись в автосервис',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
