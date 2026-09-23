'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, LoaderCircle, LockKeyhole } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !data.ok) {
        setError(data.message ?? 'Не удалось войти');
        return;
      }

      router.replace('/admin');
      router.refresh();
    } catch {
      setError('Нет связи с сервером');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid gap-5 p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)]">
          <LockKeyhole className="size-5 text-[var(--color-accent)]" aria-hidden="true" />
        </span>
        <div>
          <h1 className="h2 text-[22px]">Панель заявок</h1>
          <p className="hint mt-1">Доступ только для сотрудников автокомплекса</p>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="admin-password">
          Пароль
        </label>
        <input
          id="admin-password"
          type="password"
          className="field"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoFocus
        />
      </div>

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--color-danger)] p-3 text-[14px] text-[var(--color-danger)]">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={busy} aria-disabled={busy}>
        {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
        {busy ? 'Проверяем…' : 'Войти'}
      </button>

      <p className="hint">
        Пароль задаётся переменной <code>ADMIN_PASSWORD</code> на сервере. Если она пустая, вход закрыт.
      </p>
    </form>
  );
}
