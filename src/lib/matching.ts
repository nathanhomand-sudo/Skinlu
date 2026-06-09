import type { SupabaseClient } from "@supabase/supabase-js";
import type { Concern } from "@/lib/skin-diagnostic";
import type { SkinType } from "@/lib/visual-age";

export type Product = {
  id: string;
  name: string;
  brand: string;
  concerns: Concern[];
  skin_types: SkinType[];
  product_type: string;
  routine_step: "morning" | "evening" | "both";
  step_order: number;
  affiliate_url: string;
  image_url: string | null;
  price_eur: number | null;
};

export type ProductRoutine = {
  morning: Product[];
  evening: Product[];
  ai_explanation: string;
};

const MORNING_STEPS = ["cleanser", "serum", "moisturizer", "spf"];
const EVENING_STEPS = ["cleanser", "serum", "moisturizer"];

function scoreProduct(product: Product, topPriority: Concern) {
  return [
    product.concerns.includes(topPriority) ? 0 : 1,
    product.step_order,
    product.brand,
    product.name,
  ] as const;
}

function compareProducts(a: Product, b: Product, topPriority: Concern) {
  const left = scoreProduct(a, topPriority);
  const right = scoreProduct(b, topPriority);

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] < right[index]) {
      return -1;
    }

    if (left[index] > right[index]) {
      return 1;
    }
  }

  return 0;
}

function pickRoutineProducts(
  products: Product[],
  steps: string[],
  moment: "morning" | "evening",
  topPriority: Concern,
) {
  const selected: Product[] = [];
  const seen = new Set<string>();

  for (const step of steps) {
    const match = products
      .filter(
        (product) =>
          product.product_type === step &&
          (product.routine_step === moment || product.routine_step === "both") &&
          !seen.has(product.id),
      )
      .sort((a, b) => compareProducts(a, b, topPriority))[0];

    if (match) {
      selected.push(match);
      seen.add(match.id);
    }
  }

  return selected.slice(0, 5);
}

export async function buildRoutineFromProducts(
  supabase: SupabaseClient,
  concerns: Concern[],
  skinType: SkinType,
  topPriority: Concern,
): Promise<ProductRoutine> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .contains("skin_types", [skinType])
    .overlaps("concerns", concerns);

  if (error) {
    throw new Error(`products_query_failed: ${error.message}`);
  }

  const products = (data ?? []) as Product[];
  const morning = pickRoutineProducts(products, MORNING_STEPS, "morning", topPriority);
  const evening = pickRoutineProducts(products, EVENING_STEPS, "evening", topPriority);

  return {
    morning,
    evening,
    ai_explanation:
      products.length === 0
        ? "Aucun produit n'est encore disponible dans le catalogue Skinlu pour ce profil."
        : "Routine construite a partir des produits compatibles avec le type de peau et la priorite detectee.",
  };
}
