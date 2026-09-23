import { useMemo } from "react";
import { Sparkles, Check, ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calculateColorHarmonies,
  type ColorHarmony,
  type HarmonyType,
  type GarmentColorTheme,
} from "@/lib/color-palette";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HarmoniesSuggesterProps {
  baseColorHex: string;
  activeHarmony: HarmonyType;
  onSelectHarmonyType: (type: HarmonyType) => void;
  garmentTheme: GarmentColorTheme;
  onUpdateGarmentTheme: (partial: Partial<GarmentColorTheme>) => void;
}

export function HarmoniesSuggester({
  baseColorHex,
  activeHarmony,
  onSelectHarmonyType,
  garmentTheme,
  onUpdateGarmentTheme,
}: HarmoniesSuggesterProps) {
  // Compute all harmonies dynamically whenever the base fabric color changes
  const harmonies = useMemo(() => {
    return calculateColorHarmonies(baseColorHex);
  }, [baseColorHex]);

  const activeHarmonyData: ColorHarmony = harmonies[activeHarmony];

  const handleApplyHarmony = (harmony: ColorHarmony) => {
    onUpdateGarmentTheme({
      mainBody: harmony.presetApplication.mainBody,
      trims: harmony.presetApplication.trims,
      buttons: harmony.presetApplication.buttons,
      stitching: harmony.presetApplication.stitching,
    });
    toast.success(`Applied ${harmony.title} palette to garment!`);
  };

  const harmonyTabs: Array<{ id: HarmonyType; label: string; badge: string }> = [
    { id: "complementary", label: "Complementary", badge: "180° Contrast" },
    { id: "triadic", label: "Triadic", badge: "120° Balance" },
    { id: "analogous", label: "Analogous", badge: "±30° Organic" },
    { id: "splitComplementary", label: "Split-Comp", badge: "Nuanced" },
    { id: "monochromatic", label: "Monochrome", badge: "Tonal" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Harmonic Color Engine</span>
          </div>
          <h4 className="font-display text-lg">Dynamically Suggested Harmonies</h4>
          <p className="text-xs text-muted-foreground">
            Calculated from base fabric color:{" "}
            <strong className="text-foreground font-semibold">
              {activeHarmonyData.baseColor.name} ({baseColorHex})
            </strong>
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => handleApplyHarmony(activeHarmonyData)}
          className="gap-1.5 text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs self-start sm:self-auto"
        >
          <Wand2 className="size-3.5" />
          <span>Apply Active Scheme to Garment</span>
        </Button>
      </div>

      {/* Harmony Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/70 text-xs">
        {harmonyTabs.map((tab) => {
          const isSelected = activeHarmony === tab.id;
          const harm = harmonies[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectHarmonyType(tab.id)}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-left font-medium transition-all shrink-0 cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <div className="flex -space-x-1 shrink-0">
                {harm.colors.slice(0, 3).map((col, idx) => (
                  <div
                    key={idx}
                    className="size-3.5 rounded-full border border-background shadow-2xs"
                    style={{ backgroundColor: col.hex }}
                  />
                ))}
              </div>
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                  isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Selected Harmony Detail Panel */}
      <div className="surface p-4 space-y-4 rounded-xl border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h5 className="font-display text-base font-semibold text-foreground">
              {activeHarmonyData.title}
            </h5>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
              {activeHarmonyData.description}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleApplyHarmony(activeHarmonyData)}
            className="text-xs gap-1.5 cursor-pointer shrink-0 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Check className="size-3.5" />
            <span>Apply to All Parts</span>
          </Button>
        </div>

        {/* Dynamic Palette Swatches with Direct Target Mapping */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Main Body */}
          <div className="rounded-lg border border-border bg-secondary/30 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">Main Body Fabric</span>
              <span className="text-[10px] text-muted-foreground">Base Hue</span>
            </div>
            <div
              className="aspect-2/1 w-full rounded-md shadow-inner flex items-center justify-center text-white"
              style={{ backgroundColor: activeHarmonyData.presetApplication.mainBody }}
            >
              {garmentTheme.mainBody.toLowerCase() ===
                activeHarmonyData.presetApplication.mainBody.toLowerCase() && (
                <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] backdrop-blur-xs flex items-center gap-1">
                  <Check className="size-3" /> Active
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground flex justify-between font-mono">
              <span className="truncate">{activeHarmonyData.baseColor.name}</span>
              <span>{activeHarmonyData.presetApplication.mainBody}</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                onUpdateGarmentTheme({ mainBody: activeHarmonyData.presetApplication.mainBody })
              }
              className="w-full text-[10px] h-6 cursor-pointer"
            >
              Set Body Color
            </Button>
          </div>

          {/* Trims */}
          <div className="rounded-lg border border-border bg-secondary/30 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">Trims & Collar</span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                {activeHarmony === "complementary" ? "180°" : "Harmony"}
              </span>
            </div>
            <div
              className="aspect-2/1 w-full rounded-md shadow-inner flex items-center justify-center text-white"
              style={{ backgroundColor: activeHarmonyData.presetApplication.trims }}
            >
              {garmentTheme.trims.toLowerCase() ===
                activeHarmonyData.presetApplication.trims.toLowerCase() && (
                <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] backdrop-blur-xs flex items-center gap-1">
                  <Check className="size-3" /> Active
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground flex justify-between font-mono">
              <span className="truncate">
                {activeHarmonyData.colors[1]?.name || "Harmonic Accent"}
              </span>
              <span>{activeHarmonyData.presetApplication.trims}</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                onUpdateGarmentTheme({ trims: activeHarmonyData.presetApplication.trims })
              }
              className="w-full text-[10px] h-6 cursor-pointer"
            >
              Set Trims Color
            </Button>
          </div>

          {/* Buttons */}
          <div className="rounded-lg border border-border bg-secondary/30 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">Buttons & Hardware</span>
              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-mono">Deep</span>
            </div>
            <div
              className="aspect-2/1 w-full rounded-md shadow-inner flex items-center justify-center text-white"
              style={{ backgroundColor: activeHarmonyData.presetApplication.buttons }}
            >
              {garmentTheme.buttons.toLowerCase() ===
                activeHarmonyData.presetApplication.buttons.toLowerCase() && (
                <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] backdrop-blur-xs flex items-center gap-1">
                  <Check className="size-3" /> Active
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground flex justify-between font-mono">
              <span className="truncate">
                {activeHarmonyData.colors[2]?.name || "Contrast Deep"}
              </span>
              <span>{activeHarmonyData.presetApplication.buttons}</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                onUpdateGarmentTheme({ buttons: activeHarmonyData.presetApplication.buttons })
              }
              className="w-full text-[10px] h-6 cursor-pointer"
            >
              Set Buttons Color
            </Button>
          </div>

          {/* Stitching */}
          <div className="rounded-lg border border-border bg-secondary/30 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-foreground">Top-Stitching Thread</span>
              <span className="text-[10px] text-purple-700 dark:text-purple-400 font-mono">
                Seams
              </span>
            </div>
            <div
              className="aspect-2/1 w-full rounded-md shadow-inner flex items-center justify-center text-white"
              style={{ backgroundColor: activeHarmonyData.presetApplication.stitching }}
            >
              {garmentTheme.stitching.toLowerCase() ===
                activeHarmonyData.presetApplication.stitching.toLowerCase() && (
                <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] backdrop-blur-xs flex items-center gap-1">
                  <Check className="size-3" /> Active
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground flex justify-between font-mono">
              <span className="truncate">
                {activeHarmonyData.colors[3]?.name || "Thread Highlight"}
              </span>
              <span>{activeHarmonyData.presetApplication.stitching}</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                onUpdateGarmentTheme({ stitching: activeHarmonyData.presetApplication.stitching })
              }
              className="w-full text-[10px] h-6 cursor-pointer"
            >
              Set Thread Color
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
