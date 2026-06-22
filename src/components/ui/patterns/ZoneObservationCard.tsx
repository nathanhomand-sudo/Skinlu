import { Badge, type BadgeVariant } from "../Badge";
import { Card } from "../Card";

type ZoneObservationCardProps = {
  zoneName: string;
  observation: string;
  concern: { label: string; variant: BadgeVariant } | null;
};

export function ZoneObservationCard({ zoneName, observation, concern }: ZoneObservationCardProps) {
  return (
    <Card variant="surface-hi" className="flex items-start justify-between gap-4 p-4">
      <div className="grid gap-0.5">
        <span className="text-[0.66rem] font-bold uppercase tracking-[0.07em] text-text-secondary">
          {zoneName}
        </span>
        <p className="text-sm leading-snug text-text-primary">{observation}</p>
      </div>
      {concern ? (
        <Badge variant={concern.variant} className="shrink-0">
          {concern.label}
        </Badge>
      ) : (
        <Badge variant="neutral" className="shrink-0">
          Aucun signe
        </Badge>
      )}
    </Card>
  );
}
