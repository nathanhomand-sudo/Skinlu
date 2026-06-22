import type { Metadata } from "next";
import NextImage from "next/image";
import { Badge, Button, Card, Container, Eyebrow, SectionHeading, type BadgeVariant } from "@/components/ui";
import {
  PaywallCard,
  RoutineCard,
  SkinAnalysisCard,
  ZoneObservationCard,
} from "@/components/ui/patterns";

export const metadata: Metadata = {
  title: "Skinlu — Design System",
  robots: { index: false, follow: false },
};

const COLOR_SWATCHES: { name: string; varName: string; className: string }[] = [
  { name: "Background", varName: "--bg-main", className: "bg-bg-main" },
  { name: "Background alt", varName: "--bg-alt", className: "bg-bg-alt" },
  { name: "Accent", varName: "--accent", className: "bg-accent" },
  { name: "Accent hover", varName: "--accent-hover", className: "bg-accent-hover" },
  { name: "Rose", varName: "--rose", className: "bg-rose" },
  { name: "Ink", varName: "--ink", className: "bg-ink" },
  { name: "Texte principal", varName: "--text-primary", className: "bg-text-primary" },
  { name: "Texte secondaire", varName: "--text-secondary", className: "bg-text-secondary" },
  { name: "Surface", varName: "--surface", className: "bg-surface" },
  { name: "Surface hi", varName: "--surface-hi", className: "bg-surface-hi" },
  { name: "Bordure", varName: "--border", className: "bg-border" },
  { name: "Bordure forte", varName: "--border-strong", className: "bg-border-strong" },
  { name: "Danger", varName: "--danger", className: "bg-danger" },
];

const CONCERN_SWATCHES: { name: string; className: string }[] = [
  { name: "Acné", className: "bg-concern-acne" },
  { name: "Sensibilité", className: "bg-concern-sensitivity" },
  { name: "Taches", className: "bg-concern-dark-spots" },
  { name: "Signes de l'âge", className: "bg-concern-aging" },
  { name: "Teint terne", className: "bg-concern-dullness" },
  { name: "Déshydratation", className: "bg-concern-dehydration" },
  { name: "Pores visibles", className: "bg-concern-pores" },
];

const REALISTIC_BADGES: { label: string; variant: BadgeVariant }[] = [
  { label: "Pores visibles", variant: "pores" },
  { label: "Déshydratation", variant: "dehydration" },
  { label: "Sensibilité", variant: "sensitivity" },
  { label: "Taches", variant: "dark-spots" },
  { label: "Signes de l'âge", variant: "aging" },
  { label: "Teint terne", variant: "dullness" },
];

const TYPE_SCALE: { sample: string; label: string; meta: string; className: string }[] = [
  {
    sample: "Le scan qui te dit la vérité.",
    label: "Display / Hero",
    meta: "font-display · clamp(2.4rem, 7vw, 4.2rem) · 650 · leading-[0.98]",
    className: "font-display text-[clamp(2.4rem,7vw,4.2rem)] font-[650] leading-[0.98] text-text-primary",
  },
  {
    sample: "Tu vois déjà ce qui mérite ton attention.",
    label: "Display / Section",
    meta: "font-display · clamp(1.8rem, 4vw, 2.6rem) · 650 · leading-[1.05]",
    className: "font-display text-[clamp(1.8rem,4vw,2.6rem)] font-[650] leading-[1.05] text-text-primary",
  },
  {
    sample: "Routine recommandée",
    label: "Display / Card title",
    meta: "font-display · 1.35rem · 600",
    className: "font-display text-[1.35rem] font-semibold text-text-primary",
  },
  {
    sample: "TikTok te montre quoi acheter. Skinlu t'aide à savoir si ça a vraiment du sens pour toi.",
    label: "Body / Lead",
    meta: "font-sans · 1.02rem · 1.7 · text-secondary",
    className: "font-sans text-[1.02rem] leading-[1.7] text-text-secondary max-w-[440px]",
  },
  {
    sample: "Texte courant — UI, descriptions, contenu de carte.",
    label: "Body / Base",
    meta: "font-sans · 0.9rem · 1.55",
    className: "font-sans text-[0.9rem] leading-[1.55] text-text-primary",
  },
  {
    sample: "Analyse cosmétique indicative. Ne remplace pas l'avis d'un professionnel.",
    label: "Body / Caption",
    meta: "font-sans · 0.78rem · text-secondary",
    className: "font-sans text-[0.78rem] leading-[1.5] text-text-secondary",
  },
];

const RADIUS_SWATCHES = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
  { name: "2xl", className: "rounded-2xl" },
];

const SHADOW_SWATCHES = [
  { name: "soft", className: "shadow-soft" },
  { name: "elevated", className: "shadow-elevated" },
  { name: "cta", className: "shadow-cta" },
];

function Block({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-border py-14 first:border-t-0 first:pt-0">
      <div className="grid gap-1.5">
        <h2 className="font-display text-[1.6rem] font-semibold text-text-primary">{title}</h2>
        {description ? <p className="text-sm text-text-secondary max-w-[560px]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

const ZONES = [
  {
    zoneName: "Front",
    observation: "Texture globalement régulière, légère brillance en milieu de journée.",
    concern: { label: "Pores visibles", variant: "pores" as BadgeVariant },
  },
  {
    zoneName: "Zone T",
    observation: "Quelques signes de déshydratation possible au niveau du nez.",
    concern: { label: "Déshydratation", variant: "dehydration" as BadgeVariant },
  },
  {
    zoneName: "Joues",
    observation: "Aucun signe particulier détecté sur cette zone.",
    concern: null,
  },
];

export default function DesignSystemPage() {
  return (
    <main className="bg-bg-main min-h-screen pb-24">
      <Container className="grid gap-3 pt-12 pb-10">
        <Eyebrow>Skinlu — Référence interne</Eyebrow>
        <h1 className="font-display text-[2.4rem] font-bold leading-[1.1] text-text-primary">Design System</h1>
        <p className="text-text-secondary max-w-[620px] text-sm leading-relaxed">
          Tokens, primitives et patterns produit avant intégration dans la landing. Page non
          indexée, réservée à la validation visuelle de la future DA Skinlu.
        </p>
      </Container>

      <Container>
        <Block title="Couleurs">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {COLOR_SWATCHES.map((swatch) => (
              <div key={swatch.varName} className="grid gap-2">
                <div className={`h-16 rounded-md border border-border ${swatch.className}`} />
                <div className="grid gap-0.5">
                  <span className="text-xs font-bold text-text-primary">{swatch.name}</span>
                  <span className="text-[0.68rem] text-text-secondary font-mono">{swatch.varName}</span>
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block
          title="Palette concern"
          description="Zones et préoccupations détectées pendant le scan — utilisée par les badges et les cartes de zone."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {CONCERN_SWATCHES.map((swatch) => (
              <div key={swatch.name} className="grid gap-2">
                <div className={`h-16 rounded-md border border-border ${swatch.className}`} />
                <span className="text-xs font-bold text-text-primary">{swatch.name}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block
          title="Typographie"
          description="Fraunces (display) pour les titres, Inter (sans) pour le contenu. Échelle pensée pour rester lisible sur mobile."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {TYPE_SCALE.map((entry) => (
              <div key={entry.label} className="grid gap-3 rounded-xl border border-border bg-surface p-5">
                <p className={entry.className}>{entry.sample}</p>
                <div className="grid gap-0.5 border-t border-border pt-2.5">
                  <span className="text-xs font-bold text-text-primary">{entry.label}</span>
                  <span className="text-[0.68rem] text-text-secondary font-mono">{entry.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Radius">
          <div className="flex flex-wrap gap-6">
            {RADIUS_SWATCHES.map((r) => (
              <div key={r.name} className="grid gap-2">
                <div className={`h-16 w-16 border-2 border-accent/40 bg-accent/10 ${r.className}`} />
                <span className="text-xs font-bold text-text-primary text-center">{r.name}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Ombres" description="Démonstration sur un fond contrasté pour rester visible.">
          <div className="flex flex-wrap gap-8 rounded-xl bg-bg-alt p-8">
            {SHADOW_SWATCHES.map((s) => (
              <div key={s.name} className="grid gap-3">
                <div className={`h-20 w-32 rounded-lg bg-surface ${s.className}`} />
                <span className="text-xs font-bold text-text-primary text-center">{s.name}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Boutons">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary">Scanner ma peau gratuitement</Button>
            <Button variant="secondary">Voir mon analyse</Button>
            <Button variant="ghost">En savoir plus</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </Block>

        <Block title="Badges" description="Avec les libellés réels utilisés pendant le débrief de scan.">
          <div className="flex flex-wrap gap-2">
            {REALISTIC_BADGES.map((b) => (
              <Badge key={b.label} variant={b.variant}>
                {b.label}
              </Badge>
            ))}
          </div>
        </Block>

        <Block title="Cards">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card variant="surface" elevated>
              <span className="text-xs font-bold text-accent uppercase tracking-wider">Surface</span>
              <p className="mt-2 text-sm text-text-secondary">Carte par défaut, fond blanc, ombre douce.</p>
            </Card>
            <Card variant="surface-hi">
              <span className="text-xs font-bold text-accent uppercase tracking-wider">Surface hi</span>
              <p className="mt-2 text-sm text-text-secondary">Fond légèrement teinté, pour les listes/zones.</p>
            </Card>
            <Card variant="accent" elevated>
              <span className="text-xs font-bold text-accent uppercase tracking-wider">Accent</span>
              <p className="mt-2 text-sm text-text-secondary">Mise en avant (paywall, recommandation).</p>
            </Card>
          </div>
        </Block>

        <Block
          title="Composants produit"
          description="Patterns réels réutilisables pour la landing et le flow de scan — pas de simples démos de tokens."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Analyse de peau</span>
              <SkinAnalysisCard
                skinType="Peau mixte"
                priority="Signes de déshydratation possible"
                observation="Plusieurs zones du visage présentent des signes visibles de manque d'hydratation."
                confidence={0.86}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Zone observée</span>
              <div className="grid gap-2.5">
                {ZONES.map((zone) => (
                  <ZoneObservationCard key={zone.zoneName} {...zone} />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Routine recommandée</span>
              <RoutineCard
                periods={[
                  { label: "Matin", steps: ["Nettoyant doux", "Sérum ciblé", "Hydratant · SPF 50"] },
                  { label: "Soir", steps: ["Double nettoyage", "Traitement nuit"] },
                ]}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Paywall / unlock</span>
              <PaywallCard
                title="Ta routine sur-mesure est prête."
                subtitle="On a transformé ton analyse en un plan simple à suivre, matin et soir."
                deliverables={[
                  "Quoi appliquer, dans quel ordre",
                  "Des produits adaptés à ta peau et ton budget",
                  "Les erreurs à éviter pour améliorer tes résultats",
                ]}
                ctaLabel="Débloquer ma routine personnalisée · 9,99 €"
              />
            </div>
          </div>
        </Block>

        <Block
          title="Aperçu landing (extrait)"
          description="Pas une vraie landing — juste un aperçu de comment ces primitives se combinent visuellement."
        >
          <div className="grid gap-10">
            {/* Hero mockup */}
            <div className="grid overflow-hidden rounded-2xl border border-border bg-bg-main md:grid-cols-2">
              <div className="grid content-center gap-4 p-8">
                <Eyebrow>Skinlu = la fin du skincare au hasard</Eyebrow>
                <p className="font-display text-[clamp(2rem,5vw,2.8rem)] font-[650] leading-[1] text-text-primary">
                  Arrête d&apos;acheter ta skincare au hasard.
                </p>
                <p className="text-sm leading-relaxed text-text-secondary max-w-[380px]">
                  Skinlu t&apos;aide à savoir si ce produit viral a vraiment du sens pour ta peau.
                </p>
                <Button variant="primary" className="w-fit">Scanner ma peau gratuitement</Button>
              </div>
              <div className="relative min-h-[280px]">
                <NextImage
                  src="/faces/hero-portrait.png"
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: "cover", objectPosition: "center 15%" }}
                />
                <div className="absolute left-4 top-4 rounded-xl border border-white/40 bg-white/85 px-3 py-2 shadow-soft backdrop-blur">
                  <span className="block text-[0.6rem] font-bold uppercase tracking-wider text-text-secondary">
                    Routine matin
                  </span>
                  <span className="text-[0.82rem] font-semibold text-text-primary">Cleanser · Sérum · SPF</span>
                </div>
              </div>
            </div>

            {/* Comment ça marche */}
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { n: "01", label: "Fais ton scan", desc: "30 secondes, visage dégagé, lumière naturelle." },
                { n: "02", label: "Skinlu observe", desc: "Zones, signes visibles, priorité cosmétique." },
                { n: "03", label: "Tu obtiens un plan", desc: "Routine claire, matin et soir, sans te tromper." },
              ].map((step) => (
                <div key={step.n} className="grid gap-1.5">
                  <span className="font-display text-3xl font-[650] text-accent/35">{step.n}</span>
                  <span className="text-sm font-bold text-text-primary">{step.label}</span>
                  <span className="text-sm leading-snug text-text-secondary">{step.desc}</span>
                </div>
              ))}
            </div>

            {/* Bloc résultat */}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-5">
                <SkinAnalysisCard
                  skinType="Peau mixte"
                  priority="Signes de déshydratation possible"
                  observation="Plusieurs zones du visage présentent des signes visibles de manque d'hydratation."
                  confidence={0.86}
                />
                <div className="grid gap-2.5">
                  {ZONES.map((zone) => (
                    <ZoneObservationCard key={zone.zoneName} {...zone} />
                  ))}
                </div>
              </div>
              <div className="grid gap-5">
                <RoutineCard
                  periods={[
                    { label: "Matin", steps: ["Nettoyant doux", "Sérum ciblé", "Hydratant · SPF 50"] },
                    { label: "Soir", steps: ["Double nettoyage", "Traitement nuit"] },
                  ]}
                />
                <PaywallCard
                  title="Ta routine sur-mesure est prête."
                  subtitle="On a transformé ton analyse en un plan simple à suivre."
                  deliverables={[
                    "Quoi appliquer, dans quel ordre",
                    "Produits adaptés à ta peau et ton budget",
                  ]}
                  ctaLabel="Débloquer ma routine · 9,99 €"
                />
              </div>
            </div>
          </div>
        </Block>

        <Block title="Section heading">
          <SectionHeading eyebrow="Aperçu gratuit" title="Tu vois déjà ce qui mérite ton attention." />
        </Block>
      </Container>
    </main>
  );
}
