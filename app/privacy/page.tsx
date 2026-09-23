import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS, LEGAL_ENTITY } from '@/content/business';

export const metadata: Metadata = {
  title: 'Политика обработки персональных данных',
  description:
    'Как автокомплекс «Керей» в Кокшетау обрабатывает персональные данные, оставленные при онлайн-записи.',
  alternates: { canonical: '/privacy' },
};

/**
 * Типовая политика. Перед публикацией её должен проверить юрист (§10, §12).
 * TODO_OWNER: реквизиты оператора, контакт для обращений, срок хранения.
 */
export default function PrivacyPage() {
  return (
    <main className="container-x max-w-[760px] py-8 md:py-14">
      <Link href="/" className="hint">
        ← На главную
      </Link>

      <h1 className="h2 mt-4">Политика обработки персональных данных</h1>
      <p className="mt-2 text-[15px] text-[var(--color-muted)]">
        Документ подготовлен по типовой форме для сайта автокомплекса «{BUSINESS.name}» ({BUSINESS.city}). Оператор:{' '}
        {LEGAL_ENTITY === 'TODO_OWNER' ? 'реквизиты уточняются' : LEGAL_ENTITY}.
      </p>

      <div className="mt-6 grid gap-5 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-[18px] font-bold">1. Какие данные мы собираем</h2>
          <p className="mt-1 text-[var(--color-muted)]">
            При онлайн-записи: имя, номер телефона, предпочтительный способ связи, данные об автомобиле (марка, модель,
            год, государственный номер) и текст комментария. Также сохраняются технические данные: источник перехода (UTM)
            и хеш IP-адреса — они нужны для защиты от спама.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-bold">2. Зачем мы их используем</h2>
          <p className="mt-1 text-[var(--color-muted)]">
            Исключительно для обработки заявки: подтверждение записи, согласование времени и связи с вами по вашему
            автомобилю. Мы не используем данные для рекламы третьих лиц и не продаём их.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-bold">3. Кому передаются данные</h2>
          <p className="mt-1 text-[var(--color-muted)]">
            Карточка заявки передаётся сотруднику сервиса через мессенджер Telegram (сервис Telegram Messenger Inc.) —
            это необходимо, чтобы подтвердить запись. Иным лицам данные не передаются, кроме случаев, предусмотренных
            законодательством Республики Казахстан.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-bold">4. Срок хранения</h2>
          <p className="mt-1 text-[var(--color-muted)]">
            Данные хранятся не дольше, чем это необходимо для обслуживания и учёта, после чего персональные данные
            обезличиваются. Срок хранения настраивается оператором.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-bold">5. Ваши права</h2>
          <p className="mt-1 text-[var(--color-muted)]">
            Вы можете отозвать согласие, запросить сведения об обработке, исправление или удаление своих данных.
            Для этого позвоните по телефону {BUSINESS.phone.display} или напишите в WhatsApp. Согласие даётся при
            отправке формы записи и может быть отозвано в любой момент.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-bold">6. Файлы cookie</h2>
          <p className="mt-1 text-[var(--color-muted)]">
            Сайт использует только технические cookie, необходимые для работы формы записи и (при включении) системы
            веб-аналитики, которые считают обезличенную статистику посещений.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-bold">7. Оператор</h2>
          <p className="mt-1 text-[var(--color-muted)]">
            Автокомплекс «{BUSINESS.name}», адрес: {BUSINESS.address}, {BUSINESS.city}. Реквизиты оператора:{' '}
            {LEGAL_ENTITY === 'TODO_OWNER' ? 'уточняются владельцем' : LEGAL_ENTITY}.
          </p>
        </section>

        <p className="card p-4 text-[14px] text-[var(--color-muted)]">
          TODO_OWNER: перед публикацией документ должен проверить юрист — заполнить реквизиты оператора, контакт для
          обращений по персональным данным и точный срок хранения.
        </p>
      </div>
    </main>
  );
}
