/**
 * КАТАЛОГ УСЛУГ.
 *
 * ВАЖНО: в карточке 2ГИС компании «Керей» нет ни списка услуг, ни цен
 * (вкладка «Цены» пустая). Поэтому каталог собран из ДОПОЛНИТЕЛЬНЫХ РУБРИК карточки —
 * это заявленные самой компанией направления работ, а не выдуманные услуги:
 *   • Ремонт ходовой части автомобиля
 *   • Ремонт бензиновых двигателей
 *   • Развал-схождение
 *   • Запчасти для иномарок
 * Плюс основная рубрика «Легковой автосервис» и отдельный пункт для тех, кто не знает
 * причину неисправности.
 *
 * Цены не придумываем: пока владелец не подтвердит прайс, везде «Стоимость уточняется»,
 * а кнопка ведёт на запись с формулировкой «Рассчитать стоимость».
 */

export type Service = {
  slug: string;
  title: string;
  /** Короткое описание для карточки каталога. */
  summary: string;
  /** Откуда взято направление — чтобы владелец видел источник и мог поправить. */
  source: string;
  icon: 'suspension' | 'engine' | 'alignment' | 'parts' | 'diagnostics';
  /** Цена в тенге. null — цены в карточке нет. */
  priceFrom: number | null;
  /** Длительность приёма в минутах: в карточке не указана, влияет только на сетку слотов. */
  durationMin: number;
  featured: boolean;
};

export const DEFAULT_DURATION_MIN = 60;

export const SERVICES: Service[] = [
  {
    slug: 'suspension',
    title: 'Ремонт ходовой части',
    summary:
      'Стуки, скрипы, увод в сторону, неровная работа подвески. Диагностика и ремонт элементов ходовой части.',
    source: 'Рубрика 2ГИС: «Ремонт ходовой части автомобиля»',
    icon: 'suspension',
    priceFrom: null,
    durationMin: 60,
    featured: true,
  },
  {
    slug: 'engine',
    title: 'Ремонт бензиновых двигателей',
    summary:
      'Работа двигателя, посторонние звуки, потеря тяги, повышенный расход. Диагностика и ремонт бензиновых двигателей.',
    source: 'Рубрика 2ГИС: «Ремонт бензиновых двигателей»',
    icon: 'engine',
    priceFrom: null,
    durationMin: 60,
    featured: true,
  },
  {
    slug: 'wheel-alignment',
    title: 'Развал-схождение',
    summary:
      'Регулировка углов установки колёс после ремонта подвески, удара или замены деталей ходовой части.',
    source: 'Рубрика 2ГИС: «Развал-схождение»',
    icon: 'alignment',
    priceFrom: null,
    durationMin: 60,
    featured: true,
  },
  {
    slug: 'spare-parts',
    title: 'Запчасти для иномарок',
    summary:
      'Подбор и продажа запчастей для иномарок. Наличие и цену конкретной детали уточняйте по телефону.',
    source: 'Рубрика 2ГИС: «Запчасти для иномарок»',
    icon: 'parts',
    priceFrom: null,
    durationMin: 30,
    featured: false,
  },
  {
    slug: 'car-service',
    title: 'Ремонт и обслуживание легковых авто',
    summary:
      'Основное направление автокомплекса — работы по легковым автомобилям 35 марок. Перечень работ и стоимость — после осмотра.',
    source: 'Основная рубрика 2ГИС: «Легковой автосервис»',
    icon: 'diagnostics',
    priceFrom: null,
    durationMin: 60,
    featured: true,
  },
  {
    slug: 'unknown',
    title: 'Не знаю, что сломалось',
    summary:
      'Опишите симптомы — мастер осмотрит автомобиль, определит причину и скажет, что делать дальше.',
    source: 'Пункт для онлайн-записи: помогает выбрать время тем, кто не знает причину неисправности',
    icon: 'diagnostics',
    priceFrom: null,
    durationMin: 60,
    featured: false,
  },
];

export function findService(slug: string): Service | undefined {
  return SERVICES.find((service) => service.slug === slug);
}

export function findServiceByTitle(title: string): Service | undefined {
  return SERVICES.find((service) => service.title === title);
}

/** Цена либо нейтральная формулировка — выдуманных цен на сайте быть не должно. */
export function priceLabel(service: Service): string {
  return service.priceFrom === null ? 'Стоимость уточняется' : `от ${service.priceFrom.toLocaleString('ru-RU')} ₸`;
}
