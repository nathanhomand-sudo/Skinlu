import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité - Skinlu",
  description: "Politique de confidentialité du service Skinlu.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <h1>Politique de confidentialité</h1>

      <section>
        <h2>Données traitées</h2>
        <p>Skinlu peut traiter les données suivantes :</p>
        <ul>
          <li>photo d&apos;étiquette skincare envoyée pour analyse ;</li>
          <li>type de peau déclaré par l&apos;utilisateur ;</li>
          <li>
            photo de peau optionnelle, uniquement après déblocage du rapport ;
          </li>
          <li>données techniques nécessaires au fonctionnement du service ;</li>
          <li>données de paiement traitées par Stripe.</li>
        </ul>
      </section>

      <section>
        <h2>Finalités</h2>
        <p>
          Ces données sont utilisées pour générer une analyse cosmétique
          personnalisée, afficher le rapport demandé, gérer le paiement et
          assurer le bon fonctionnement technique du service.
        </p>
      </section>

      <section>
        <h2>Photos</h2>
        <p>
          Les photos envoyées sont utilisées pour générer l&apos;analyse demandée.
          Elles ne sont pas destinées à être conservées durablement par Skinlu.
          Lorsqu&apos;une photo est temporairement envoyée vers le stockage
          technique Vercel Blob, elle est supprimée après traitement. La photo
          de peau optionnelle est transmise directement au modèle d&apos;analyse et
          n&apos;est pas stockée par Skinlu.
        </p>
      </section>

      <section>
        <h2>Prestataires</h2>
        <p>Skinlu s&apos;appuie sur les prestataires suivants :</p>
        <ul>
          <li>OpenAI pour l&apos;analyse IA des images et du texte ;</li>
          <li>Vercel pour l&apos;hébergement et le stockage temporaire ;</li>
          <li>Stripe pour le paiement sécurisé.</li>
        </ul>
      </section>

      <section>
        <h2>Durée de conservation</h2>
        <p>
          Les résultats peuvent être conservés localement dans le navigateur de
          l&apos;utilisateur afin d&apos;améliorer l&apos;expérience après paiement. Les
          photos ne sont pas conservées durablement par Skinlu.
        </p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez demander l&apos;accès, la rectification ou la suppression des
          données personnelles vous concernant. L&apos;email de contact doit être
          complété avant lancement public.
        </p>
      </section>

      <section>
        <h2>Avertissement santé</h2>
        <p>
          Skinlu fournit une analyse cosmétique informative. Le service ne
          fournit pas de diagnostic médical ou dermatologique.
        </p>
      </section>
    </main>
  );
}
