import { Button } from "../Button";
import { Card } from "../Card";

type PaywallCardProps = {
  title: string;
  subtitle: string;
  deliverables: string[];
  ctaLabel: string;
};

export function PaywallCard({ title, subtitle, deliverables, ctaLabel }: PaywallCardProps) {
  return (
    <Card variant="accent" elevated className="relative grid gap-4 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent/70 via-rose/50 to-accent/70" />
      <div className="grid gap-1.5">
        <h3 className="font-display text-xl font-semibold leading-snug text-text-primary">{title}</h3>
        <p className="text-sm leading-relaxed text-text-secondary">{subtitle}</p>
      </div>
      <ul className="grid gap-2">
        {deliverables.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm font-medium text-text-primary">
            <span className="mt-0.5 text-accent">✓</span>
            {item}
          </li>
        ))}
      </ul>
      <Button variant="primary" className="w-full">
        {ctaLabel}
      </Button>
    </Card>
  );
}
