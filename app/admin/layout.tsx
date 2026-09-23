import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Админка',
  robots: { index: false, follow: false, nocache: true },
};

/** The admin panel is never indexed and never framed (§8, §11). */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[var(--color-bg)]">{children}</div>;
}
