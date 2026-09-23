import { useState } from "react";
import {
  Palette,
  Sparkles,
  Layers,
  Wand2,
  CheckCircle2,
  SlidersHorizontal,
  Shirt,
  Eye,
} from "lucide-react";
import { ColorWheel } from "@/components/colors/ColorWheel";
import { MoodBoardPaletteExtractor } from "@/components/colors/MoodBoardPaletteExtractor";
import { HarmoniesSuggester } from "@/components/colors/HarmoniesSuggester";
import { GarmentColorCustomizer } from "@/components/colors/GarmentColorCustomizer";
import { Button } from "@/components/ui/button";
import {
  type ExtractedColor,
  type GarmentColorTheme,
  type HarmonyType,
  FALLBACK_MOOD_BOARD_PALETTE,
} from "@/lib/color-palette";
import { cn } from "@/lib/utils";

interface ColorStudioPanelProps {
  userPhotoUrl?: string | null;
  garmentPhotoUrl?: string | null;
  garmentTitle?: string;
  theme: GarmentColorTheme;
  onThemeChange: (theme: GarmentColorTheme) => void;
  extractedPalette: ExtractedColor[];
  onPaletteExtracted: (palette: ExtractedColor[]) => void;
  baseColorHex: string;
  onBaseColorChange: (hex: string) => void;
  onCustomGarmentGenerated?: (dataUrl: string) => void;
  onApplyAndClose?: () => void;
}

export function ColorStudioPanel({
  userPhotoUrl,
  garmentPhotoUrl,
  garmentTitle = "Tailored Garment",
  theme,
  onThemeChange,
  extractedPalette,
  onPaletteExtracted,
  baseColorHex,
  onBaseColorChange,
  onCustomGarmentGenerated,
  onApplyAndClose,
}: ColorStudioPanelProps) {
  const [activeHarmonyType, setActiveHarmonyType] = useState<HarmonyType>("complementary");
  const [activeTab, setActiveTab] = useState<"customizer" | "harmonies" | "moodboard">(
    "customizer",
  );

  return (
    <div className="surface p-6 space-y-6 border-primary/20 shadow-md">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Palette className="size-4 text-amber-500" />
            <span>Interactive Color Wheel & Harmony Studio</span>
          </div>
          <h2 className="mt-1 font-display text-2xl md:text-3xl">
            Garment Palette & Bespoke Details
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Extract color wheels from mood boards or photos, explore complementary, triadic, and
            analogous harmonies, and assign distinct hues directly to the garment’s main body,
            trims, buttons, and stitching.
          </p>
        </div>

        {onApplyAndClose && (
          <Button
            type="button"
            onClick={onApplyAndClose}
            className="gap-2 shrink-0 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <CheckCircle2 className="size-4" />
            <span>Apply to Fitting Room</span>
          </Button>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("customizer")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-medium transition-all cursor-pointer",
            activeTab === "customizer"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <Shirt className="size-3.5" />
          <span>Garment Channels (Body, Trims, Buttons, Stitching)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("harmonies")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-medium transition-all cursor-pointer",
            activeTab === "harmonies"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <Sparkles className="size-3.5 text-amber-500" />
          <span>Color Wheel & Harmonies (Complementary / Triadic / Analogous)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("moodboard")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-medium transition-all cursor-pointer",
            activeTab === "moodboard"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <Wand2 className="size-3.5" />
          <span>Mood Board & Image Extraction</span>
        </button>
      </div>

      {/* TAB 1: GARMENT CHANNELS CUSTOMIZER */}
      {activeTab === "customizer" && (
        <div className="space-y-6">
          <GarmentColorCustomizer
            theme={theme}
            onChange={onThemeChange}
            extractedPalette={extractedPalette}
            onGenerateCustomGarmentUrl={onCustomGarmentGenerated}
          />

          {/* Quick Harmonies Strip below customizer */}
          <div className="surface p-4 rounded-xl border border-border/80 bg-secondary/15 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Quick Harmony Presets for Base ({baseColorHex}):</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("harmonies")}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Open Full Color Wheel →
              </button>
            </div>
            <HarmoniesSuggester
              baseColorHex={baseColorHex}
              activeHarmony={activeHarmonyType}
              onSelectHarmonyType={setActiveHarmonyType}
              garmentTheme={theme}
              onUpdateGarmentTheme={(partial) => onThemeChange({ ...theme, ...partial })}
            />
          </div>
        </div>
      )}

      {/* TAB 2: COLOR WHEEL & HARMONIES */}
      {activeTab === "harmonies" && (
        <div className="space-y-6">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr] items-start">
            {/* Color Wheel Controller */}
            <div className="surface p-5 flex flex-col items-center rounded-xl border border-border/80 bg-card">
              <div className="w-full flex items-center justify-between mb-4 pb-2 border-b border-border/60">
                <span className="text-xs font-semibold text-foreground">
                  Interactive 360° Wheel
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {activeHarmonyType} Mode
                </span>
              </div>

              <ColorWheel
                baseColorHex={baseColorHex}
                onBaseColorChange={(newHex) => {
                  onBaseColorChange(newHex);
                  // Keep main body in sync with picked base fabric
                  onThemeChange({ ...theme, mainBody: newHex });
                }}
                extractedColors={extractedPalette}
                activeHarmony={activeHarmonyType}
                size={260}
              />

              <p className="mt-4 text-[11px] text-center text-muted-foreground leading-normal px-2">
                Click or drag across the wheel to explore hues. Harmonic geometry automatically
                updates with angle markers.
              </p>
            </div>

            {/* Dynamic Harmonies Explanations & Swatch Cards */}
            <div className="space-y-6">
              <HarmoniesSuggester
                baseColorHex={baseColorHex}
                activeHarmony={activeHarmonyType}
                onSelectHarmonyType={setActiveHarmonyType}
                garmentTheme={theme}
                onUpdateGarmentTheme={(partial) => onThemeChange({ ...theme, ...partial })}
              />

              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Direct Channel Assignment Summary:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("customizer")}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    View Garment Blueprint →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-border bg-secondary/30 flex items-center gap-2">
                    <div
                      className="size-5 rounded-md border border-black/10 shrink-0"
                      style={{ backgroundColor: theme.mainBody }}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">Main Body</p>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase">
                        {theme.mainBody}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-secondary/30 flex items-center gap-2">
                    <div
                      className="size-5 rounded-md border border-black/10 shrink-0"
                      style={{ backgroundColor: theme.trims }}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">Trims</p>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase">
                        {theme.trims}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-secondary/30 flex items-center gap-2">
                    <div
                      className="size-5 rounded-md border border-black/10 shrink-0"
                      style={{ backgroundColor: theme.buttons }}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">Buttons</p>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase">
                        {theme.buttons}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-secondary/30 flex items-center gap-2">
                    <div
                      className="size-5 rounded-md border border-black/10 shrink-0"
                      style={{ backgroundColor: theme.stitching }}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">Stitching</p>
                      <p className="text-[9px] font-mono text-muted-foreground uppercase">
                        {theme.stitching}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MOOD BOARD & PHOTO EXTRACTION */}
      {activeTab === "moodboard" && (
        <div className="space-y-6">
          <MoodBoardPaletteExtractor
            extractedPalette={extractedPalette}
            onPaletteExtracted={onPaletteExtracted}
            baseColorHex={baseColorHex}
            onSelectBaseColor={(newBase) => {
              onBaseColorChange(newBase);
              onThemeChange({ ...theme, mainBody: newBase });
            }}
            garmentTheme={theme}
            onUpdateGarmentTheme={(partial) => onThemeChange({ ...theme, ...partial })}
            userPhotoUrl={userPhotoUrl}
            garmentPhotoUrl={garmentPhotoUrl}
          />
        </div>
      )}
    </div>
  );
}
