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
export const GUEST_SESSION_STORAGE_KEY = "vtr_guest_wardrobe_session";

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

function safeGetSessionStorage(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch (err) {
    // SessionStorage restricted - gracefully ignore
  }
  return null;
}

function safeSetSessionStorage(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
    }
  } catch (err) {
    // SessionStorage write restricted or quota exceeded - gracefully ignore
  }
}

function safeRemoveSessionStorage(key: string): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  } catch (err) {
    // SessionStorage remove restricted - gracefully ignore
  }
}

/**
 * Checks whether the given user ID represents an unauthenticated guest.
 */
export function isGuestUser(userId: string | null | undefined): boolean {
  return !userId || userId === "guest_user" || userId === "guest";
}

let inMemoryGuestSessionStore: WardrobeItemWithDetails[] = [];

/**
 * Retrieves temporary wardrobe items stored in browser sessionStorage for unauthenticated guests.
 * Automatically empties when browser tab is closed or explicitly cleared.
 */
export function getGuestSessionWardrobe(
  filters?: WardrobeFilterOptions,
): WardrobeItemWithDetails[] {
  let items: WardrobeItemWithDetails[] = [];
  const raw = safeGetSessionStorage(GUEST_SESSION_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed;
      }
    } catch {
      items = inMemoryGuestSessionStore;
    }
  } else {
    items = inMemoryGuestSessionStore;
  }

  if (filters) {
    return applyItemFilters(items, filters);
  }
  return items;
}

/**
 * Saves an uploaded clothing item to the guest's sessionStorage.
 * Caches the isolated garment PNG directly to guarantee clean cutouts.
 */
export function saveGuestWardrobeItem(input: CreateWardrobeItemInput): WardrobeItemWithDetails {
  const currentItems = getGuestSessionWardrobe();
  const now = new Date().toISOString();

  const category = input.category_id
    ? DEFAULT_CATEGORIES.find((c) => c.id === input.category_id) || null
    : null;

  const occasions = input.occasion_ids
    ? DEFAULT_OCCASIONS.filter((o) => input.occasion_ids?.includes(o.id))
    : [];

  const finalIsolatedImage = input.bg_removed_url || input.image_url;

  const newItem: WardrobeItemWithDetails = {
    id: "guest_" + Math.random().toString(36).substring(2, 11),
    user_id: "guest_user",
    category_id: input.category_id ?? null,
    title: input.title || category?.name || "Guest Clothing Item",
    image_url: finalIsolatedImage,
    thumbnail_url: input.thumbnail_url || finalIsolatedImage,
    bg_removed_url: finalIsolatedImage,
    is_uploaded: true,
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

  const updated = [newItem, ...currentItems];
  inMemoryGuestSessionStore = updated;
  safeSetSessionStorage(GUEST_SESSION_STORAGE_KEY, JSON.stringify(updated));

  return newItem;
}

/**
 * Updates a guest item stored in sessionStorage.
 */
export function updateGuestWardrobeItem(
  itemId: string,
  updates: UpdateWardrobeItemInput,
): WardrobeItemWithDetails | null {
  const items = getGuestSessionWardrobe();
  const index = items.findIndex((i) => i.id === itemId);
  if (index === -1) return null;

  const item = items[index];
  if (!item) return null;

  const category =
    updates.category_id !== undefined
      ? DEFAULT_CATEGORIES.find((c) => c.id === updates.category_id) || null
      : item.category;

  const occasions =
    updates.occasion_ids !== undefined
      ? DEFAULT_OCCASIONS.filter((o) => updates.occasion_ids?.includes(o.id))
      : item.occasions;

  const orCleared = <T>(field: keyof UpdateWardrobeItemInput, next: T | undefined, current: T) =>
    field in updates ? (next ?? null) : current;

  const updatedItem: WardrobeItemWithDetails = {
    ...item,
    title: orCleared("title", updates.title, item.title),
    category_id: orCleared("category_id", updates.category_id, item.category_id),
    thumbnail_url: orCleared("thumbnail_url", updates.thumbnail_url, item.thumbnail_url),
    primary_color: orCleared("primary_color", updates.primary_color, item.primary_color),
    secondary_color: orCleared("secondary_color", updates.secondary_color, item.secondary_color),
    fabric_type: orCleared("fabric_type", updates.fabric_type, item.fabric_type),
    season: orCleared("season", updates.season, item.season),
    image_url: updates.image_url ?? item.image_url,
    bg_removed_url: orCleared("bg_removed_url", updates.bg_removed_url, item.bg_removed_url),
    is_uploaded: updates.is_uploaded !== undefined ? updates.is_uploaded : item.is_uploaded,
    is_favorite: updates.is_favorite ?? item.is_favorite,
    category: category ?? null,
    occasions: occasions ?? [],
    updated_at: new Date().toISOString(),
  };

  items[index] = updatedItem;
  inMemoryGuestSessionStore = items;
  safeSetSessionStorage(GUEST_SESSION_STORAGE_KEY, JSON.stringify(items));
  return updatedItem;
}

/**
 * Deletes a guest item from sessionStorage.
 */
export function deleteGuestWardrobeItem(itemId: string): boolean {
  const items = getGuestSessionWardrobe();
  const filtered = items.filter((i) => i.id !== itemId);
  if (filtered.length === items.length) return false;

  inMemoryGuestSessionStore = filtered;
  safeSetSessionStorage(GUEST_SESSION_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Clears all temporary guest data from browser sessionStorage and memory.
 */
export function clearGuestSessionWardrobe(): void {
  inMemoryGuestSessionStore = [];
  safeRemoveSessionStorage(GUEST_SESSION_STORAGE_KEY);
}

/**
 * Conversion Trigger:
 * Transfers guest temporary session storage items into a permanent account database/store upon sign-up or login.
 */
export function transferGuestWardrobeToAccount(targetUserId: string): WardrobeItemWithDetails[] {
  if (!targetUserId || isGuestUser(targetUserId)) return [];

  const guestItems = getGuestSessionWardrobe();
  if (guestItems.length === 0) return [];

  const persistentItems = getStoredWardrobeItems(targetUserId);
  const now = new Date().toISOString();

  const migratedItems: WardrobeItemWithDetails[] = guestItems.map((item) => ({
    ...item,
    id: item.id.startsWith("guest_")
      ? "item_" + Math.random().toString(36).substring(2, 11)
      : item.id,
    user_id: targetUserId,
    is_uploaded: true,
    updated_at: now,
  }));

  const merged = [...migratedItems, ...persistentItems];
  const key = WARDROBE_STORAGE_PREFIX + targetUserId;
  inMemoryWardrobeStore[key] = merged;
  safeSetLocalStorage(key, JSON.stringify(merged));

  // Clear guest temporary session data
  clearGuestSessionWardrobe();

  return migratedItems;
}

/**
 * Seeds guest session with 3 sample apparel items (flat-lay cutouts) for quick AI Stylist testing.
 */
export function seedGuestSessionWithDemoGarments(): WardrobeItemWithDetails[] {
  const demoSelection = MOCK_WARDROBE_ITEMS.slice(0, 4).map((it) => ({
    ...it,
    id: "guest_" + it.id,
    user_id: "guest_user",
    is_uploaded: true,
    bg_removed_url: it.image_url,
    title: it.title + " (Sample)",
  }));

  inMemoryGuestSessionStore = demoSelection;
  safeSetSessionStorage(GUEST_SESSION_STORAGE_KEY, JSON.stringify(demoSelection));
  return demoSelection;
}

function applyItemFilters(
  items: WardrobeItemWithDetails[],
  filters: WardrobeFilterOptions,
): WardrobeItemWithDetails[] {
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

// Copy each sample item so toggling favorites never mutates the shared mock objects
function cloneMockWardrobeItems(): WardrobeItemWithDetails[] {
  return MOCK_WARDROBE_ITEMS.map((item) => ({ ...item }));
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
    // Unauthenticated guest users have no active personal wardrobe
    if (!userId || isGuestUser(userId)) {
      return [];
    }

    const key = WARDROBE_STORAGE_PREFIX + userId;
    let items: WardrobeItemWithDetails[] | null = null;

    // 1. Try reading from localStorage (an empty array is a valid, emptied wardrobe)
    const raw = safeGetLocalStorage(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          items = parsed;
        }
      } catch {
        items = null;
      }
    }

    // 2. Fall back to in-memory store
    if (!items) {
      items = inMemoryWardrobeStore[key] ?? null;
    }

    // 3. User's personal wardrobe starts clean (no mock pollution)
    if (!items) {
      items = [];
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
    return cloneMockWardrobeItems();
  }
}

export function saveWardrobeItem(
  userId: string,
  input: CreateWardrobeItemInput,
): WardrobeItemWithDetails {
  if (isGuestUser(userId)) {
    return saveGuestWardrobeItem(input);
  }

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
    bg_removed_url: input.bg_removed_url || null,
    is_uploaded: input.is_uploaded !== undefined ? input.is_uploaded : true,
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
  if (isGuestUser(userId)) {
    return updateGuestWardrobeItem(itemId, updates);
  }

  const currentItems = getStoredWardrobeItems(userId);
  const index = currentItems.findIndex((i) => i.id === itemId);
  if (index === -1) return null;

  const item = currentItems[index];
  if (!item) return null;
  const category =
    updates.category_id !== undefined
      ? DEFAULT_CATEGORIES.find((c) => c.id === updates.category_id) || null
      : item.category;

  const occasions =
    updates.occasion_ids !== undefined
      ? DEFAULT_OCCASIONS.filter((o) => updates.occasion_ids?.includes(o.id))
      : item.occasions;

  // A key present with an undefined value means the user cleared that field
  const orCleared = <T>(field: keyof UpdateWardrobeItemInput, next: T | undefined, current: T) =>
    field in updates ? (next ?? null) : current;

  const updatedItem: WardrobeItemWithDetails = {
    ...item,
    title: orCleared("title", updates.title, item.title),
    category_id: orCleared("category_id", updates.category_id, item.category_id),
    thumbnail_url: orCleared("thumbnail_url", updates.thumbnail_url, item.thumbnail_url),
    primary_color: orCleared("primary_color", updates.primary_color, item.primary_color),
    secondary_color: orCleared("secondary_color", updates.secondary_color, item.secondary_color),
    fabric_type: orCleared("fabric_type", updates.fabric_type, item.fabric_type),
    season: orCleared("season", updates.season, item.season),
    image_url: updates.image_url ?? item.image_url,
    bg_removed_url: orCleared("bg_removed_url", updates.bg_removed_url, item.bg_removed_url),
    is_uploaded: updates.is_uploaded !== undefined ? updates.is_uploaded : item.is_uploaded,
    is_favorite: updates.is_favorite ?? item.is_favorite,
    category: category ?? null,
    occasions: occasions ?? [],
    updated_at: new Date().toISOString(),
  };

  currentItems[index] = updatedItem;
  const key = WARDROBE_STORAGE_PREFIX + (userId || "default_user");
  inMemoryWardrobeStore[key] = currentItems;
  safeSetLocalStorage(key, JSON.stringify(currentItems));

  return updatedItem;
}

export function deleteWardrobeItem(userId: string, itemId: string): boolean {
  if (isGuestUser(userId)) {
    return deleteGuestWardrobeItem(itemId);
  }

  const currentItems = getStoredWardrobeItems(userId);
  const filtered = currentItems.filter((i) => i.id !== itemId);
  if (filtered.length === currentItems.length) return false;

  const key = WARDROBE_STORAGE_PREFIX + (userId || "default_user");
  inMemoryWardrobeStore[key] = filtered;
  safeSetLocalStorage(key, JSON.stringify(filtered));
  return true;
}

export function toggleFavoriteWardrobeItem(userId: string, itemId: string): boolean {
  if (isGuestUser(userId)) {
    const items = getGuestSessionWardrobe();
    const item = items.find((i) => i.id === itemId);
    if (!item) return false;
    item.is_favorite = !item.is_favorite;
    item.updated_at = new Date().toISOString();
    safeSetSessionStorage(GUEST_SESSION_STORAGE_KEY, JSON.stringify(items));
    return item.is_favorite;
  }

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
  const seeded = cloneMockWardrobeItems();
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
