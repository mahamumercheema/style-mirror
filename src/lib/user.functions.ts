import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserProfile, saveUserProfile } from "./wardrobe-service";
import type { UserProfile, UserMeasurements, UserStylingPreferences } from "@/types/wardrobe";

const measurementsSchema = z
  .object({
    unit: z.enum(["in", "cm"]).optional(),
    shoulderWidth: z.number().nullable().optional(),
    bustChest: z.number().nullable().optional(),
    waist: z.number().nullable().optional(),
    hips: z.number().nullable().optional(),
    inseam: z.number().nullable().optional(),
    torsoLength: z.number().nullable().optional(),
  })
  .optional();

const preferencesSchema = z
  .object({
    defaultOccasion: z.string().nullable().optional(),
    styleAesthetics: z.array(z.string()).optional(),
    modestyPreference: z.string().optional(),
    preferredColors: z.array(z.string()).optional(),
    avoidColors: z.array(z.string()).optional(),
  })
  .optional();

export const getUserProfileServerFn = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        userId: z.string().default("default_user"),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ success: boolean; profile: UserProfile }> => {
    const profile = getUserProfile(data.userId);
    return {
      success: true,
      profile,
    };
  });

export const updateUserProfileServerFn = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        userId: z.string().default("default_user"),
        full_name: z.string().optional(),
        bodyPhotoUrl: z.string().nullable().optional(),
        user_photo_url: z.string().nullable().optional(),
        height: z.union([z.string(), z.number()]).nullable().optional(),
        heightUnit: z.enum(["cm", "ft_in"]).optional(),
        heightCm: z.number().nullable().optional(),
        heightFt: z.number().nullable().optional(),
        heightIn: z.number().nullable().optional(),
        bodyType: z.string().nullable().optional(),
        body_type_notes: z.string().nullable().optional(),
        measurements: measurementsSchema,
        preferences: preferencesSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ success: boolean; profile: UserProfile }> => {
    const { userId, ...profileData } = data;
    const updated = saveUserProfile(userId, profileData as Partial<UserProfile>);
    return {
      success: true,
      profile: updated,
    };
  });

// ============================================================================
// Client-side wrappers with seamless network + local fallback
// ============================================================================

export async function apiGetUserProfile(userId: string = "default_user"): Promise<UserProfile> {
  // Try HTTP endpoint first
  try {
    const res = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${userId}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.profile) return data.profile;
    }
  } catch {
    // Continue to serverFn / local
  }

  // Fallback to serverFn
  try {
    const res = await getUserProfileServerFn({ data: { userId } });
    if (res.profile) return res.profile;
  } catch {
    // Continue to local storage
  }

  return getUserProfile(userId);
}

export async function apiUpdateUserProfile(
  userId: string = "default_user",
  data: Partial<UserProfile>,
): Promise<UserProfile> {
  // Update local store immediately for instant UI reactivity
  const localSaved = saveUserProfile(userId, data);

  // Try HTTP endpoint
  try {
    const res = await fetch(`/api/user/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userId}`,
      },
      body: JSON.stringify({ userId, ...data }),
    });
    if (res.ok) {
      const respData = await res.json();
      if (respData.profile) return respData.profile;
    }
  } catch {
    // Fallback to serverFn
    try {
      const serverRes = await updateUserProfileServerFn({
        data: {
          userId,
          ...data,
        },
      });
      if (serverRes.profile) return serverRes.profile;
    } catch {
      // Local copy was already persisted
    }
  }

  return localSaved;
}
