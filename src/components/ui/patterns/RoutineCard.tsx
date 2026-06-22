import { Card } from "../Card";
import { Eyebrow } from "../Eyebrow";

type RoutinePeriod = {
  label: string;
  steps: string[];
};

type RoutineCardProps = {
  periods: RoutinePeriod[];
};

export function RoutineCard({ periods }: RoutineCardProps) {
  return (
    <Card variant="surface" elevated className="grid gap-5">
      <Eyebrow>Routine recommandée</Eyebrow>
      <div className="grid gap-5 sm:grid-cols-2">
        {periods.map((period) => (
          <div key={period.label} className="grid gap-2.5">
            <span className="font-display text-lg font-semibold text-text-primary">{period.label}</span>
            <ol className="grid gap-2">
              {period.steps.map((step, i) => (
                <li key={step} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[0.62rem] font-extrabold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm text-text-primary">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Card>
  );
}
