import {
  Activity,
  Battery,
  Car,
  Cog,
  Cpu,
  Disc,
  Droplet,
  Fuel,
  Gauge,
  Search,
  Shield,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Services store a semantic icon key (stable across lucide versions), mapped to a component here.
 */
const ICONS: Record<string, LucideIcon> = {
  wrench: Wrench,
  cpu: Cpu,
  oil: Droplet,
  suspension: Activity,
  brakes: Disc,
  engine: Cog,
  electric: Zap,
  search: Search,
  diagnostic: Gauge,
  battery: Battery,
  fuel: Fuel,
  shield: Shield,
  car: Car,
};

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Wrench;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}

export function hasIcon(name: string): boolean {
  return name in ICONS;
}
