import { Card } from "../Card";
import { Eyebrow } from "../Eyebrow";

type SkinAnalysisCardProps = {
  skinType: string;
  priority: string;
  observation: string;
  confidence: number;
};

export function SkinAnalysisCard({ skinType, priority, observation, confidence }: SkinAnalysisCardProps) {
  const pct = Math.round(confidence * 100);
  return (
    <Card variant="surface" elevated className="grid gap-4">
      <div className="flex items-center justify-between">
        <Eyebrow>Analyse de peau</Eyebrow>
        <span className="text-[0.68rem] font-bold text-text-secondary">Indicatif</span>
      </div>

      <div className="grid gap-1">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-text-secondary">
          Type probable
        </span>
        <p className="font-display text-xl font-semibold leading-tight text-text-primary">{skinType}</p>
      </div>

      <div className="grid gap-1 border-t border-border pt-4">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-text-secondary">
          Priorité cosmétique
        </span>
        <p className="font-display text-2xl font-semibold leading-tight text-accent">{priority}</p>
        <p className="text-sm leading-relaxed text-text-secondary">{observation}</p>
      </div>

      <div className="grid gap-1.5 border-t border-border pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-text-secondary">Fiabilité de l&apos;analyse</span>
          <span className="text-xs font-bold text-text-primary">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Card>
  );
}
