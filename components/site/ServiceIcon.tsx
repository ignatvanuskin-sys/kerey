import { CircleDot, Cog, Gauge, Ruler, Search, Wrench } from 'lucide-react';
import type { Service } from '@/content/services';

/** Иконка направления. Ключи заданы в каталоге услуг, поэтому набор фиксированный. */
const ICONS: Record<Service['icon'], typeof Wrench> = {
  suspension: Gauge,
  engine: Cog,
  alignment: Ruler,
  parts: CircleDot,
  diagnostics: Search,
};

export default function ServiceIcon({ name, className }: { name: Service['icon']; className?: string }) {
  const Icon = ICONS[name] ?? Wrench;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.7} />;
}
