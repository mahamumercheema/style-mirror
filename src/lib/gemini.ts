import type {
  WardrobeItemWithDetails,
  OutfitRecommendationItem,
  RecommendOutfitResponse,
  UserProfile,
} from "@/types/wardrobe";
import {
  generateFallbackOutfitRecommendations,
  type StylingRequestPayload,
} from "./styling-fallback";

export { generateFallbackOutfitRecommendations, type StylingRequestPayload };

/**
 * Shared server-side Gemini AI Client with lazy dynamic import
 * Uses @google/genai SDK with User-Agent: aistudio-build as required
 */
export async function getGeminiClient(): Promise<import("@google/genai").GoogleGenAI | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Candidates in preference order. Start with ultra-fast gemini-3.1-flash-lite and gemini-3.8-flash
const MODEL_CANDIDATES = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];

/**
 * Timeout helper to prevent long hanging API calls while giving models adequate time
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
}

/**
 * Main AI Styling Engine: calls Google Gemini API with model cascade and structured JSON output
 */
export async function generateOutfitRecommendationsWithGemini(
  items: WardrobeItemWithDetails[],
  payload: StylingRequestPayload,
  userProfile?: UserProfile | null,
): Promise<RecommendOutfitResponse> {
  const gemini = await getGeminiClient();

  // If no Gemini API key or empty closet, gracefully fallback
  if (!gemini || items.length === 0) {
    return generateFallbackOutfitRecommendations(items, payload, userProfile);
  }

  const itemsSummary = items.map((it) => ({
    id: it.id,
    title: it.title,
    category: it.category?.name || "Apparel",
    color: it.primary_color || "Unspecified",
    season: it.season || "All Season",
  }));

  const systemPrompt = `You are "Style Mirror", an elite fashion stylist specializing in contemporary and South Asian/Ethnic traditional attire.
You curate outfit combinations strictly using items from the user's wardrobe inventory.

CRITICAL INSTRUCTIONS:
1. You MUST pick real item IDs from the provided wardrobe inventory for "selected_item_ids".
2. Provide exactly 2 distinct outfit options. Keep each description concise and punchy (1-2 sentences).
3. Include actionable advice for hair styling and makeup inspiration matching the chosen outfit.
4. Output must be strictly valid JSON matching the exact schema requested.`;

  const userPrompt = `USER STYLING REQUEST:
- Target Occasion: ${payload.occasionName || "Special Event"}
- Time of Day: ${payload.timeOfDay || "Evening"}
- Weather Season: ${payload.season || "All Season"}
- Vibe Preference: ${payload.vibePreference || "Luxury Sophistication"}
${payload.heroItemId ? `- Mandatory Hero Item to Style Around: Item ID "${payload.heroItemId}"` : ""}
${userProfile?.bodyType ? `- Body Silhouette: ${userProfile.bodyType} shape (Height: ${userProfile.height || "Average"})` : ""}
${userProfile?.preferences?.modestyPreference ? `- Modesty Preference: ${userProfile.preferences.modestyPreference}` : ""}
${userProfile?.body_type_notes ? `- User Fit & Silhouette Notes: "${userProfile.body_type_notes}"` : ""}

AVAILABLE WARDROBE INVENTORY:
${JSON.stringify(itemsSummary)}

Produce a JSON object with this exact shape:
{
  "recommendations": [
    {
      "option_name": "Option 1: [Creative Title]",
      "style_reasoning": "Crisp 1-2 sentence explanation of why this outfit works harmoniously",
      "selected_item_ids": ["item_id_1", "item_id_2"],
      "outfit_breakdown": {
        "top_or_full_body": "Title of garment",
        "bottom": "Title of bottom or null if full body",
        "footwear": "Title of footwear",
        "jewelry_and_accessories": ["Accessory 1"]
      },
      "styling_instructions": "Brief 1-sentence guidance on layering/tucking",
      "hair_style_recommendation": "Brief hair recommendation",
      "makeup_inspiration": "Brief makeup recommendation"
    }
  ]
}`;

  // Try model cascade with 15s timeout
  for (const model of MODEL_CANDIDATES) {
    try {
      const config: {
        systemInstruction: string;
        temperature: number;
        responseMimeType: string;
        thinkingConfig?: { thinkingLevel: string };
      } = {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        responseMimeType: "application/json",
      };

      if (model === "gemini-3.8-flash") {
        config.thinkingConfig = { thinkingLevel: "LOW" };
      }

      const response = await withTimeout(
        gemini.models.generateContent({
          model,
          contents: userPrompt,
          config,
        }),
        15000,
        `Model ${model}`,
      );

      const rawText = response.text?.trim() || "";
      if (!rawText) {
        continue;
      }

      const parsed = JSON.parse(rawText) as { recommendations?: OutfitRecommendationItem[] };
      if (
        parsed.recommendations &&
        Array.isArray(parsed.recommendations) &&
        parsed.recommendations.length > 0
      ) {
        return {
          recommendations: parsed.recommendations,
          fallbackUsed: false,
          message: `Curated live with Google Gemini (${model}).`,
        };
      }
    } catch (err: unknown) {
      const errMsg = String(err);
      console.info(`Model ${model} candidate trial status: ${errMsg}`);
      // Continue to next model candidate
    }
  }

  // If all models failed or capacity limited, seamlessly use local fashion director fallback
  console.info(
    "Gemini models temporarily at peak capacity; seamlessly curating via local wardrobe stylist.",
  );
  return generateFallbackOutfitRecommendations(items, payload, userProfile);
}
