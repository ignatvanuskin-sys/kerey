'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, LoaderCircle, Plus, Save, Trash } from 'lucide-react';
import { AdminCard, AdminField, Notice, Skeleton, Toggle } from '@/components/admin/ui';

type Service = {
  id: number;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  icon: string;
  price_from: number | null;
  price_note: string | null;
  duration_min: number;
  is_active: number;
  is_featured: number;
  sort_order: number;
};

const ICON_KEYS = ['wrench', 'cpu', 'oil', 'suspension', 'brakes', 'engine', 'electric', 'search', 'diagnostic', 'car'];

export default function AdminServices() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/services', { cache: 'no-store' });
      const data = (await response.json()) as { services?: Service[] };
      setServices(data.services ?? []);
    } catch {
      setServices([]);
      setNotice({ kind: 'error', text: 'Не удалось загрузить услуги.' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(payload: Record<string, unknown>, isNew: boolean) {
    setNotice(null);
    const response = await fetch('/api/admin/services', {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setNotice({ kind: 'error', text: data.error ?? 'Не удалось сохранить услугу.' });
      return false;
    }
    setNotice({ kind: 'success', text: isNew ? 'Услуга добавлена.' : 'Изменения сохранены.' });
    await load();
    return true;
  }

  async function remove(id: number) {
    setNotice(null);
    const response = await fetch(`/api/admin/services?id=${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setNotice({ kind: 'error', text: 'Не удалось удалить услугу.' });
      return;
    }
    setNotice({ kind: 'success', text: 'Услуга удалена.' });
    await load();
  }

  async function move(id: number, direction: -1 | 1) {
    if (!services) return;
    const index = services.findIndex((service) => service.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= services.length) return;
    const ids = services.map((service) => service.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', ids }),
    });
    await load();
  }

  return (
    <div className="grid gap-4">
      <AdminCard title="Услуги и длительность приёма">
        <Notice kind="info">
          Список услуг — черновой и не подтверждён карточкой 2ГИС. Проверьте названия, длительность и цены: цены пустые
          показываются как «по результатам диагностики». В скобках — время приёма-осмотра, а не всего ремонта.
        </Notice>
      </AdminCard>

      {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}

      {services === null ? (
        <div className="grid gap-3">
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <div className="grid gap-3">
          {services.map((service, index) => (
            <ServiceRow
              key={service.id}
              service={service}
              isFirst={index === 0}
              isLast={index === services.length - 1}
              onSave={(payload) => save({ ...payload, id: service.id }, false)}
              onDelete={() => void remove(service.id)}
              onMove={(direction) => void move(service.id, direction)}
            />
          ))}
        </div>
      )}

      <NewServiceCard onCreate={(payload) => save(payload, true)} />
    </div>
  );
}

function ServiceRow({
  service,
  isFirst,
  isLast,
  onSave,
  onDelete,
  onMove,
}: {
  service: Service;
  isFirst: boolean;
  isLast: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<boolean>;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [draft, setDraft] = useState({
    slug: service.slug,
    title: service.title,
    short_description: service.short_description,
    description: service.description,
    icon: service.icon,
    price_from: service.price_from === null ? '' : String(service.price_from),
    price_note: service.price_note ?? '',
    duration_min: String(service.duration_min),
    is_active: Boolean(service.is_active),
    is_featured: Boolean(service.is_featured),
  });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <AdminCard
      actions={
        <div className="flex gap-1">
          <button
            type="button"
            className="btn btn-secondary !min-h-[36px] !px-2"
            aria-label="Выше"
            disabled={isFirst}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-secondary !min-h-[36px] !px-2"
            aria-label="Ниже"
            disabled={isLast}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
        </div>
      }
      title={service.title}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <AdminField label="Название" htmlFor={`title-${service.id}`}>
          <input
            id={`title-${service.id}`}
            className="field"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </AdminField>
        <AdminField label="Slug (латиница, для ссылок)" htmlFor={`slug-${service.id}`}>
          <input
            id={`slug-${service.id}`}
            className="field"
            value={draft.slug}
            onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
          />
        </AdminField>

        <AdminField label="Короткое описание (в карточке)" htmlFor={`short-${service.id}`}>
          <input
            id={`short-${service.id}`}
            className="field"
            value={draft.short_description}
            onChange={(event) => setDraft({ ...draft, short_description: event.target.value })}
          />
        </AdminField>
        <AdminField label="Иконка" htmlFor={`icon-${service.id}`}>
          <select
            id={`icon-${service.id}`}
            className="field"
            value={draft.icon}
            onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
          >
            {ICON_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </AdminField>

        <AdminField label="Полное описание" htmlFor={`desc-${service.id}`}>
          <textarea
            id={`desc-${service.id}`}
            className="field min-h-[96px]"
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </AdminField>

        <div className="grid grid-cols-2 gap-3">
          <AdminField label="Цена от, ₸" htmlFor={`price-${service.id}`} hint="Пусто — будут «по результатам диагностики»">
            <input
              id={`price-${service.id}`}
              className="field"
              inputMode="numeric"
              value={draft.price_from}
              onChange={(event) => setDraft({ ...draft, price_from: event.target.value.replace(/\D/g, '') })}
            />
          </AdminField>
          <AdminField label="Длительность приёма, мин" htmlFor={`duration-${service.id}`}>
            <input
              id={`duration-${service.id}`}
              className="field"
              inputMode="numeric"
              value={draft.duration_min}
              onChange={(event) => setDraft({ ...draft, duration_min: event.target.value.replace(/\D/g, '') })}
            />
          </AdminField>
          <div className="col-span-2">
            <AdminField label="Текст про цену (если нет цены)" htmlFor={`pricenote-${service.id}`}>
              <input
                id={`pricenote-${service.id}`}
                className="field"
                value={draft.price_note}
                onChange={(event) => setDraft({ ...draft, price_note: event.target.value })}
              />
            </AdminField>
          </div>
        </div>

        <Toggle
          checked={draft.is_active}
          onChange={(value) => setDraft({ ...draft, is_active: value })}
          label="Показывать на сайте"
        />
        <Toggle
          checked={draft.is_featured}
          onChange={(value) => setDraft({ ...draft, is_featured: value })}
          label="Выделять как популярную"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary !min-h-[40px] !px-4 text-[14px]"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onSave({
              ...draft,
              price_from: draft.price_from === '' ? null : Number(draft.price_from),
              price_note: draft.price_note || null,
              duration_min: Number(draft.duration_min) || 60,
            });
            setBusy(false);
          }}
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          Сохранить
        </button>

        {confirmDelete ? (
          <>
            <button
              type="button"
              className="btn btn-secondary !min-h-[40px] !px-4 text-[14px]"
              onClick={() => setConfirmDelete(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-secondary !min-h-[40px] !px-4 text-[14px] !border-[var(--color-danger)] !text-[var(--color-danger)]"
              onClick={onDelete}
            >
              Удалить навсегда
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-secondary !min-h-[40px] !px-4 text-[14px] !border-[var(--color-danger)] !text-[var(--color-danger)]"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash className="size-4" aria-hidden="true" />
            Удалить
          </button>
        )}
      </div>
    </AdminCard>
  );
}

function NewServiceCard({ onCreate }: { onCreate: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [duration, setDuration] = useState('60');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        <Plus className="size-5" aria-hidden="true" />
        Добавить услугу
      </button>
    );
  }

  return (
    <AdminCard title="Новая услуга">
      <div className="grid gap-3 md:grid-cols-3">
        <AdminField label="Название" htmlFor="new-title">
          <input id="new-title" className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
        </AdminField>
        <AdminField label="Slug" htmlFor="new-slug" hint="Например: wheel-alignment">
          <input id="new-slug" className="field" value={slug} onChange={(event) => setSlug(event.target.value)} />
        </AdminField>
        <AdminField label="Длительность приёма, мин" htmlFor="new-duration">
          <input
            id="new-duration"
            className="field"
            inputMode="numeric"
            value={duration}
            onChange={(event) => setDuration(event.target.value.replace(/\D/g, ''))}
          />
        </AdminField>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || title.trim().length < 2 || !/^[a-z0-9-]+$/.test(slug)}
          aria-disabled={busy || title.trim().length < 2 || !/^[a-z0-9-]+$/.test(slug)}
          onClick={async () => {
            setBusy(true);
            const ok = await onCreate({ title, slug, duration_min: Number(duration) || 60, icon: 'wrench' });
            setBusy(false);
            if (ok) {
              setTitle('');
              setSlug('');
              setDuration('60');
              setOpen(false);
            }
          }}
        >
          {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Plus className="size-5" aria-hidden="true" />}
          Добавить
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Отмена
        </button>
      </div>
    </AdminCard>
  );
}
