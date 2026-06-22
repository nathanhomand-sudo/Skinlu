// Avis — bandeau qui défile (marquee). Thème CLAIR (hero noir → sections
// claires) : fond crème, cartes blanches, accent teal. Avatars en initiales.

type Review = { name: string; meta: string; quote: string };

const TESTIMONIALS: Review[] = [
  { name: "Camille", meta: "24 ans · peau mixte", quote: "J'ai enfin compris ce que ma peau réclamait. J'achète plus au pif sur TikTok." },
  { name: "Yanis", meta: "21 ans · zone T grasse", quote: "En 30 secondes j'avais une routine claire. Plus simple que des heures de conseils contradictoires." },
  { name: "Léa", meta: "27 ans · peau sensible", quote: "Voir mes zones et savoir quoi faire ensuite, ça a changé toute ma salle de bain." },
  { name: "Sofiane", meta: "23 ans · peau grasse", quote: "Bluffant de précision. Enfin un truc qui parle de MA peau, pas d'une peau générique." },
  { name: "Inès", meta: "29 ans · peau sèche", quote: "Je savais enfin par où commencer. Plus besoin de tester 10 produits au hasard." },
  { name: "Noah", meta: "22 ans · imperfections", quote: "Le scan m'a montré mes priorités en une minute. Direct, sans bullshit." },
];

const LOOP = [...TESTIMONIALS, ...TESTIMONIALS];

export function Reviews() {
  return (
    <section className="relative overflow-hidden pb-24 pt-24 sm:pb-32 sm:pt-32" style={{ background: "#EFE9DE", color: "#211e1a" }}>
      <div className="mx-auto mb-12 max-w-xl px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em]" style={{ border: "1px solid rgba(0,0,0,.1)", background: "rgba(15,107,95,.08)", color: "#0F6B5F" }}>
          Avis
        </span>
        <h2 className="font-display mt-5 text-[clamp(1.9rem,4.5vw,3rem)] font-bold leading-[1.1]" style={{ color: "#1c1a17" }}>
          Ils ont arrêté de deviner.
        </h2>
        <p className="mt-4 text-[1rem] leading-relaxed" style={{ color: "#6b655c" }}>
          Les premiers à avoir scanné leur peau au lieu de deviner.
        </p>
      </div>

      <div
        className="relative flex overflow-hidden"
        style={{ maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)" }}
      >
        <div className="x-slider flex w-max gap-5">
          {LOOP.map((t, i) => (
            <figure
              key={i}
              className="flex w-[300px] shrink-0 flex-col rounded-3xl p-6 sm:w-[440px]"
              style={{ background: "#fff", border: "1px solid #e8e2d6", boxShadow: "0 16px 40px -18px rgba(40,33,20,.2)" }}
            >
              <div className="flex gap-0.5" aria-hidden>
                {Array.from({ length: 5 }).map((_, s) => (
                  <svg key={s} className="h-4 w-4" viewBox="0 0 20 20" fill="#0F6B5F">
                    <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.29 3.96a1 1 0 00.95.69h4.16c.97 0 1.37 1.24.59 1.81l-3.37 2.45a1 1 0 00-.36 1.11l1.28 3.96c.3.92-.75 1.69-1.54 1.12l-3.37-2.45a1 1 0 00-1.17 0l-3.37 2.45c-.78.57-1.84-.2-1.54-1.12l1.29-3.96a1 1 0 00-.37-1.11L2.31 9.4c-.78-.57-.38-1.81.59-1.81h4.16a1 1 0 00.95-.69L9.05 2.93z" />
                  </svg>
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-[1.15rem] font-medium leading-relaxed sm:text-[1.3rem]" style={{ color: "#2a2620" }}>
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t pt-4" style={{ borderColor: "#ece6db" }}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-base font-bold" style={{ background: "rgba(15,107,95,.12)", color: "#0F6B5F" }}>
                  {t.name[0]}
                </span>
                <div>
                  <p className="text-[0.95rem] font-semibold" style={{ color: "#1c1a17" }}>{t.name}</p>
                  <span className="block text-[0.78rem]" style={{ color: "#8a8378" }}>{t.meta}</span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
