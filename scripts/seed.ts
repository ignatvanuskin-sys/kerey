/**
 * Seeds the DRAFT service list (§12 of the master prompt) and the default settings.
 * The service list is NOT confirmed by the 2GIS card — the owner must review it in /admin/services
 * (the seed is idempotent and never overwrites services edited by the owner).
 */
import { getDb } from '@/db/client';
import { createService, listServices } from '@/db/repo';
import { getSettings, updateSettings } from '@/lib/settings-store';
import { DEFAULT_SETTINGS } from '@/lib/settings';

type SeedService = {
  slug: string;
  title: string;
  short_description: string;
  description: string;
  icon: string;
  duration_min: number;
  is_featured: boolean;
};

const DRAFT_SERVICES: SeedService[] = [
  {
    slug: 'computer-diagnostics',
    title: 'Компьютерная диагностика',
    short_description: 'Считываем ошибки блоков управления и находим причину.',
    description:
      'Подключаем сканер к блокам управления, считываем и расшифровываем ошибки, проверяем показания датчиков. По результатам объясняем, что нужно делать. Длительность в записи — время приёма и диагностики.',
    icon: 'cpu',
    duration_min: 30,
    is_featured: true,
  },
  {
    slug: 'maintenance-oil',
    title: 'ТО: масло и фильтры',
    short_description: 'Плановое обслуживание: замена масла и фильтров.',
    description:
      'Замена моторного масла и фильтров. В записи указано время приёма; длительность работ уточним при подтверждении.',
    icon: 'oil',
    duration_min: 60,
    is_featured: true,
  },
  {
    slug: 'suspension',
    title: 'Ходовая часть: диагностика и ремонт',
    short_description: 'Стуки, скрипы, управляемость — проверяем подвеску.',
    description:
      'Осмотр и диагностика подвески на подъёмнике, определение неисправности. В записи указано время приёма-осмотра, а не всего ремонта.',
    icon: 'suspension',
    duration_min: 60,
    is_featured: true,
  },
  {
    slug: 'brakes',
    title: 'Тормозная система',
    short_description: 'Проверка и ремонт тормозов.',
    description:
      'Диагностика тормозной системы: колодки, диски, суппорты, тормозная жидкость. В записи указано время приёма-осмотра.',
    icon: 'brakes',
    duration_min: 60,
    is_featured: false,
  },
  {
    slug: 'engine',
    title: 'Двигатель: диагностика и ремонт',
    short_description: 'Работа двигателя, расход, посторонние звуки.',
    description:
      'Диагностика двигателя: проверка систем, поиск причины неисправности. В записи указано время приёма-осмотра, а не всего ремонта.',
    icon: 'engine',
    duration_min: 60,
    is_featured: false,
  },
  {
    slug: 'electric',
    title: 'Электрика автомобиля',
    short_description: 'Электрика, проводка, оборудование.',
    description:
      'Поиск неисправностей в электрике: генератор, стартер, проводка, освещение, дополнительное оборудование. В записи указано время приёма-осмотра.',
    icon: 'electric',
    duration_min: 60,
    is_featured: false,
  },
  {
    slug: 'unknown-diagnostics',
    title: 'Не знаю, что сломалось — нужна диагностика',
    short_description: 'Опишите симптомы — найдём причину на месте.',
    description:
      'Подходит, если непонятно, что именно случилось: мастер осмотрит автомобиль и определит причину. В записи указано время приёма.',
    icon: 'search',
    duration_min: 60,
    is_featured: false,
  },
];

function main(): void {
  getDb();
  const existing = listServices(true);
  const existingSlugs = new Set(existing.map((s) => s.slug));

  let created = 0;
  DRAFT_SERVICES.forEach((service, index) => {
    if (existingSlugs.has(service.slug)) return;
    createService({
      ...service,
      price_from: null,
      price_note: 'по результатам диагностики',
      is_active: true,
      sort_order: (index + 1) * 10,
    });
    created += 1;
  });

  // Write the defaults explicitly so the owner sees real values in the admin panel.
  const settings = getSettings();
  updateSettings({
    ...DEFAULT_SETTINGS,
    schedule: settings.schedule,
    contacts: settings.contacts,
    texts: settings.texts,
  });

  console.log(`services: ${existing.length} → ${listServices(true).length} (created ${created})`);
  console.log('settings: defaults applied (schedule 08:30–21:00, posts_count = 2)');
  console.log('reviews:  0 (the block stays hidden until the owner adds real reviews)');
  console.log('photos:   0 (the block stays hidden until the owner uploads real photos)');
}

main();
