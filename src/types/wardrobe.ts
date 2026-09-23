/**
 * Database Models & TypeScript Interfaces for Phase 2: Closet & Wardrobe Management Engine
 * Compatible with Supabase, PostgreSQL, and TanStack Start frontend/backend
 */

export type ParentCategoryType =
  "Tops" | "Bottoms" | "Full Body / Ethnic Set" | "Footwear" | "Accessories";

export type SeasonType = "Summer" | "Winter" | "Spring" | "Fall" | "All Season";

export type StandardOccasion =
  | "Office / Work"
  | "Casual / Daily"
  | "Dinner / Date Night"
  | "Wedding / Festive / Fancy"
  | "Formal / Business Meeting"
  | "Party / Night Out"
  | "Traditional / Religious"
  | "Athletic / Gym";

// ============================================================================
// 1. Raw Database Entity Interfaces (Table Mappings)
// ============================================================================

export type BodyShapeType =
  | "Rectangle"
  | "Hourglass"
  | "Pear"
  | "Inverted Triangle"
  | "Athletic"
  | "Apple";

export interface UserMeasurements {
  unit?: "in" | "cm";
  shoulderWidth?: number | null;
  bustChest?: number | null;
  waist?: number | null;
  hips?: number | null;
  inseam?: number | null;
  torsoLength?: number | null;
}

export interface UserStylingPreferences {
  defaultOccasion?: string | null;
  styleAesthetics?: string[];
  modestyPreference?: "Standard" | "Moderate" | "Modest & Loose Fit" | "Full Coverage & Dupatta" | string;
  preferredColors?: string[];
  avoidColors?: string[];
}

export interface UserEntity {
  id: string; // UUID
  email: string;
  password_hash: string;
  full_name: string | null;
  user_photo_url: string | null;
  bodyPhotoUrl?: string | null;
  height?: string | number | null;
  heightUnit?: "cm" | "ft_in";
  heightCm?: number | null;
  bodyType?: BodyShapeType | string | null;
  body_type_notes: string | null;
  measurements?: UserMeasurements | null;
  preferences?: UserStylingPreferences | null;
  created_at: string; // ISO 8601 Timestamp
  updated_at: string; // ISO 8601 Timestamp
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  user_photo_url: string | null;
  bodyPhotoUrl?: string | null;
  height?: string | number | null;
  heightUnit?: "cm" | "ft_in";
  heightCm?: number | null;
  heightFt?: number | null;
  heightIn?: number | null;
  bodyType?: BodyShapeType | string | null;
  body_type_notes: string | null;
  measurements?: UserMeasurements | null;
  preferences?: UserStylingPreferences | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryEntity {
  id: number; // SERIAL
  name: string;
  parent_type: ParentCategoryType | string;
  created_at: string;
}

export interface OccasionEntity {
  id: number; // SERIAL
  name: StandardOccasion | string;
  created_at: string;
}

export interface WardrobeItemEntity {
  id: string; // UUID
  user_id: string; // UUID foreign key to users.id
  category_id: number | null; // Foreign key to categories.id
  title: string | null;
  image_url: string; // Cloudinary / Supabase Storage CDN URL
  thumbnail_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  fabric_type: string | null;
  season: SeasonType | string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemOccasionEntity {
  item_id: string; // UUID foreign key to wardrobe_items.id
  occasion_id: number; // Foreign key to occasions.id
}

// ============================================================================
// 2. Rich Domain & API Models (Joined for Frontend UI and AI Curation)
// ============================================================================

export interface WardrobeItemWithDetails extends WardrobeItemEntity {
  category?: CategoryEntity | null;
  occasions?: OccasionEntity[];
}

export interface CreateWardrobeItemInput {
  title?: string;
  category_id?: number | null;
  image_url: string;
  thumbnail_url?: string;
  primary_color?: string;
  secondary_color?: string;
  fabric_type?: string;
  season?: SeasonType | string;
  is_favorite?: boolean;
  occasion_ids?: number[];
}

export interface UpdateWardrobeItemInput {
  title?: string;
  category_id?: number | null;
  image_url?: string;
  thumbnail_url?: string;
  primary_color?: string;
  secondary_color?: string;
  fabric_type?: string;
  season?: SeasonType | string;
  is_favorite?: boolean;
  occasion_ids?: number[];
}

export interface WardrobeFilterOptions {
  category_id?: number;
  parent_type?: ParentCategoryType | string;
  occasion_id?: number;
  season?: SeasonType | string;
  is_favorite?: boolean;
  search_query?: string;
}

export interface AIOutfitRecommendationRequest {
  user_id: string;
  occasion_id?: number;
  weather_season?: SeasonType | string;
  preferred_color?: string;
  target_event?: string;
}

export interface AIOutfitRecommendationResult {
  outfit_title: string;
  description: string;
  items: WardrobeItemWithDetails[];
  styling_tips: string[];
}

export interface OutfitRecommendationItem {
  option_name: string;
  style_reasoning: string;
  selected_item_ids: string[];
  outfit_breakdown: {
    top_or_full_body: string;
    bottom: string | null;
    footwear: string;
    jewelry_and_accessories: string[];
  };
  styling_instructions: string;
  hair_style_recommendation: string;
  makeup_inspiration: string;
}

export interface RecommendOutfitResponse {
  recommendations: OutfitRecommendationItem[];
  fallbackUsed?: boolean;
  message?: string;
}

// ============================================================================
// 3. Supabase Schema Definition (for Supabase Client Generics)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserEntity;
        Insert: Omit<UserEntity, "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserEntity, "id">>;
      };
      categories: {
        Row: CategoryEntity;
        Insert: Omit<CategoryEntity, "id" | "created_at"> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<Omit<CategoryEntity, "id">>;
      };
      occasions: {
        Row: OccasionEntity;
        Insert: Omit<OccasionEntity, "id" | "created_at"> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<Omit<OccasionEntity, "id">>;
      };
      wardrobe_items: {
        Row: WardrobeItemEntity;
        Insert: Omit<WardrobeItemEntity, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WardrobeItemEntity, "id" | "user_id">>;
      };
      item_occasions: {
        Row: ItemOccasionEntity;
        Insert: ItemOccasionEntity;
        Update: Partial<ItemOccasionEntity>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      update_updated_at_column: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
  };
}
