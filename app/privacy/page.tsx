import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS, OWNER_INPUT } from '@/content/business';
import Header from '@/components/site/Header';
import { Footer } from '@/components/site/Sections';

export const metadata: Metadata = {
  title: 'Обработка персональных данных',
  description:
    'Как автокомплекс «Керей» в Кокшетау обрабатывает данные, которые вы оставляете при онлайн-записи на ремонт.',
  alternates: { canonical: '/privacy' },
};

/**
 * Политика обработки данных.
 * TODO владельцу: перед публикацией проверьте текст у юриста и добавьте реквизиты компании —
 * в карточке 2ГИС их нет, поэтому здесь стоит нейтральная формулировка.
 */
export default function PrivacyPage() {
  return (
    <>
      <Header />

      <main className="container-x max-w-[820px] py-10 md:py-16">
        <Link href="/" className="hint inline-flex min-h-[44px] items-center hover:text-[var(--color-ink)]">
          ← На главную
        </Link>

        <h1 className="h2 mt-5">Обработка персональных данных</h1>
        <p className="mt-3 text-[15px] text-[var(--color-muted)]">
          Оператор: автокомплекс «{BUSINESS.name}», {BUSINESS.address}, {BUSINESS.city}. Телефон:{' '}
          {BUSINESS.phone.display}.
          {OWNER_INPUT.legalEntity ? ` ${OWNER_INPUT.legalEntity}` : ''}
        </p>

        <div className="mt-8 grid gap-6 text-[16px] leading-relaxed text-[var(--color-chrome)]">
          <section>
            <h2 className="h3 text-[19px]">1. Какие данные мы собираем</h2>
            <p className="mt-2 text-[var(--color-muted)]">
              При онлайн-записи: имя, номер телефона, сведения об автомобиле (марка, модель, год, госномер), описание
              проблемы и выбранные дата и время. Дополнительно сохраняется техническая информация: источник перехода
              (UTM-метки) и обезличенный идентификатор устройства для защиты формы от спама.
            </p>
          </section>

          <section>
            <h2 className="h3 text-[19px]">2. Зачем они нужны</h2>
            <p className="mt-2 text-[var(--color-muted)]">
              Только для обработки заявки: чтобы подтвердить запись, согласовать время визита и связаться с вами по
              вашему автомобилю. Мы не используем данные для рассылок третьих лиц и не продаём их.
            </p>
          </section>

          <section>
            <h2 className="h3 text-[19px]">3. Кому передаются данные</h2>
            <p className="mt-2 text-[var(--color-muted)]">
              Заявка видна сотрудникам сервиса. Если владелец подключил уведомления, копия карточки заявки
              отправляется в защищённый чат сервиса Telegram (Telegram Messenger Inc.). Другим лицам данные не
              передаются, кроме случаев, предусмотренных законодательством Республики Казахстан.
            </p>
          </section>

          <section>
            <h2 className="h3 text-[19px]">4. Сколько храним</h2>
            <p className="mt-2 text-[var(--color-muted)]">
              Столько, сколько нужно для обслуживания и учёта. Данные о визитах старше двух лет могут быть обезличены.
            </p>
          </section>

          <section>
            <h2 className="h3 text-[19px]">5. Ваши права</h2>
            <p className="mt-2 text-[var(--color-muted)]">
              Вы можете отозвать согласие, запросить сведения об обработке, исправление или удаление своих данных.
              Для этого позвоните по номеру {BUSINESS.phone.display} или напишите в WhatsApp. Согласие даётся
              галочкой при отправке формы и может быть отозвано в любой момент.
            </p>
          </section>

          <section>
            <h2 className="h3 text-[19px]">6. Файлы cookie</h2>
            <p className="mt-2 text-[var(--color-muted)]">
              Сайт не использует рекламные или аналитические cookie. Технические cookie нужны только панели
              сотрудников, чтобы держать сессию входа, и недоступны посетителям сайта.
            </p>
          </section>
        </div>

        <p className="card mt-8 p-5 text-[14px] text-[var(--color-muted)]">
          Перед публикацией сайта текст политики стоит проверить у юриста и дополнить реквизитами компании: в
          публичной карточке 2ГИС юридических данных нет, поэтому они здесь не указаны.
        </p>
      </main>

      <Footer />
    </>
  );
}
