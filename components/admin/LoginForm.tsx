'use client';

import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Notice } from '@/components/admin/ui';

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? 'Не удалось войти.');
        return;
      }
      router.replace('/admin/bookings');
      router.refresh();
    } catch {
      setError('Нет связи с сервером.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <label className="label" htmlFor="admin-password">
          Пароль
        </label>
        <input
          id="admin-password"
          type="password"
          className="field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />
      </div>

      {error ? <Notice kind="error">{error}</Notice> : null}

      <button type="submit" className="btn btn-primary" disabled={busy} aria-disabled={busy}>
        {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
        Войти
      </button>

      <p className="hint">
        Пароль задаётся переменной <code>ADMIN_PASSWORD</code> на сервере. Если пароль не задан, вход недоступен.
      </p>
    </form>
  );
}
