'use client';

import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Plus, Save, Trash } from 'lucide-react';
import type { Settings } from '@/lib/settings';
import { AdminCard, AdminField, Notice, Skeleton, Toggle } from '@/components/admin/ui';

type Review = {
  id: number;
  author: string;
  text: string;
  rating: number | null;
  review_date: string | null;
  is_published: number;
};

type Photo = { id: number; url: string; alt: string; sort_order: number; is_published: number };

export default function AdminContent() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [contacts, setContacts] = useState({
    address: '',
    phone_display: '',
    phone_e164: '',
    instagram: '',
    wa1_display: '',
    wa1: '',
    wa2_display: '',
    wa2: '',
  });
  const [texts, setTexts] = useState({ warranty: '', experience: '', equipment: '' });
  const [notice, setNotice] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [contentResponse, settingsResponse] = await Promise.all([
      fetch('/api/admin/content', { cache: 'no-store' }),
      fetch('/api/admin/settings', { cache: 'no-store' }),
    ]);
    const content = (await contentResponse.json()) as { reviews?: Review[]; photos?: Photo[] };
    const config = (await settingsResponse.json()) as { settings?: Settings };

    setReviews(content.reviews ?? []);
    setPhotos(content.photos ?? []);
    setSettings(config.settings ?? null);

    if (config.settings) {
      const c = config.settings.contacts;
      setContacts({
        address: c?.address ?? '',
        phone_display: c?.phone_display ?? '',
        phone_e164: c?.phone_e164 ?? '',
        instagram: c?.instagram ?? '',
        wa1_display: c?.whatsapp?.[0]?.display ?? '',
        wa1: c?.whatsapp?.[0]?.wa ?? '',
        wa2_display: c?.whatsapp?.[1]?.display ?? '',
        wa2: c?.whatsapp?.[1]?.wa ?? '',
      });
      setTexts({
        warranty: config.settings.texts.warranty ?? '',
        experience: config.settings.texts.experience ?? '',
        equipment: config.settings.texts.equipment ?? '',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function postContent(body: Record<string, unknown>, text: string) {
    setNotice(null);
    const response = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setNotice({ kind: 'error', text: data.error ?? 'Не удалось сохранить.' });
      return false;
    }
    setNotice({ kind: 'success', text });
    await load();
    return true;
  }

  async function patchContent(body: Record<string, unknown>) {
    await fetch('/api/admin/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await load();
  }

  async function deleteContent(entity: 'review' | 'photo', id: number) {
    await fetch(`/api/admin/content?entity=${entity}&id=${id}`, { method: 'DELETE' });
    setNotice({ kind: 'success', text: 'Удалено.' });
    await load();
  }

  async function saveSettings() {
    setBusy(true);
    setNotice(null);
    const whatsapp = [
      contacts.wa1 && { display: contacts.wa1_display || contacts.wa1, wa: contacts.wa1 },
      contacts.wa2 && { display: contacts.wa2_display || contacts.wa2, wa: contacts.wa2 },
    ].filter(Boolean) as Array<{ display: string; wa: string }>;

    const response = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contacts: {
          address: contacts.address,
          phone_display: contacts.phone_display,
          phone_e164: contacts.phone_e164,
          instagram: contacts.instagram,
          whatsapp,
        },
        texts: {
          warranty: texts.warranty || null,
          experience: texts.experience || null,
          equipment: texts.equipment || null,
        },
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setNotice({ kind: 'error', text: 'Не удалось сохранить контент.' });
      return;
    }
    setNotice({ kind: 'success', text: 'Контакты и тексты сохранены.' });
    await load();
  }

  if (reviews === null || photos === null || settings === null) {
    return (
      <div className="grid gap-3">
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}

      <AdminCard title="Контакты на сайте" actions={
        <button type="button" className="btn btn-primary !min-h-[40px] !px-4 text-[14px]" disabled={busy} onClick={() => void saveSettings()}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          Сохранить
        </button>
      }>
        <Notice kind="info">
          Пустые поля — используются данные из карточки 2ГИС (адрес, телефон). Заполненные значения заменяют их.
        </Notice>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <AdminField label="Адрес" htmlFor="c-address">
            <input id="c-address" className="field" value={contacts.address} onChange={(event) => setContacts({ ...contacts, address: event.target.value })} />
          </AdminField>
          <AdminField label="Instagram (ссылка)" htmlFor="c-instagram">
            <input id="c-instagram" className="field" value={contacts.instagram} onChange={(event) => setContacts({ ...contacts, instagram: event.target.value })} />
          </AdminField>
          <AdminField label="Телефон (как показывать)" htmlFor="c-phone">
            <input id="c-phone" className="field" value={contacts.phone_display} onChange={(event) => setContacts({ ...contacts, phone_display: event.target.value })} />
          </AdminField>
          <AdminField label="Телефон в формате +7…" htmlFor="c-phone-e164">
            <input id="c-phone-e164" className="field" value={contacts.phone_e164} onChange={(event) => setContacts({ ...contacts, phone_e164: event.target.value })} />
          </AdminField>
          <AdminField label="WhatsApp 1 — номер (только цифры)" htmlFor="c-wa1">
            <input id="c-wa1" className="field" inputMode="numeric" value={contacts.wa1} onChange={(event) => setContacts({ ...contacts, wa1: event.target.value.replace(/\D/g, '') })} />
          </AdminField>
          <AdminField label="WhatsApp 1 — как показывать" htmlFor="c-wa1d">
            <input id="c-wa1d" className="field" value={contacts.wa1_display} onChange={(event) => setContacts({ ...contacts, wa1_display: event.target.value })} />
          </AdminField>
          <AdminField label="WhatsApp 2 — номер" htmlFor="c-wa2">
            <input id="c-wa2" className="field" inputMode="numeric" value={contacts.wa2} onChange={(event) => setContacts({ ...contacts, wa2: event.target.value.replace(/\D/g, '') })} />
          </AdminField>
          <AdminField label="WhatsApp 2 — как показывать" htmlFor="c-wa2d">
            <input id="c-wa2d" className="field" value={contacts.wa2_display} onChange={(event) => setContacts({ ...contacts, wa2_display: event.target.value })} />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard title="Блок «Почему мы»">
        <Notice kind="info">
          Эти блоки появляются на сайте только если они заполнены. Не пишите то, что нельзя подтвердить: гарантии, сроки,
          опыт, сертификаты.
        </Notice>
        <div className="mt-3 grid gap-3">
          <AdminField label="Гарантия" htmlFor="t-warranty">
            <textarea id="t-warranty" className="field min-h-[80px]" maxLength={600} value={texts.warranty} onChange={(event) => setTexts({ ...texts, warranty: event.target.value })} />
          </AdminField>
          <AdminField label="Опыт" htmlFor="t-experience">
            <textarea id="t-experience" className="field min-h-[80px]" maxLength={600} value={texts.experience} onChange={(event) => setTexts({ ...texts, experience: event.target.value })} />
          </AdminField>
          <AdminField label="Оборудование" htmlFor="t-equipment">
            <textarea id="t-equipment" className="field min-h-[80px]" maxLength={600} value={texts.equipment} onChange={(event) => setTexts({ ...texts, equipment: event.target.value })} />
          </AdminField>
        </div>
        <button type="button" className="btn btn-primary mt-3" disabled={busy} onClick={() => void saveSettings()}>
          <Save className="size-5" aria-hidden="true" />
          Сохранить тексты
        </button>
      </AdminCard>

      <ReviewsCard
        reviews={reviews}
        onCreate={(payload) => postContent({ entity: 'review', ...payload }, 'Отзыв добавлен.')}
        onToggle={(id, isPublished) => void patchContent({ entity: 'review', id, isPublished })}
        onDelete={(id) => void deleteContent('review', id)}
      />

      <PhotosCard
        photos={photos}
        onCreate={(payload) => postContent({ entity: 'photo', ...payload }, 'Фото добавлено.')}
        onToggle={(id, isPublished) => void patchContent({ entity: 'photo', id, isPublished })}
        onDelete={(id) => void deleteContent('photo', id)}
      />
    </div>
  );
}

function ReviewsCard({
  reviews,
  onCreate,
  onToggle,
  onDelete,
}: {
  reviews: Review[];
  onCreate: (payload: Record<string, unknown>) => Promise<boolean>;
  onToggle: (id: number, isPublished: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState('');

  return (
    <AdminCard title="Отзывы клиентов">
      <Notice kind="info">
        Добавляйте только реальные отзывы — со слов клиента или скопированные из 2ГИС с его согласия. Пустой список —
        блок на сайте скрыт.
      </Notice>

      <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr_120px_auto] sm:items-end">
        <AdminField label="Имя" htmlFor="r-author">
          <input id="r-author" className="field" value={author} onChange={(event) => setAuthor(event.target.value)} />
        </AdminField>
        <AdminField label="Текст отзыва" htmlFor="r-text">
          <input id="r-text" className="field" value={text} onChange={(event) => setText(event.target.value)} />
        </AdminField>
        <AdminField label="Оценка" htmlFor="r-rating">
          <input
            id="r-rating"
            className="field"
            inputMode="numeric"
            maxLength={1}
            value={rating}
            onChange={(event) => setRating(event.target.value.replace(/\D/g, '').slice(0, 1))}
          />
        </AdminField>
        <button
          type="button"
          className="btn btn-primary"
          disabled={author.trim().length < 2 || text.trim().length < 5}
          aria-disabled={author.trim().length < 2 || text.trim().length < 5}
          onClick={async () => {
            const ok = await onCreate({ author, text, rating: rating ? Number(rating) : null });
            if (ok) {
              setAuthor('');
              setText('');
              setRating('');
            }
          }}
        >
          <Plus className="size-5" aria-hidden="true" />
          Добавить
        </button>
      </div>

      {reviews.length === 0 ? (
        <p className="hint mt-3">Отзывов пока нет.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {reviews.map((review) => (
            <li key={review.id} className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] p-3">
              <p className="text-[15px]">
                <b>{review.author}</b>
                {review.rating ? ` · ★ ${review.rating}` : ''}
              </p>
              <p className="text-[14px] text-[var(--color-muted)]">{review.text}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Toggle
                  checked={Boolean(review.is_published)}
                  onChange={(value) => onToggle(review.id, value)}
                  label="Показывать на сайте"
                />
                <button
                  type="button"
                  className="btn btn-secondary !min-h-[36px] !px-3 text-[13px] !border-[var(--color-danger)] !text-[var(--color-danger)]"
                  onClick={() => onDelete(review.id)}
                >
                  <Trash className="size-4" aria-hidden="true" />
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

function PhotosCard({
  photos,
  onCreate,
  onToggle,
  onDelete,
}: {
  photos: Photo[];
  onCreate: (payload: Record<string, unknown>) => Promise<boolean>;
  onToggle: (id: number, isPublished: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');

  return (
    <AdminCard title="Фото сервиса">
      <Notice kind="info">
        Загрузите фотографии в папку <code>public/images</code> на сервере и укажите путь вида <code>/images/ceh.jpg</code> либо
        ссылку на фото. Описание нужно для доступности. Пустой список — блок на сайте скрыт. Чтобы фото попало в шапку
        сайта, назовите его <code>hero.jpg</code> в папке <code>public/images</code>.
      </Notice>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <AdminField label="Ссылка на фото" htmlFor="p-url">
          <input id="p-url" className="field" placeholder="/images/ceh.jpg" value={url} onChange={(event) => setUrl(event.target.value)} />
        </AdminField>
        <AdminField label="Описание (alt)" htmlFor="p-alt">
          <input id="p-alt" className="field" value={alt} onChange={(event) => setAlt(event.target.value)} />
        </AdminField>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!/^(\/|https?:\/\/)/.test(url)}
          aria-disabled={!/^(\/|https?:\/\/)/.test(url)}
          onClick={async () => {
            const ok = await onCreate({ url, alt });
            if (ok) {
              setUrl('');
              setAlt('');
            }
          }}
        >
          <Plus className="size-5" aria-hidden="true" />
          Добавить
        </button>
      </div>

      {photos.length === 0 ? (
        <p className="hint mt-3">Фотографий пока нет.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.id} className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt} className="aspect-[4/3] w-full rounded-[var(--radius-control)] object-cover" />
              <p className="hint">{photo.alt || photo.url}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Toggle checked={Boolean(photo.is_published)} onChange={(value) => onToggle(photo.id, value)} label="Показывать" />
                <button
                  type="button"
                  className="btn btn-secondary !min-h-[36px] !px-3 text-[13px] !border-[var(--color-danger)] !text-[var(--color-danger)]"
                  onClick={() => onDelete(photo.id)}
                >
                  <Trash className="size-4" aria-hidden="true" />
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}
