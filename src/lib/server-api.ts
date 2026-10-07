import {
  handleRegisterIntent,
  handleVerifyCode,
  handleResendCode,
  handleRequestEmailOtp,
  handleVerifyEmailOtp,
  verifySessionToken,
  type AuthResult,
} from "./server-auth";
import {
  getStoredWardrobeItems,
  saveWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem,
  toggleFavoriteWardrobeItem,
  getUserProfile,
  saveUserProfile,
  DEFAULT_CATEGORIES,
  DEFAULT_OCCASIONS,
} from "./wardrobe-service";
import {
  generateOutfitRecommendationsWithGemini,
  generateFallbackOutfitRecommendations,
} from "./gemini";
import type {
  CreateWardrobeItemInput,
  UpdateWardrobeItemInput,
  UserProfile,
  WardrobeFilterOptions,
  WardrobeItemWithDetails,
} from "@/types/wardrobe";

export async function handleApiRouter(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Auth Endpoints
  if (pathname.startsWith("/api/auth/")) {
    let body: Record<string, unknown> = {};
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }
    }

    let result: AuthResult;

    switch (pathname) {
      case "/api/auth/register":
      case "/api/auth/register-intent":
        result = await handleRegisterIntent(body);
        break;
      case "/api/auth/verify-code":
        result = await handleVerifyCode(body);
        break;
      case "/api/auth/resend-code":
        result = await handleResendCode(body);
        break;
      case "/api/auth/login":
        // Password sign-in was removed: accounts use Google or an emailed code
        result = {
          status: 410,
          body: {
            success: false,
            error: "Password sign-in is no longer available. Use Google or an email code.",
          },
        };
        break;
      case "/api/auth/request-otp":
      case "/api/auth/login-2fa":
        result = await handleRequestEmailOtp(body);
        break;
      case "/api/auth/verify-otp":
      case "/api/auth/verify-2fa":
        result = await handleVerifyEmailOtp(body);
        break;
      default:
        return new Response(JSON.stringify({ error: "Auth endpoint not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Authentication Verification for Protected Endpoints
  const authHeader = request.headers.get("authorization");
  const authSession = verifySessionToken(authHeader);

  // Protected endpoints require valid session
  if (
    pathname === "/api/user/profile" ||
    pathname === "/api/wardrobe" ||
    pathname.startsWith("/api/wardrobe/") ||
    pathname === "/api/recommend-outfit"
  ) {
    if (!authSession) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Unauthorized: Active session token required. Please log in to access this feature.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  const activeUserId = authSession?.userId || "guest_user";

  // User Profile Endpoints (/api/user/profile)
  if (pathname === "/api/user/profile") {
    if (request.method === "GET") {
      const profile = getUserProfile(activeUserId);
      return new Response(JSON.stringify({ success: true, profile }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST" || request.method === "PATCH") {
      try {
        const { userId, ...profileData } = (await request.json()) as Partial<UserProfile> & {
          userId?: string;
        };
        const targetUserId = userId || activeUserId;
        const updated = saveUserProfile(targetUserId, profileData);
        return new Response(JSON.stringify({ success: true, profile: updated }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Profile update error:", err);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update user profile" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }
  }

  // 2. Wardrobe CRUD Endpoints (/api/wardrobe)
  if (pathname === "/api/wardrobe" || pathname.startsWith("/api/wardrobe/")) {
    const itemIdFromPath = pathname.replace("/api/wardrobe", "").replace(/^\//, "");

    // GET /api/wardrobe
    if (request.method === "GET") {
      try {
        const categoryId = url.searchParams.get("category_id");
        const parentType = url.searchParams.get("parent_type");
        const occasionId = url.searchParams.get("occasion_id");
        const season = url.searchParams.get("season");
        const isFavorite = url.searchParams.get("is_favorite");
        const searchQuery = url.searchParams.get("q") || url.searchParams.get("search");

        const filters: WardrobeFilterOptions = {
          category_id: categoryId ? parseInt(categoryId, 10) : undefined,
          parent_type: parentType || undefined,
          occasion_id: occasionId ? parseInt(occasionId, 10) : undefined,
          season: season || undefined,
          is_favorite: isFavorite === "true" ? true : undefined,
          search_query: searchQuery || undefined,
        };

        const items = getStoredWardrobeItems(activeUserId, filters);

        return new Response(
          JSON.stringify({
            success: true,
            count: items.length,
            items,
            categories: DEFAULT_CATEGORIES,
            occasions: DEFAULT_OCCASIONS,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } catch (err) {
        console.error("GET /api/wardrobe error:", err);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to fetch wardrobe items",
            items: getStoredWardrobeItems("default_user"),
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // POST /api/wardrobe
    if (request.method === "POST") {
      try {
        const body = (await request.json()) as CreateWardrobeItemInput & { userId?: string };
        const targetUserId = body.userId || activeUserId;

        if (!body.image_url) {
          return new Response(JSON.stringify({ success: false, error: "image_url is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const createdItem = saveWardrobeItem(targetUserId, {
          title: body.title,
          category_id: body.category_id,
          image_url: body.image_url,
          thumbnail_url: body.thumbnail_url || body.image_url,
          primary_color: body.primary_color,
          secondary_color: body.secondary_color,
          fabric_type: body.fabric_type,
          season: body.season,
          is_favorite: body.is_favorite || false,
          occasion_ids: body.occasion_ids,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Wardrobe item created successfully",
            item: createdItem,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      } catch (err) {
        console.error("POST /api/wardrobe error:", err);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create wardrobe item" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // PATCH /api/wardrobe or PATCH /api/wardrobe/[id]
    if (request.method === "PATCH") {
      try {
        const body = (await request.json()) as UpdateWardrobeItemInput & {
          id?: string;
          toggle_favorite?: boolean;
          userId?: string;
        };
        const itemId = itemIdFromPath || body.id || url.searchParams.get("id");
        const targetUserId = body.userId || activeUserId;

        if (!itemId) {
          return new Response(
            JSON.stringify({ success: false, error: "Item ID is required for update" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        if (body.toggle_favorite) {
          const newFav = toggleFavoriteWardrobeItem(targetUserId, itemId);
          return new Response(JSON.stringify({ success: true, is_favorite: newFav }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const updated = updateWardrobeItem(targetUserId, itemId, body);
        if (!updated) {
          return new Response(JSON.stringify({ success: false, error: "Item not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: "Item updated", item: updated }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      } catch (err) {
        console.error("PATCH /api/wardrobe error:", err);
        return new Response(JSON.stringify({ success: false, error: "Failed to update item" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // DELETE /api/wardrobe or DELETE /api/wardrobe/[id]
    if (request.method === "DELETE") {
      try {
        let itemId = itemIdFromPath || url.searchParams.get("id");
        if (!itemId) {
          try {
            const body = (await request.json()) as { id?: string };
            itemId = body.id || "";
          } catch {
            // body empty
          }
        }

        if (!itemId) {
          return new Response(
            JSON.stringify({ success: false, error: "Item ID is required for deletion" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        deleteWardrobeItem(activeUserId, itemId);
        return new Response(
          JSON.stringify({ success: true, message: "Item deleted successfully" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      } catch (err) {
        console.error("DELETE /api/wardrobe error:", err);
        return new Response(JSON.stringify({ success: false, error: "Failed to delete item" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  // 3. AI Outfit Styling Engine (POST /api/recommend-outfit)
  if (pathname === "/api/recommend-outfit") {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = (await request.json()) as {
        occasionId?: number | string;
        occasionName?: string;
        timeOfDay?: string;
        season?: string;
        vibePreference?: string;
        heroItemId?: string;
        userId?: string;
        items?: WardrobeItemWithDetails[];
      };

      const targetUserId = body.userId || activeUserId;
      const userProfile = getUserProfile(targetUserId);
      const items =
        Array.isArray(body.items) && body.items.length > 0
          ? body.items
          : getStoredWardrobeItems(targetUserId);

      // Resolve occasion name if id is given
      let resolvedOccasion = body.occasionName;
      if (!resolvedOccasion && body.occasionId) {
        const occ = DEFAULT_OCCASIONS.find((o) => String(o.id) === String(body.occasionId));
        if (occ) resolvedOccasion = occ.name;
      }

      const result = await generateOutfitRecommendationsWithGemini(
        items,
        {
          occasionId: body.occasionId,
          occasionName: resolvedOccasion,
          timeOfDay: body.timeOfDay,
          season: body.season,
          vibePreference: body.vibePreference,
          heroItemId: body.heroItemId,
          userId: targetUserId,
        },
        userProfile,
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.warn("POST /api/recommend-outfit exception, serving fallback:", err);
      // Resilient fallback
      const fallbackItems =
        (request as unknown as { _savedItems?: WardrobeItemWithDetails[] })._savedItems ||
        getStoredWardrobeItems(activeUserId);
      const fallbackResult = generateFallbackOutfitRecommendations(fallbackItems, {}, null);
      return new Response(JSON.stringify(fallbackResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return null;
}
