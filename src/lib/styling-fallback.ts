import type {
  WardrobeItemWithDetails,
  OutfitRecommendationItem,
  RecommendOutfitResponse,
  UserProfile,
} from "@/types/wardrobe";

export interface StylingRequestPayload {
  occasionId?: number | string;
  occasionName?: string;
  timeOfDay?: string; // "Day", "Evening", "Night"
  season?: string; // "Summer", "Winter", "All Season", etc.
  vibePreference?: string; // "Minimalist Chic", "Royal Regal", "Modern Fusion", etc.
  heroItemId?: string;
  userId?: string;
}

/**
 * High-quality fashion director fallback generator.
 * Produces curated outfit formulas, step-by-step styling directives,
 * hairstyle advice, and makeup inspiration directly from the user's closet.
 */
export function generateFallbackOutfitRecommendations(
  items: WardrobeItemWithDetails[],
  payload: StylingRequestPayload,
  userProfile?: UserProfile | null,
): RecommendOutfitResponse {
  const heroItem = payload.heroItemId ? items.find((i) => i.id === payload.heroItemId) : null;
  const occasion = payload.occasionName || "Special Event";
  const time = payload.timeOfDay || "Evening";
  const season = payload.season || "All Season";
  const vibe = payload.vibePreference || "Royal Regal Glam";

  // Categorize items
  const tops = items.filter(
    (i) =>
      i.category?.parent_type === "Tops" ||
      i.category?.name?.includes("Shirt") ||
      i.category?.name?.includes("Kurti"),
  );
  const bottoms = items.filter(
    (i) =>
      i.category?.parent_type === "Bottoms" ||
      i.category?.name?.includes("Pants") ||
      i.category?.name?.includes("Jeans") ||
      i.category?.name?.includes("Shalwar"),
  );
  const fullBody = items.filter(
    (i) =>
      i.category?.parent_type === "Full-Body / Ethnic" ||
      i.category?.parent_type === "Full Body / Ethnic Set" ||
      i.category?.name?.includes("Shalwar Kameez") ||
      i.category?.name?.includes("Gharara") ||
      i.category?.name?.includes("Dress") ||
      i.category?.name?.includes("Saree") ||
      i.category?.name?.includes("Frock") ||
      i.category?.name?.includes("Anarkali"),
  );
  const footwear = items.filter(
    (i) =>
      i.category?.parent_type === "Footwear" ||
      i.category?.name?.includes("Heels") ||
      i.category?.name?.includes("Khussa") ||
      i.category?.name?.includes("Flats") ||
      i.category?.name?.includes("Shoes"),
  );
  const accessories = items.filter(
    (i) =>
      i.category?.parent_type === "Jewelry & Accessories" ||
      i.category?.parent_type === "Accessories" ||
      i.category?.name?.includes("Jhumkas") ||
      i.category?.name?.includes("Necklace") ||
      i.category?.name?.includes("Earrings") ||
      i.category?.name?.includes("Handbag"),
  );

  const recommendations: OutfitRecommendationItem[] = [];

  // =========================================================================
  // Option 1: Statement / Hero / Traditional Focus
  // =========================================================================
  if (heroItem) {
    const isHeroFullBody =
      heroItem.category?.parent_type === "Full-Body / Ethnic" ||
      heroItem.category?.parent_type === "Full Body / Ethnic Set" ||
      heroItem.category?.name?.includes("Shalwar") ||
      heroItem.category?.name?.includes("Dress") ||
      heroItem.category?.name?.includes("Gharara");

    const shoe = footwear[0] || {
      id: "hero_shoe",
      title: "Pointed Toe Stilettos or Handcrafted Khussas",
    };
    const acc = accessories[0] || {
      id: "hero_acc",
      title: "Gold-Plated Kundan Jhumkas or Sculptural Hoops",
    };

    recommendations.push({
      option_name: `Option 1: Hero Curation — "${heroItem.title}"`,
      style_reasoning: `Curated exclusively around your ${heroItem.title} in ${heroItem.primary_color || "refined tone"}, balanced for ${time.toLowerCase()} lighting at a ${occasion.toLowerCase()} with an unapologetic ${vibe.toLowerCase()} aesthetic.`,
      selected_item_ids: [heroItem.id, shoe.id, acc.id].filter(Boolean) as string[],
      outfit_breakdown: {
        top_or_full_body: heroItem.title || "Hero Ensemble Piece",
        bottom: isHeroFullBody ? null : bottoms[0]?.title || "Tailored Neutral Trousers",
        footwear: shoe.title || "Refined Occasion Footwear",
        jewelry_and_accessories: [acc.title || "Statement Accents"].filter(Boolean) as string[],
      },
      styling_instructions: `Layer the ${heroItem.title} with deliberate posture. Ensure sleeve cuffs and hemlines are crisp. Pair with minimalist hardware so the centerpiece fabric commands attention without competing visual noise.`,
      hair_style_recommendation:
        time === "Day"
          ? "Sleek low bun with a neat middle parting or soft curtain bangs framing the cheekbones."
          : "Voluminous Hollywood waves swept over one shoulder to accentuate neckline and jewelry.",
      makeup_inspiration:
        time === "Day"
          ? "Dewy fresh skin tint, feathered brows, luminous cream blush, and satin nude velvet lips."
          : "Soft kohl smokey eye with finely milled champagne highlighter and bold burgundy or classic scarlet lips.",
    });
  } else if (fullBody.length > 0) {
    const mainGarment = fullBody[0];
    const shoe = footwear.find(
      (f) => f.title?.toLowerCase().includes("heel") || f.title?.toLowerCase().includes("khussa"),
    ) ||
      footwear[0] || { id: "opt1_shoe", title: "Embroidered Velvet Khussas" };
    const acc = accessories[0] || { id: "opt1_acc", title: "Kundan Pearl Chandelier Jhumkas" };

    recommendations.push({
      option_name: `Option 1: Regal Statement Ensemble`,
      style_reasoning: `The rich silhouette and texture of the ${mainGarment.title} provides a complete canvas for ${occasion}, perfectly attuned to ${season.toLowerCase()} temperature and ${time.toLowerCase()} lighting.`,
      selected_item_ids: [mainGarment.id, shoe.id, acc.id].filter(Boolean) as string[],
      outfit_breakdown: {
        top_or_full_body: mainGarment.title || "Full Body Ensemble",
        bottom: null,
        footwear: shoe.title || "Classic Heels or Embroidered Khussas",
        jewelry_and_accessories: [acc.title || "Traditional Gold Accented Jhumkas"].filter(
          Boolean,
        ) as string[],
      },
      styling_instructions: `Drape dupatta or stole with fluid movement over one shoulder or across forearms. Keep posture upright to celebrate the drape and fluidity of the fabric.`,
      hair_style_recommendation:
        "Textured soft waves with face-framing tendrils, or a classic low twisted chignon.",
      makeup_inspiration:
        "Soft kohl-rimmed eyes with subtle winged flick, luminous rose glow on cheekbones, and satin dusty rose lipstick.",
    });
  } else {
    // Top + Bottom fallback
    const top = tops[0] || items[0] || { id: "opt1_top", title: "Structured Silk Blouse" };
    const bottom = bottoms[0] ||
      items[1] || { id: "opt1_bot", title: "High-Waisted Tailored Pants" };
    const shoe = footwear[0] || { id: "opt1_shoe", title: "Pointed Stiletto Pumps" };
    const acc = accessories[0] || { id: "opt1_acc", title: "Minimalist Pendant & Huggie Earrings" };

    recommendations.push({
      option_name: `Option 1: Monochrome Sophistication`,
      style_reasoning: `Combining ${top.title} with ${bottom.title} creates an elongated vertical line that flatters your proportions for ${occasion}.`,
      selected_item_ids: [top.id, bottom.id, shoe.id, acc.id].filter(Boolean) as string[],
      outfit_breakdown: {
        top_or_full_body: top.title,
        bottom: bottom.title,
        footwear: shoe.title,
        jewelry_and_accessories: [acc.title],
      },
      styling_instructions: `French-tuck the top slightly into the waistband to create a defined waist silhouette and leg-lengthening proportion.`,
      hair_style_recommendation: "Polished low ponytail with hair-wrapped elastic band.",
      makeup_inspiration:
        "Warm bronzed eyelids, natural brow stroke definition, and neutral matte lip stain.",
    });
  }

  // =========================================================================
  // Option 2: Contemporary Contrast / Fusion Look
  // =========================================================================
  const altTop =
    tops.length > 1
      ? tops[1]
      : tops[0] || items[0] || { id: "opt2_top", title: "Tailored Crisp Shirt / Kurti" };
  const altBottom =
    bottoms.length > 1
      ? bottoms[1]
      : bottoms[0] || items[1] || { id: "opt2_bot", title: "Straight-Leg Denim or Trousers" };
  const altShoe =
    footwear.length > 1
      ? footwear[1]
      : footwear[0] || { id: "opt2_shoe", title: "Sleek Ankle Strap Heels" };
  const altAcc =
    accessories.length > 1
      ? accessories[1]
      : accessories[0] || { id: "opt2_acc", title: "Sculptural Metal Cuff & Structured Bag" };

  recommendations.push({
    option_name: `Option 2: Modern Fusion Silhouette`,
    style_reasoning: `A sharp balance between structure and effortless comfort. Pairing ${altTop.title} with ${altBottom.title} delivers a striking ${vibe.toLowerCase()} look that transitions seamlessly into ${time.toLowerCase()} festivities.`,
    selected_item_ids: [altTop.id, altBottom.id, altShoe.id, altAcc.id].filter(Boolean) as string[],
    outfit_breakdown: {
      top_or_full_body: altTop.title,
      bottom: altBottom.title,
      footwear: altShoe.title,
      jewelry_and_accessories: [altAcc.title],
    },
    styling_instructions: `Push sleeves to three-quarters length to show delicate wrist accessories. Ground the ensemble with pointed footwear to elongate the stance.`,
    hair_style_recommendation:
      "Tousled textured blowout with volume at the roots or sleek glass-hair flat ironed finish.",
    makeup_inspiration:
      "Clean skin finish, micro-winged liner, subtle champagne inner corner highlight, and a glossy berry lip.",
  });

  return {
    recommendations,
    fallbackUsed: true,
    message: "Styling recommendations curated using your digitized closet inventory.",
  };
}
