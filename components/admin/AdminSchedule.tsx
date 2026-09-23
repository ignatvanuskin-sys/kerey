'use client';

import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Plus, Save, Trash } from 'lucide-react';
import { WEEKDAY_NAMES_RU, type DayWindow, type Schedule, type Settings } from '@/lib/settings';
import { AdminCard, AdminField, Notice, Skeleton } from '@/components/admin/ui';

type DayOff = { id: number; local_date: string; open_from: string | null; open_to: string | null; reason: string };

export default function AdminSchedule() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/settings', { cache: 'no-store' });
    const data = (await response.json()) as { settings?: Settings; daysOff?: DayOff[] };
    setSettings(data.settings ?? null);
    setDaysOff(data.daysOff ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchSettings(patch: Record<string, unknown>, text: string) {
    setBusy(true);
    setNotice(null);
    const response = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !data.ok) {
      setNotice({ kind: 'error', text: data.error ?? 'Не удалось сохранить.' });
      return;
    }
    setNotice({ kind: 'success', text });
    await load();
  }

  if (!settings) {
    return (
      <div className="grid gap-3">
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  const schedule = settings.schedule;

  function updateDay(key: string, value: DayWindow) {
    setSettings((current) => (current ? { ...current, schedule: { ...current.schedule, [key]: value } } : current));
  }

  const workingDays = Object.values(schedule).filter(Boolean).length;

  return (
    <div className="grid gap-4">
      {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}

      <AdminCard
        title="Часы работы"
        actions={
          <button
            type="button"
            className="btn btn-primary !min-h-[40px] !px-4 text-[14px]"
            disabled={busy}
            onClick={() => void patchSettings({ schedule: schedule as unknown as Schedule }, 'График сохранён.')}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
            Сохранить график
          </button>
        }
      >
        <div className="grid gap-3">
          {Object.keys(schedule)
            .sort()
            .map((key) => {
              const day = schedule[key];
              const dayKey = key as keyof typeof WEEKDAY_NAMES_RU;
              return (
                <div key={key} className="grid items-end gap-2 sm:grid-cols-[160px_140px_140px_1fr]">
                  <span className="text-[15px] font-semibold">{WEEKDAY_NAMES_RU[String(dayKey)] ?? key}</span>
                  <label className="flex min-h-[48px] items-center gap-2 text-[15px]">
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--color-accent)]"
                      checked={Boolean(day)}
                      onChange={(event) =>
                        updateDay(key, event.target.checked ? { open: '08:30', close: '21:00' } : null)
                      }
                    />
                    Работаем
                  </label>
                  {day ? (
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`open-${key}`}>
                        Открытие
                      </label>
                      <input
                        id={`open-${key}`}
                        type="time"
                        className="field !min-h-[44px]"
                        value={day.open}
                        onChange={(event) => updateDay(key, { ...day, open: event.target.value })}
                      />
                      <span aria-hidden="true">–</span>
                      <label className="sr-only" htmlFor={`close-${key}`}>
                        Закрытие
                      </label>
                      <input
                        id={`close-${key}`}
                        type="time"
                        className="field !min-h-[44px]"
                        value={day.close}
                        onChange={(event) => updateDay(key, { ...day, close: event.target.value })}
                      />
                    </div>
                  ) : (
                    <span className="hint">Выходной</span>
                  )}
                  <span />
                </div>
              );
            })}
        </div>
        <p className="hint mt-3">Рабочих дней в неделю: {workingDays}. Изменения применяются к новым записям сразу.</p>
      </AdminCard>

      <AdminCard title="Ёмкость и правила записи">
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminField label="Постов (машин одновременно)" htmlFor="posts">
            <input
              id="posts"
              className="field"
              inputMode="numeric"
              value={String(settings.posts_count)}
              onChange={(event) =>
                setSettings({ ...settings, posts_count: Number(event.target.value.replace(/\D/g, '')) || 1 })
              }
            />
          </AdminField>
          <AdminField label="Шаг слотов, мин" htmlFor="step">
            <input
              id="step"
              className="field"
              inputMode="numeric"
              value={String(settings.slot_step_min)}
              onChange={(event) =>
                setSettings({ ...settings, slot_step_min: Number(event.target.value.replace(/\D/g, '')) || 30 })
              }
            />
          </AdminField>
          <AdminField label="Перерыв между записями, мин" htmlFor="buffer">
            <input
              id="buffer"
              className="field"
              inputMode="numeric"
              value={String(settings.buffer_min)}
              onChange={(event) =>
                setSettings({ ...settings, buffer_min: Number(event.target.value.replace(/\D/g, '')) || 0 })
              }
            />
          </AdminField>
          <AdminField label="Записывать не позже чем за, мин" htmlFor="lead">
            <input
              id="lead"
              className="field"
              inputMode="numeric"
              value={String(settings.min_lead_min)}
              onChange={(event) =>
                setSettings({ ...settings, min_lead_min: Number(event.target.value.replace(/\D/g, '')) || 0 })
              }
            />
          </AdminField>
          <AdminField label="Показывать дней вперёд" htmlFor="horizon">
            <input
              id="horizon"
              className="field"
              inputMode="numeric"
              value={String(settings.horizon_days)}
              onChange={(event) =>
                setSettings({ ...settings, horizon_days: Number(event.target.value.replace(/\D/g, '')) || 21 })
              }
            />
          </AdminField>
        </div>
        <button
          type="button"
          className="btn btn-primary mt-3"
          disabled={busy}
          onClick={() =>
            void patchSettings(
              {
                posts_count: settings.posts_count,
                slot_step_min: settings.slot_step_min,
                buffer_min: settings.buffer_min,
                min_lead_min: settings.min_lead_min,
                horizon_days: settings.horizon_days,
              },
              'Правила записи сохранены.',
            )
          }
        >
          <Save className="size-5" aria-hidden="true" />
          Сохранить
        </button>
      </AdminCard>

      <DaysOffCard daysOff={daysOff} onChanged={load} onNotice={setNotice} />
    </div>
  );
}

function DaysOffCard({
  daysOff,
  onChanged,
  onNotice,
}: {
  daysOff: DayOff[];
  onChanged: () => Promise<void>;
  onNotice: (notice: { kind: 'error' | 'success' | 'info'; text: string }) => void;
}) {
  const [date, setDate] = useState('');
  const [openFrom, setOpenFrom] = useState('');
  const [openTo, setOpenTo] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!date) return;
    setBusy(true);
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        local_date: date,
        open_from: openFrom || null,
        open_to: openTo || null,
        reason,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      onNotice({ kind: 'error', text: 'Не удалось сохранить выходной.' });
      return;
    }
    onNotice({
      kind: 'success',
      text: openFrom || openTo ? 'Сокращённый день сохранён.' : 'Выходной добавлен.',
    });
    setDate('');
    setOpenFrom('');
    setOpenTo('');
    setReason('');
    await onChanged();
  }

  async function remove(localDate: string) {
    const response = await fetch(`/api/admin/settings?date=${localDate}`, { method: 'DELETE' });
    if (!response.ok) {
      onNotice({ kind: 'error', text: 'Не удалось удалить.' });
      return;
    }
    onNotice({ kind: 'success', text: 'Дата снова рабочая.' });
    await onChanged();
  }

  return (
    <AdminCard title="Выходные и сокращённые дни">
      <div className="grid gap-3 sm:grid-cols-5">
        <AdminField label="Дата" htmlFor="do-date">
          <input id="do-date" type="date" className="field" value={date} onChange={(event) => setDate(event.target.value)} />
        </AdminField>
        <AdminField label="Открытие с" htmlFor="do-from" hint="Пусто — с обычного открытия">
          <input id="do-from" type="time" className="field" value={openFrom} onChange={(event) => setOpenFrom(event.target.value)} />
        </AdminField>
        <AdminField label="Закрытие в" htmlFor="do-to" hint="Пусто — до обычного закрытия">
          <input id="do-to" type="time" className="field" value={openTo} onChange={(event) => setOpenTo(event.target.value)} />
        </AdminField>
        <AdminField label="Причина" htmlFor="do-reason">
          <input
            id="do-reason"
            className="field"
            placeholder="Праздник, тех. работы"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </AdminField>
        <div className="flex items-end">
          <button type="button" className="btn btn-primary w-full" onClick={() => void add()} disabled={busy || !date}>
            <Plus className="size-5" aria-hidden="true" />
            Добавить
          </button>
        </div>
      </div>

      {daysOff.length === 0 ? (
        <p className="hint mt-3">Пока нет ни выходных, ни сокращённых дней.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {daysOff.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] p-3">
              <span className="text-[15px]">
                <b>{row.local_date}</b>
                {row.open_from || row.open_to
                  ? ` · сокращённый день ${row.open_from ?? ''}${row.open_to ? `–${row.open_to}` : ''}`
                  : ' · выходной'}
                {row.reason ? ` · ${row.reason}` : ''}
              </span>
              <button
                type="button"
                className="btn btn-secondary !min-h-[36px] !px-3 text-[13px]"
                onClick={() => void remove(row.local_date)}
              >
                <Trash className="size-4" aria-hidden="true" />
                Сделать рабочим
              </button>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}
