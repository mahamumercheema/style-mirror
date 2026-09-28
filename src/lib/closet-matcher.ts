import type { WardrobeItemWithDetails } from "@/types/wardrobe";

export interface OutfitOptionFromCloset {
  id: string;
  name: string;
  tagline: string;
  pieces: {
    role: "Top" | "Bottom" | "Full Ensemble" | "Footwear" | "Accessory";
    item: WardrobeItemWithDetails;
  }[];
  allItemIds: string[];
  stylingNote: string;
}

export interface ClosetMatchResult {
  occasion: string;
  options: OutfitOptionFromCloset[];
  allMatchingItems: WardrobeItemWithDetails[];
  hasUploadedItems: boolean;
  totalClosetItems: number;
}

/**
 * Checks if a string contains any target keywords
 */
function matchesAnyKeyword(text: string | null | undefined, keywords: string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Matches and groups real clothes from the user's uploaded wardrobe for any given event or occasion.
 * Pure deterministic logic without AI or external network calls.
 */
export function matchClosetForOccasion(
  wardrobe: WardrobeItemWithDetails[],
  occasion: string,
  heroItemId?: string,
): ClosetMatchResult {
  const totalClosetItems = wardrobe.length;
  if (totalClosetItems === 0) {
    return {
      occasion,
      options: [],
      allMatchingItems: [],
      hasUploadedItems: false,
      totalClosetItems: 0,
    };
  }

  const occLower = (occasion || "Special Event").toLowerCase();

  // Extract key search terms from user occasion
  const occasionKeywords = occLower
    .split(/[\s,/&+-]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 2);

  // Categorize user's uploaded items
  const isTop = (i: WardrobeItemWithDetails) =>
    i.category?.parent_type === "Tops" ||
    matchesAnyKeyword(i.category?.name, [
      "shirt",
      "kurti",
      "blouse",
      "top",
      "tee",
      "sweater",
      "jacket",
      "blazer",
      "tunic",
    ]);

  const isBottom = (i: WardrobeItemWithDetails) =>
    i.category?.parent_type === "Bottoms" ||
    matchesAnyKeyword(i.category?.name, [
      "pant",
      "trouser",
      "jean",
      "skirt",
      "shalwar",
      "palazzo",
      "culotte",
      "bottom",
    ]);

  const isFullBody = (i: WardrobeItemWithDetails) =>
    i.category?.parent_type === "Full-Body / Ethnic" ||
    i.category?.parent_type === "Full Body / Ethnic Set" ||
    matchesAnyKeyword(i.category?.name, [
      "dress",
      "saree",
      "sari",
      "gharara",
      "shalwar kameez",
      "anarkali",
      "frock",
      "gown",
      "jumpsuit",
      "abaya",
      "suit",
      "maxi",
    ]);

  const isFootwear = (i: WardrobeItemWithDetails) =>
    i.category?.parent_type === "Footwear" ||
    matchesAnyKeyword(i.category?.name, [
      "shoe",
      "heel",
      "khussa",
      "flat",
      "sandal",
      "boot",
      "sneaker",
      "pump",
      "loafer",
    ]);

  const isAccessory = (i: WardrobeItemWithDetails) =>
    i.category?.parent_type === "Jewelry & Accessories" ||
    i.category?.parent_type === "Accessories" ||
    matchesAnyKeyword(i.category?.name, [
      "bag",
      "jewelry",
      "earring",
      "jhumka",
      "necklace",
      "clutch",
      "scarf",
      "dupatta",
      "belt",
      "bangle",
    ]);

  // Score an item based on how well it fits this occasion
  const scoreItem = (item: WardrobeItemWithDetails): number => {
    let score = 1;

    // Direct occasion tag match
    if (Array.isArray(item.occasions)) {
      for (const occ of item.occasions) {
        const name = (occ.name || "").toLowerCase();
        if (name && occasionKeywords.some((kw) => name.includes(kw) || kw.includes(name))) {
          score += 15;
        }
      }
    }

    // Title or description match
    if (matchesAnyKeyword(item.title, occasionKeywords)) score += 8;
    if (matchesAnyKeyword(item.description, occasionKeywords)) score += 4;

    // Formality heuristic based on event type
    const isWeddingOrFestive = matchesAnyKeyword(occLower, [
      "wedding",
      "festive",
      "barat",
      "walima",
      "mehendi",
      "sangeet",
      "eid",
      "gala",
    ]);
    const isOffice = matchesAnyKeyword(occLower, [
      "office",
      "work",
      "meeting",
      "formal",
      "interview",
      "business",
    ]);
    const isCasual = matchesAnyKeyword(occLower, [
      "casual",
      "daily",
      "brunch",
      "errand",
      "weekend",
      "relaxed",
    ]);
    const isParty = matchesAnyKeyword(occLower, [
      "dinner",
      "party",
      "date",
      "cocktail",
      "evening",
      "night",
    ]);

    if (isWeddingOrFestive) {
      if (isFullBody(item)) score += 6;
      if (
        matchesAnyKeyword(item.fabric_type, [
          "silk",
          "velvet",
          "brocade",
          "chiffon",
          "organza",
          "georgette",
          "embroid",
        ])
      )
        score += 5;
      if (
        matchesAnyKeyword(item.title, ["gold", "kundan", "embroidered", "zari", "heavy", "festive"])
      )
        score += 5;
    } else if (isOffice) {
      if (matchesAnyKeyword(item.category?.name, ["shirt", "blazer", "trouser", "pant"]))
        score += 6;
      if (matchesAnyKeyword(item.fabric_type, ["cotton", "linen", "wool", "structured"]))
        score += 3;
    } else if (isCasual) {
      if (matchesAnyKeyword(item.category?.name, ["jean", "tee", "kurti", "flat", "sneaker"]))
        score += 5;
      if (matchesAnyKeyword(item.fabric_type, ["cotton", "denim", "jersey"])) score += 3;
    } else if (isParty) {
      if (isFullBody(item) || matchesAnyKeyword(item.title, ["black", "silk", "satin", "heel"]))
        score += 5;
    }

    if (item.is_favorite) score += 2;
    return score;
  };

  // Sort wardrobe items by relevance to this event
  const sortedWardrobe = [...wardrobe].sort((a, b) => scoreItem(b) - scoreItem(a));

  const sortedTops = sortedWardrobe.filter(isTop);
  const sortedBottoms = sortedWardrobe.filter(isBottom);
  const sortedFullBody = sortedWardrobe.filter(isFullBody);
  const sortedFootwear = sortedWardrobe.filter(isFootwear);
  const sortedAccessories = sortedWardrobe.filter(isAccessory);

  const heroItem = heroItemId ? wardrobe.find((i) => i.id === heroItemId) : null;

  const options: OutfitOptionFromCloset[] = [];

  // =========================================================================
  // Look Option 1: Hero piece or primary matched look
  // =========================================================================
  if (heroItem) {
    const pieces: OutfitOptionFromCloset["pieces"] = [];
    const usedIds = new Set<string>([heroItem.id]);

    if (isFullBody(heroItem)) {
      pieces.push({ role: "Full Ensemble", item: heroItem });
    } else if (isTop(heroItem)) {
      pieces.push({ role: "Top", item: heroItem });
      const matchedBottom = sortedBottoms.find((b) => !usedIds.has(b.id)) || sortedBottoms[0];
      if (matchedBottom) {
        pieces.push({ role: "Bottom", item: matchedBottom });
        usedIds.add(matchedBottom.id);
      }
    } else if (isBottom(heroItem)) {
      const matchedTop = sortedTops.find((t) => !usedIds.has(t.id)) || sortedTops[0];
      if (matchedTop) {
        pieces.push({ role: "Top", item: matchedTop });
        usedIds.add(matchedTop.id);
      }
      pieces.push({ role: "Bottom", item: heroItem });
    } else {
      pieces.push({ role: "Full Ensemble", item: heroItem });
    }

    // Add shoes & accessories from closet if available
    const shoe = sortedFootwear.find((f) => !usedIds.has(f.id));
    if (shoe) {
      pieces.push({ role: "Footwear", item: shoe });
      usedIds.add(shoe.id);
    }
    const acc = sortedAccessories.find((a) => !usedIds.has(a.id));
    if (acc) {
      pieces.push({ role: "Accessory", item: acc });
      usedIds.add(acc.id);
    }

    options.push({
      id: "option-hero",
      name: `Option 1: Centered on "${heroItem.title}"`,
      tagline: `Styled around your uploaded ${heroItem.title} for ${occasion}.`,
      pieces,
      allItemIds: Array.from(usedIds),
      stylingNote: `Wear your ${heroItem.title} as the anchor piece. Pair it directly with the selected items from your closet for a complete, intentional outfit.`,
    });
  } else if (
    sortedFullBody.length > 0 &&
    (occLower.includes("wedding") ||
      occLower.includes("festive") ||
      occLower.includes("dinner") ||
      occLower.includes("party") ||
      sortedTops.length === 0)
  ) {
    // Full-body piece option (e.g. Saree, Gharara, Shalwar Kameez, Dress)
    const dress = sortedFullBody[0];
    const pieces: OutfitOptionFromCloset["pieces"] = [{ role: "Full Ensemble", item: dress }];
    const usedIds = new Set<string>([dress.id]);

    const shoe = sortedFootwear.find((f) => !usedIds.has(f.id));
    if (shoe) {
      pieces.push({ role: "Footwear", item: shoe });
      usedIds.add(shoe.id);
    }
    const acc = sortedAccessories.find((a) => !usedIds.has(a.id));
    if (acc) {
      pieces.push({ role: "Accessory", item: acc });
      usedIds.add(acc.id);
    }

    options.push({
      id: "option-full-dress",
      name: `Option 1: Coordinated Look with "${dress.title}"`,
      tagline: `Your uploaded full-piece ensemble paired with matching pieces from your closet.`,
      pieces,
      allItemIds: Array.from(usedIds),
      stylingNote: `Wear your ${dress.title} as the main ensemble. It matches the tone and formality of ${occasion}.`,
    });
  } else if (sortedTops.length > 0 && sortedBottoms.length > 0) {
    // Top + Bottom coordinate
    const top = sortedTops[0];
    const bottom = sortedBottoms[0];
    const usedIds = new Set<string>([top.id, bottom.id]);

    const pieces: OutfitOptionFromCloset["pieces"] = [
      { role: "Top", item: top },
      { role: "Bottom", item: bottom },
    ];

    const shoe = sortedFootwear.find((f) => !usedIds.has(f.id));
    if (shoe) {
      pieces.push({ role: "Footwear", item: shoe });
      usedIds.add(shoe.id);
    }
    const acc = sortedAccessories.find((a) => !usedIds.has(a.id));
    if (acc) {
      pieces.push({ role: "Accessory", item: acc });
      usedIds.add(acc.id);
    }

    options.push({
      id: "option-top-bottom",
      name: `Option 1: Pair "${top.title}" with "${bottom.title}"`,
      tagline: `A harmonious top & bottom combination from your wardrobe suited for ${occasion}.`,
      pieces,
      allItemIds: Array.from(usedIds),
      stylingNote: `Wear your ${top.title} paired with your ${bottom.title} to create a balanced silhouette for this occasion.`,
    });
  } else if (wardrobe.length > 0) {
    // Single item or whatever pieces exist
    options.push({
      id: "option-primary",
      name: `Option 1: Wear "${wardrobe[0].title}"`,
      tagline: `Best match from your uploaded items for ${occasion}.`,
      pieces: [{ role: "Full Ensemble", item: wardrobe[0] }],
      allItemIds: [wardrobe[0].id],
      stylingNote: `Put on your ${wardrobe[0].title}. Add any favorite footwear or accessories to complete the look.`,
    });
  }

  // =========================================================================
  // Look Option 2: Alternative Pairing
  // =========================================================================
  const opt1Ids = new Set(options[0]?.allItemIds || []);

  // Try finding an alternative full-body dress OR an alternative top+bottom
  const altDress = sortedFullBody.find((d) => !opt1Ids.has(d.id));
  const altTop =
    sortedTops.find((t) => !opt1Ids.has(t.id)) || (sortedTops.length > 1 ? sortedTops[1] : null);
  const altBottom =
    sortedBottoms.find((b) => !opt1Ids.has(b.id)) ||
    (sortedBottoms.length > 1 ? sortedBottoms[1] : null);

  if (altDress) {
    const pieces: OutfitOptionFromCloset["pieces"] = [{ role: "Full Ensemble", item: altDress }];
    const usedIds = new Set<string>([altDress.id]);

    const shoe = sortedFootwear.find((f) => !usedIds.has(f.id)) || sortedFootwear[0];
    if (shoe) {
      pieces.push({ role: "Footwear", item: shoe });
      usedIds.add(shoe.id);
    }
    const acc = sortedAccessories.find((a) => !usedIds.has(a.id)) || sortedAccessories[0];
    if (acc) {
      pieces.push({ role: "Accessory", item: acc });
      usedIds.add(acc.id);
    }

    options.push({
      id: "option-alt-dress",
      name: `Option 2: Alternative Look with "${altDress.title}"`,
      tagline: `A distinct silhouette from your uploaded closet for ${occasion}.`,
      pieces,
      allItemIds: Array.from(usedIds),
      stylingNote: `An alternative look featuring your ${altDress.title} for a fresh aesthetic.`,
    });
  } else if (altTop && altBottom) {
    const pieces: OutfitOptionFromCloset["pieces"] = [
      { role: "Top", item: altTop },
      { role: "Bottom", item: altBottom },
    ];
    const usedIds = new Set<string>([altTop.id, altBottom.id]);

    const shoe = sortedFootwear.find((f) => !usedIds.has(f.id)) || sortedFootwear[0];
    if (shoe) {
      pieces.push({ role: "Footwear", item: shoe });
      usedIds.add(shoe.id);
    }
    const acc = sortedAccessories.find((a) => !usedIds.has(a.id)) || sortedAccessories[0];
    if (acc) {
      pieces.push({ role: "Accessory", item: acc });
      usedIds.add(acc.id);
    }

    options.push({
      id: "option-alt-pairing",
      name: `Option 2: Pair "${altTop.title}" with "${altBottom.title}"`,
      tagline: `A second coordinated styling option from your closet.`,
      pieces,
      allItemIds: Array.from(usedIds),
      stylingNote: `Pair your ${altTop.title} with your ${altBottom.title} for a versatile second choice.`,
    });
  } else if (wardrobe.length > 1) {
    const otherItem = wardrobe.find((i) => !opt1Ids.has(i.id)) || wardrobe[1];
    options.push({
      id: "option-alt-single",
      name: `Option 2: Wear "${otherItem.title}"`,
      tagline: `Alternative garment option from your wardrobe.`,
      pieces: [{ role: "Full Ensemble", item: otherItem }],
      allItemIds: [otherItem.id],
      stylingNote: `Wear your ${otherItem.title} for ${occasion}.`,
    });
  }

  // =========================================================================
  // Look Option 3: Third Option if enough clothes exist
  // =========================================================================
  const allUsedIds = new Set<string>([
    ...(options[0]?.allItemIds || []),
    ...(options[1]?.allItemIds || []),
  ]);
  const remDress = sortedFullBody.find((d) => !allUsedIds.has(d.id));
  const remTop = sortedTops.find((t) => !allUsedIds.has(t.id));
  const remBottom = sortedBottoms.find((b) => !allUsedIds.has(b.id)) || sortedBottoms[0];

  if (remDress) {
    options.push({
      id: "option-third-dress",
      name: `Option 3: Statement Look with "${remDress.title}"`,
      tagline: `Another complete outfit choice from your closet.`,
      pieces: [{ role: "Full Ensemble", item: remDress }],
      allItemIds: [remDress.id],
      stylingNote: `Wear your ${remDress.title} as a bold statement option.`,
    });
  } else if (remTop && remBottom) {
    options.push({
      id: "option-third-pair",
      name: `Option 3: Pair "${remTop.title}" with "${remBottom.title}"`,
      tagline: `Casual or fusion styling from your uploaded pieces.`,
      pieces: [
        { role: "Top", item: remTop },
        { role: "Bottom", item: remBottom },
      ],
      allItemIds: [remTop.id, remBottom.id],
      stylingNote: `Combine ${remTop.title} with ${remBottom.title} for a third wearable look.`,
    });
  }

  return {
    occasion,
    options,
    allMatchingItems: sortedWardrobe,
    hasUploadedItems: true,
    totalClosetItems,
  };
}
