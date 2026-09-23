import type {
  CategoryEntity,
  OccasionEntity,
  WardrobeItemWithDetails,
  CreateWardrobeItemInput,
  UpdateWardrobeItemInput,
  WardrobeFilterOptions,
  UserProfile,
} from "@/types/wardrobe";

export const DEFAULT_CATEGORIES: CategoryEntity[] = [
  // Tops
  { id: 1, name: "Shirt", parent_type: "Tops", created_at: "2026-01-01T00:00:00Z" },
  { id: 2, name: "T-Shirt", parent_type: "Tops", created_at: "2026-01-01T00:00:00Z" },
  { id: 3, name: "Blouse", parent_type: "Tops", created_at: "2026-01-01T00:00:00Z" },
  { id: 4, name: "Kurti / Kurta", parent_type: "Tops", created_at: "2026-01-01T00:00:00Z" },
  { id: 5, name: "Sweater / Cardigan", parent_type: "Tops", created_at: "2026-01-01T00:00:00Z" },
  { id: 6, name: "Blazer / Jacket", parent_type: "Tops", created_at: "2026-01-01T00:00:00Z" },

  // Bottoms
  { id: 7, name: "Pants / Trousers", parent_type: "Bottoms", created_at: "2026-01-01T00:00:00Z" },
  { id: 8, name: "Jeans / Denim", parent_type: "Bottoms", created_at: "2026-01-01T00:00:00Z" },
  { id: 9, name: "Skirts", parent_type: "Bottoms", created_at: "2026-01-01T00:00:00Z" },
  { id: 10, name: "Shalwar", parent_type: "Bottoms", created_at: "2026-01-01T00:00:00Z" },
  {
    id: 11,
    name: "Gharara Bottoms / Sharara",
    parent_type: "Bottoms",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 12,
    name: "Palazzo / Culottes",
    parent_type: "Bottoms",
    created_at: "2026-01-01T00:00:00Z",
  },

  // Full-Body / Ethnic
  {
    id: 13,
    name: "Shalwar Kameez",
    parent_type: "Full-Body / Ethnic",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 14,
    name: "Gharara Suit",
    parent_type: "Full-Body / Ethnic",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 15,
    name: "Frock / Anarkali",
    parent_type: "Full-Body / Ethnic",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 16,
    name: "Maxi / Evening Gown",
    parent_type: "Full-Body / Ethnic",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 17,
    name: "Western Dress",
    parent_type: "Full-Body / Ethnic",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 18,
    name: "Saree",
    parent_type: "Full-Body / Ethnic",
    created_at: "2026-01-01T00:00:00Z",
  },

  // Footwear
  {
    id: 20,
    name: "Joggers / Sneakers",
    parent_type: "Footwear",
    created_at: "2026-01-01T00:00:00Z",
  },
  { id: 21, name: "Heels", parent_type: "Footwear", created_at: "2026-01-01T00:00:00Z" },
  { id: 22, name: "Flats / Sandals", parent_type: "Footwear", created_at: "2026-01-01T00:00:00Z" },
  {
    id: 23,
    name: "Khussas / Mojaris",
    parent_type: "Footwear",
    created_at: "2026-01-01T00:00:00Z",
  },

  // Jewelry & Accessories
  {
    id: 25,
    name: "Jhumkas / Earrings",
    parent_type: "Jewelry & Accessories",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 26,
    name: "Necklaces & Chokers",
    parent_type: "Jewelry & Accessories",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 27,
    name: "Bangles & Bracelets",
    parent_type: "Jewelry & Accessories",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 28,
    name: "Handbags & Clutches",
    parent_type: "Jewelry & Accessories",
    created_at: "2026-01-01T00:00:00Z",
  },
];

export const DEFAULT_OCCASIONS: OccasionEntity[] = [
  { id: 1, name: "Office", created_at: "2026-01-01T00:00:00Z" },
  { id: 2, name: "Casual", created_at: "2026-01-01T00:00:00Z" },
  { id: 3, name: "Dinner", created_at: "2026-01-01T00:00:00Z" },
  { id: 4, name: "Wedding", created_at: "2026-01-01T00:00:00Z" },
  { id: 5, name: "Formal", created_at: "2026-01-01T00:00:00Z" },
  { id: 6, name: "Party", created_at: "2026-01-01T00:00:00Z" },
];

export const FASHION_COLORS = [
  "Black",
  "White / Ivory",
  "Navy Blue",
  "Royal Blue",
  "Emerald Green",
  "Sage Green",
  "Maroon / Wine",
  "Crimson Red",
  "Mustard Yellow",
  "Dusty Rose",
  "Beige / Camel",
  "Gold",
  "Silver",
  "Charcoal Gray",
  "Lavender",
  "Rust / Terracotta",
];

export const FASHION_FABRICS = [
  "Cotton",
  "Lawn",
  "Silk",
  "Raw Silk",
  "Chiffon",
  "Georgette",
  "Velvet",
  "Denim",
  "Linen",
  "Organza",
  "Wool / Cashmere",
  "Satin",
];

export const FASHION_SEASONS = ["All Season", "Summer", "Winter", "Spring", "Fall"];

export const PARENT_CATEGORY_GROUPS = [
  "All",
  "Tops",
  "Bottoms",
  "Full-Body / Ethnic",
  "Footwear",
  "Jewelry & Accessories",
];

// ============================================================================
// Robust Mock Data Fallback (Always available in memory & never null)
// ============================================================================
export const MOCK_WARDROBE_ITEMS: WardrobeItemWithDetails[] = [
  {
    id: "mock_shalwar_kameez",
    user_id: "default_user",
    category_id: 13,
    title: "Emerald Embroidered Shalwar Kameez",
    image_url:
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
    thumbnail_url:
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80",
    primary_color: "Emerald Green",
    secondary_color: "Gold",
    fabric_type: "Raw Silk",
    season: "All Season",
    is_favorite: true,
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    category: {
      id: 13,
      name: "Shalwar Kameez",
      parent_type: "Full-Body / Ethnic",
      created_at: "2026-01-01T00:00:00Z",
    },
    occasions: [
      { id: 4, name: "Wedding", created_at: "2026-01-01T00:00:00Z" },
      { id: 3, name: "Dinner", created_at: "2026-01-01T00:00:00Z" },
    ],
  },
  {
    id: "mock_white_shirt",
    user_id: "default_user",
    category_id: 1,
    title: "Classic Crisp White Shirt",
    image_url:
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80",
    thumbnail_url:
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=400&q=80",
    primary_color: "White / Ivory",
    secondary_color: null,
    fabric_type: "Cotton",
    season: "All Season",
    is_favorite: true,
    created_at: "2026-03-02T11:00:00Z",
    updated_at: "2026-03-02T11:00:00Z",
    category: {
      id: 1,
      name: "Shirt",
      parent_type: "Tops",
      created_at: "2026-01-01T00:00:00Z",
    },
    occasions: [
      { id: 1, name: "Office", created_at: "2026-01-01T00:00:00Z" },
      { id: 2, name: "Casual", created_at: "2026-01-01T00:00:00Z" },
    ],
  },
  {
    id: "mock_black_trousers",
    user_id: "default_user",
    category_id: 7,
    title: "Tailored Black Trousers",
    image_url:
      "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=80",
    thumbnail_url:
      "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=400&q=80",
    primary_color: "Black",
    secondary_color: null,
    fabric_type: "Wool / Cashmere",
    season: "All Season",
    is_favorite: false,
    created_at: "2026-03-03T12:00:00Z",
    updated_at: "2026-03-03T12:00:00Z",
    category: {
      id: 7,
      name: "Pants / Trousers",
      parent_type: "Bottoms",
      created_at: "2026-01-01T00:00:00Z",
    },
    occasions: [
      { id: 1, name: "Office", created_at: "2026-01-01T00:00:00Z" },
      { id: 5, name: "Formal", created_at: "2026-01-01T00:00:00Z" },
    ],
  },
  {
    id: "mock_heels",
    user_id: "default_user",
    category_id: 21,
    title: "Strappy Stiletto Heels",
    image_url:
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80",
    thumbnail_url:
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=400&q=80",
    primary_color: "Black",
    secondary_color: "Gold",
    fabric_type: "Satin",
    season: "All Season",
    is_favorite: true,
    created_at: "2026-03-04T13:00:00Z",
    updated_at: "2026-03-04T13:00:00Z",
    category: {
      id: 21,
      name: "Heels",
      parent_type: "Footwear",
      created_at: "2026-01-01T00:00:00Z",
    },
    occasions: [
      { id: 3, name: "Dinner", created_at: "2026-01-01T00:00:00Z" },
      { id: 4, name: "Wedding", created_at: "2026-01-01T00:00:00Z" },
    ],
  },
  {
    id: "mock_jhumkas",
    user_id: "default_user",
    category_id: 25,
    title: "Kundan Pearl Gold Jhumkas",
    image_url:
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
    thumbnail_url:
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80",
    primary_color: "Gold",
    secondary_color: "White / Ivory",
    fabric_type: null,
    season: "All Season",
    is_favorite: true,
    created_at: "2026-03-05T14:00:00Z",
    updated_at: "2026-03-05T14:00:00Z",
    category: {
      id: 25,
      name: "Jhumkas / Earrings",
      parent_type: "Jewelry & Accessories",
      created_at: "2026-01-01T00:00:00Z",
    },
    occasions: [
      { id: 4, name: "Wedding", created_at: "2026-01-01T00:00:00Z" },
      { id: 3, name: "Dinner", created_at: "2026-01-01T00:00:00Z" },
    ],
  },
  {
    id: "mock_gharara",
    user_id: "default_user",
    category_id: 14,
    title: "Crimson Silk Gharara Suit",
    image_url:
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
    thumbnail_url:
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80",
    primary_color: "Crimson Red",
    secondary_color: "Gold",
    fabric_type: "Silk",
    season: "Winter",
    is_favorite: false,
    created_at: "2026-03-06T15:00:00Z",
    updated_at: "2026-03-06T15:00:00Z",
    category: {
      id: 14,
      name: "Gharara Suit",
      parent_type: "Full-Body / Ethnic",
      created_at: "2026-01-01T00:00:00Z",
    },
    occasions: [{ id: 4, name: "Wedding", created_at: "2026-01-01T00:00:00Z" }],
  },
  {
    id: "mock_denim",
    user_id: "default_user",
    category_id: 8,
    title: "Straight Leg Classic Denim Jeans",
    image_url:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80",
    thumbnail_url:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=400&q=80",
    primary_color: "Navy Blue",
    secondary_color: null,
    fabric_type: "Denim",
    season: "All Season",
    is_favorite: false,
    created_at: "2026-03-07T16:00:00Z",
    updated_at: "2026-03-07T16:00:00Z",
    category: {
      id: 8,
      name: "Jeans / Denim",
      parent_type: "Bottoms",
      created_at: "2026-01-01T00:00:00Z",
    },
    occasions: [{ id: 2, name: "Casual", created_at: "2026-01-01T00:00:00Z" }],
  },
  {
    id: "mock_khussa",
    user_id: "default_user",
    category_id: 23,
    title: "Golden Dabka Embroidered Khussas",
    image_url:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
    thumbnail_url:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=400&q=80",
    primary_color: "Gold",
    secondary_color: "Beige / Camel",
    fabric_type: "Raw Silk",
    season: "All Season",
    is_favorite: true,
    created_at: "2026-03-08T17:00:00Z",
    updated_at: "2026-03-08T17:00:00Z",
    category: {
      id: 23,
      name: "Khussas / Mojaris",
      parent_type: "Footwear",
      created_at: "2026-01-01T00:00:00Z",
    },
    occasions: [
      { id: 4, name: "Wedding", created_at: "2026-01-01T00:00:00Z" },
      { id: 2, name: "Casual", created_at: "2026-01-01T00:00:00Z" },
    ],
  },
];

// In-Memory Safe Fallback Store (protects against storage failures or SSR)
const inMemoryWardrobeStore: Record<string, WardrobeItemWithDetails[]> = {};
const inMemoryProfileStore: Record<string, UserProfile> = {};

const WARDROBE_STORAGE_PREFIX = "vtr_wardrobe_items_";
const USER_PROFILE_PREFIX = "vtr_user_profile_";

function safeGetLocalStorage(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (err) {
    // Storage access restricted or disabled - gracefully ignore
  }
  return null;
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (err) {
    // Storage write restricted or quota exceeded - gracefully ignore
  }
}

export function getCategories(): CategoryEntity[] {
  return DEFAULT_CATEGORIES;
}

export function getOccasions(): OccasionEntity[] {
  return DEFAULT_OCCASIONS;
}

export function getStoredWardrobeItems(
  userId: string,
  filters?: WardrobeFilterOptions,
): WardrobeItemWithDetails[] {
  try {
    const key = WARDROBE_STORAGE_PREFIX + (userId || "default_user");
    let items: WardrobeItemWithDetails[] | null = null;

    // 1. Try reading from localStorage
    const raw = safeGetLocalStorage(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          items = parsed;
        }
      } catch {
        items = null;
      }
    }

    // 2. Fall back to in-memory store
    if (!items || items.length === 0) {
      if (inMemoryWardrobeStore[key] && inMemoryWardrobeStore[key].length > 0) {
        items = inMemoryWardrobeStore[key];
      }
    }

    // 3. Fall back to guaranteed MOCK_WARDROBE_ITEMS
    if (!items || items.length === 0) {
      items = [...MOCK_WARDROBE_ITEMS];
      inMemoryWardrobeStore[key] = items;
      safeSetLocalStorage(key, JSON.stringify(items));
    }

    // 4. Apply optional filters safely
    if (filters) {
      let filtered = [...items];
      if (filters.category_id) {
        filtered = filtered.filter((i) => i.category_id === filters.category_id);
      }
      if (filters.parent_type && filters.parent_type !== "All") {
        filtered = filtered.filter((i) => i.category?.parent_type === filters.parent_type);
      }
      if (filters.season && filters.season !== "All Season") {
        filtered = filtered.filter((i) => i.season === filters.season || i.season === "All Season");
      }
      if (filters.is_favorite !== undefined && filters.is_favorite) {
        filtered = filtered.filter((i) => i.is_favorite === true);
      }
      if (filters.occasion_id) {
        filtered = filtered.filter((i) => i.occasions?.some((o) => o.id === filters.occasion_id));
      }
      if (filters.search_query) {
        const q = filters.search_query.toLowerCase().trim();
        filtered = filtered.filter(
          (i) =>
            i.title?.toLowerCase().includes(q) ||
            i.primary_color?.toLowerCase().includes(q) ||
            i.secondary_color?.toLowerCase().includes(q) ||
            i.fabric_type?.toLowerCase().includes(q) ||
            i.category?.name?.toLowerCase().includes(q) ||
            i.occasions?.some((o) => o?.name?.toLowerCase().includes(q)),
        );
      }
      return filtered;
    }

    return items;
  } catch (err) {
    console.warn("Recovered from error in getStoredWardrobeItems, returning mock data:", err);
    return [...MOCK_WARDROBE_ITEMS];
  }
}

export function saveWardrobeItem(
  userId: string,
  input: CreateWardrobeItemInput,
): WardrobeItemWithDetails {
  const currentItems = getStoredWardrobeItems(userId);
  const now = new Date().toISOString();

  const category = input.category_id
    ? DEFAULT_CATEGORIES.find((c) => c.id === input.category_id) || null
    : null;

  const occasions = input.occasion_ids
    ? DEFAULT_OCCASIONS.filter((o) => input.occasion_ids?.includes(o.id))
    : [];

  const newItem: WardrobeItemWithDetails = {
    id: "item_" + Math.random().toString(36).substring(2, 11),
    user_id: userId,
    category_id: input.category_id ?? null,
    title: input.title || category?.name || "Wardrobe Item",
    image_url: input.image_url,
    thumbnail_url: input.thumbnail_url || input.image_url,
    primary_color: input.primary_color || null,
    secondary_color: input.secondary_color || null,
    fabric_type: input.fabric_type || null,
    season: input.season || "All Season",
    is_favorite: input.is_favorite || false,
    created_at: now,
    updated_at: now,
    category,
    occasions,
  };

  const updatedItems = [newItem, ...currentItems];
  const key = WARDROBE_STORAGE_PREFIX + (userId || "default_user");
  inMemoryWardrobeStore[key] = updatedItems;
  safeSetLocalStorage(key, JSON.stringify(updatedItems));

  return newItem;
}

export function updateWardrobeItem(
  userId: string,
  itemId: string,
  updates: UpdateWardrobeItemInput,
): WardrobeItemWithDetails | null {
  const currentItems = getStoredWardrobeItems(userId);
  const index = currentItems.findIndex((i) => i.id === itemId);
  if (index === -1) return null;

  const item = currentItems[index];
  const category =
    updates.category_id !== undefined
      ? DEFAULT_CATEGORIES.find((c) => c.id === updates.category_id) || null
      : item.category;

  const occasions =
    updates.occasion_ids !== undefined
      ? DEFAULT_OCCASIONS.filter((o) => updates.occasion_ids?.includes(o.id))
      : item.occasions;

  const updatedItem: WardrobeItemWithDetails = {
    ...item,
    ...updates,
    category,
    occasions,
    updated_at: new Date().toISOString(),
  };

  currentItems[index] = updatedItem;
  const key = WARDROBE_STORAGE_PREFIX + (userId || "default_user");
  inMemoryWardrobeStore[key] = currentItems;
  safeSetLocalStorage(key, JSON.stringify(currentItems));

  return updatedItem;
}

export function deleteWardrobeItem(userId: string, itemId: string): boolean {
  const currentItems = getStoredWardrobeItems(userId);
  const filtered = currentItems.filter((i) => i.id !== itemId);
  if (filtered.length === currentItems.length) return false;

  const key = WARDROBE_STORAGE_PREFIX + (userId || "default_user");
  inMemoryWardrobeStore[key] = filtered;
  safeSetLocalStorage(key, JSON.stringify(filtered));
  return true;
}

export function toggleFavoriteWardrobeItem(userId: string, itemId: string): boolean {
  const currentItems = getStoredWardrobeItems(userId);
  const item = currentItems.find((i) => i.id === itemId);
  if (!item) return false;

  item.is_favorite = !item.is_favorite;
  item.updated_at = new Date().toISOString();

  const key = WARDROBE_STORAGE_PREFIX + (userId || "default_user");
  inMemoryWardrobeStore[key] = currentItems;
  safeSetLocalStorage(key, JSON.stringify(currentItems));
  return item.is_favorite;
}

export function seedSampleWardrobe(userId: string): WardrobeItemWithDetails[] {
  const key = WARDROBE_STORAGE_PREFIX + (userId || "default_user");
  const seeded = [...MOCK_WARDROBE_ITEMS];
  inMemoryWardrobeStore[key] = seeded;
  safeSetLocalStorage(key, JSON.stringify(seeded));
  return seeded;
}

export function getUserProfile(
  userId: string,
  defaultEmail?: string,
  defaultName?: string,
): UserProfile {
  const key = USER_PROFILE_PREFIX + (userId || "default_user");

  let profile: UserProfile | null = null;
  try {
    const raw = safeGetLocalStorage(key);
    if (raw) {
      profile = JSON.parse(raw);
    }
  } catch {
    // Ignore error and fall back
  }

  if (!profile && inMemoryProfileStore[key]) {
    profile = inMemoryProfileStore[key];
  }

  if (profile) {
    // Keep user_photo_url and bodyPhotoUrl in sync
    const photo = profile.bodyPhotoUrl || profile.user_photo_url || null;
    profile.user_photo_url = photo;
    profile.bodyPhotoUrl = photo;
    return profile;
  }

  const defaultProfile: UserProfile = {
    id: userId || "default_user",
    email: defaultEmail || "user@example.com",
    full_name: defaultName || "Fashion Enthusiast",
    user_photo_url: null,
    bodyPhotoUrl: null,
    height: "168 cm",
    heightUnit: "cm",
    heightCm: 168,
    bodyType: "Hourglass",
    measurements: {
      unit: "in",
      shoulderWidth: 16,
      bustChest: 36,
      waist: 28,
      hips: 38,
      inseam: 30,
      torsoLength: 17,
    },
    preferences: {
      defaultOccasion: "Wedding / Festive / Fancy",
      styleAesthetics: ["Traditional Ethnic", "Royal Glam", "Modern Chic"],
      modestyPreference: "Modest & Loose Fit",
      preferredColors: ["Crimson", "Emerald", "Royal Blue", "Gold", "Ivory"],
      avoidColors: [],
    },
    body_type_notes:
      "Medium build, balanced shoulders and hips with defined waistline. Prefer tailored silhouettes, modest draping, and flowing A-lines.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryProfileStore[key] = defaultProfile;
  safeSetLocalStorage(key, JSON.stringify(defaultProfile));
  return defaultProfile;
}

export function saveUserProfile(userId: string, data: Partial<UserProfile>): UserProfile {
  const current = getUserProfile(userId);
  const resolvedPhoto =
    data.bodyPhotoUrl !== undefined
      ? data.bodyPhotoUrl
      : data.user_photo_url !== undefined
        ? data.user_photo_url
        : current.bodyPhotoUrl || current.user_photo_url || null;

  const updated: UserProfile = {
    ...current,
    ...data,
    user_photo_url: resolvedPhoto,
    bodyPhotoUrl: resolvedPhoto,
    measurements: data.measurements
      ? { ...(current.measurements || {}), ...data.measurements }
      : current.measurements,
    preferences: data.preferences
      ? { ...(current.preferences || {}), ...data.preferences }
      : current.preferences,
    updated_at: new Date().toISOString(),
  };

  const key = USER_PROFILE_PREFIX + (userId || "default_user");
  inMemoryProfileStore[key] = updated;
  safeSetLocalStorage(key, JSON.stringify(updated));
  return updated;
}
