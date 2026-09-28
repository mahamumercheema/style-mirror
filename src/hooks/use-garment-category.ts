import { useEffect, useState } from "react";

import {
  guessCategoryFromProduct,
  type CategorySource,
  type GarmentCategory,
} from "@/lib/garment-category";
import type { ProductPreview } from "@/lib/product.functions";

export type GarmentCategoryState = {
  category: GarmentCategory | null;
  /** Where the category came from, shown to the user */
  source: CategorySource | "image" | "you" | null;
  evidence: string | null;
  /** True when the user should confirm (image was ambiguous, or nothing identified it) */
  needsConfirmation: boolean;
  analysingImage: boolean;
};

const EMPTY: GarmentCategoryState = {
  category: null,
  source: null,
  evidence: null,
  needsConfirmation: false,
  analysingImage: false,
};

/**
 * Picks Leffa's garment mode for a product: closet category or product text first, then
 * in-browser image analysis, and finally asks the user. The user can always override.
 */
export function useGarmentCategory(product: ProductPreview | null) {
  const [state, setState] = useState<GarmentCategoryState>(EMPTY);

  useEffect(() => {
    if (!product) {
      setState(EMPTY);
      return;
    }
    const fromText = guessCategoryFromProduct(product);
    if (fromText) {
      setState({
        category: fromText.category,
        source: fromText.source,
        evidence: fromText.evidence,
        needsConfirmation: false,
        analysingImage: false,
      });
      return;
    }

    let cancelled = false;
    setState({ ...EMPTY, analysingImage: true });
    void import("@/lib/garment-image-classifier")
      .then(async ({ classifyGarmentImage, CONFIDENT_IMAGE_SHARE }) => {
        const result = await classifyGarmentImage(product.imageDataUrl);
        if (cancelled) return;
        setState({
          category: result.category,
          source: "image",
          evidence: `${Math.round(result.confidence * 100)}% match`,
          needsConfirmation: result.confidence < CONFIDENT_IMAGE_SHARE,
          analysingImage: false,
        });
      })
      .catch(() => {
        // Image analysis unavailable (offline, model blocked): ask the user instead
        if (!cancelled) setState({ ...EMPTY, needsConfirmation: true });
      });
    return () => {
      cancelled = true;
    };
  }, [product]);

  const chooseCategory = (category: GarmentCategory) =>
    setState({
      category,
      source: "you",
      evidence: null,
      needsConfirmation: false,
      analysingImage: false,
    });

  return { ...state, chooseCategory };
}
