import type { Metadata } from "next";
import RoutineClient from "./RoutineClient";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token: _ } = await params;
  return {
    title: "Ma routine Skinlu",
    description:
      "Routine skincare personnalisée par IA — résultat de mon diagnostic peau.",
    openGraph: {
      title: "Ma routine Skinlu · Skinlu",
      description:
        "Découvre ma routine skincare personnalisée, générée en 30 secondes par IA.",
      siteName: "Skinlu",
    },
    twitter: {
      card: "summary",
      title: "Ma routine Skinlu",
      description: "Routine skincare personnalisée par IA.",
    },
  };
}

export default async function RoutinePage({ params }: Props) {
  const { token } = await params;
  return <RoutineClient token={token} />;
}
