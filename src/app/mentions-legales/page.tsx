import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales - Skinlu",
  description: "Mentions légales du service Skinlu.",
};

export default function LegalNoticePage() {
  return (
    <main className="legal-page">
      <div className="legal-page-inner">
      <nav className="legal-nav"><a href="/">← Retour</a></nav>
      <h1>Mentions légales</h1>

      <section>
        <h2>Éditeur du service</h2>
        <p>
          Skinlu est un outil en ligne d&apos;analyse cosmétique d&apos;étiquettes
          skincare par IA. Les informations légales complètes de
          l&apos;éditeur doivent être complétées avant une commercialisation à
          grande échelle : nom ou raison sociale, adresse, email de contact,
          numéro d&apos;immatriculation le cas échéant.
        </p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          Le service est hébergé par Vercel Inc., 340 S Lemon Ave #4133,
          Walnut, CA 91789, États-Unis.
        </p>
      </section>

      <section>
        <h2>Nature du service</h2>
        <p>
          Skinlu fournit une analyse cosmétique générée par intelligence
          artificielle à partir d&apos;une photo d&apos;étiquette produit et du type de
          peau déclaré par l&apos;utilisateur. Le service peut proposer, après
          paiement, une contextualisation visuelle optionnelle à partir
          d&apos;une photo de peau.
        </p>
        <p>
          Les résultats sont fournis à titre informatif. Ils ne constituent pas
          un diagnostic médical, dermatologique ou pharmaceutique, et ne
          remplacent pas l&apos;avis d&apos;un professionnel de santé.
        </p>
      </section>

      <section>
        <h2>Paiement</h2>
        <p>
          Les paiements sont traités par Stripe. Skinlu ne stocke pas les
          informations complètes de carte bancaire.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>Email de contact à compléter avant lancement public.</p>
      </section>
      </div>
    </main>
  );
}
