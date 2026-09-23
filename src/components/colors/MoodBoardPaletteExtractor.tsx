import { useState, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Wand2,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  extractColorPaletteFromImage,
  CURATED_MOOD_BOARDS,
  type ExtractedColor,
  type GarmentColorTheme,
} from "@/lib/color-palette";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MoodBoardPaletteExtractorProps {
  extractedPalette: ExtractedColor[];
  onPaletteExtracted: (palette: ExtractedColor[]) => void;
  baseColorHex: string;
  onSelectBaseColor: (hex: string) => void;
  garmentTheme: GarmentColorTheme;
  onUpdateGarmentTheme: (partial: Partial<GarmentColorTheme>) => void;
  userPhotoUrl?: string | null;
  garmentPhotoUrl?: string | null;
}

export function MoodBoardPaletteExtractor({
  extractedPalette,
  onPaletteExtracted,
  baseColorHex,
  onSelectBaseColor,
  garmentTheme,
  onUpdateGarmentTheme,
  userPhotoUrl,
  garmentPhotoUrl,
}: MoodBoardPaletteExtractorProps) {
  const [currentMoodBoardImage, setCurrentMoodBoardImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Process mood board image to extract colors
  const processImage = async (imageSrc: string, label = "Mood board") => {
    setIsExtracting(true);
    setCurrentMoodBoardImage(imageSrc);
    try {
      const palette = await extractColorPaletteFromImage(imageSrc, 8);
      onPaletteExtracted(palette);
      if (palette[0]) {
        onSelectBaseColor(palette[0].hex);
      }
      toast.success(`Extracted dynamic palette from ${label}!`);
    } catch {
      toast.error("Failed to extract colors from image.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        processImage(result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  // 1-Click Auto-Harmonize Garment using extracted palette
  const handleAutoApplyMoodBoard = () => {
    if (extractedPalette.length < 2) return;

    // Pick best suited tones from the palette
    const bodyColor = extractedPalette[0]?.hex || baseColorHex;
    // Find highest contrast for trims
    const trimCandidate =
      extractedPalette[1]?.hex ||
      (extractedPalette.length > 2 ? extractedPalette[2]?.hex : bodyColor);
    // Find dark grounding tone for buttons
    const darkCandidate =
      extractedPalette.find((c) => c.isDark && c.hex !== bodyColor)?.hex ||
      extractedPalette[extractedPalette.length - 1]?.hex ||
      "#222222";
    // Find light or accent tone for stitching
    const stitchCandidate =
      extractedPalette.find((c) => !c.isDark && c.hex !== bodyColor)?.hex ||
      extractedPalette[2]?.hex ||
      "#ffffff";

    onUpdateGarmentTheme({
      mainBody: bodyColor,
      trims: trimCandidate || bodyColor,
      buttons: darkCandidate,
      stitching: stitchCandidate,
    });

    toast.success("Applied mood board palette to Main Body, Trims, Buttons & Stitching!");
  };

  return (
    <div className="space-y-5">
      {/* Header & Upload Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Automatic Color Extraction</span>
          </div>
          <h3 className="font-display text-xl">Mood Board & Photo Palette</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload an inspiration photo or mood board to instantly derive couture color schemes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting}
            className="text-xs gap-1.5 cursor-pointer shadow-2xs"
          >
            <Upload className="size-3.5" />
            <span>Upload Mood Board</span>
          </Button>

          {userPhotoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => processImage(userPhotoUrl, "Your Body Photo")}
              disabled={isExtracting}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <ImageIcon className="size-3.5 text-primary" />
              <span>From My Photo</span>
            </Button>
          )}

          {garmentPhotoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => processImage(garmentPhotoUrl, "Garment Image")}
              disabled={isExtracting}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <Layers className="size-3.5 text-primary" />
              <span>From Garment</span>
            </Button>
          )}
        </div>
      </div>

      {/* Curated Editorial Inspiration Quick-Pills */}
      <div className="space-y-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Curated Editorial Mood Boards:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CURATED_MOOD_BOARDS.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => processImage(board.previewUrl, board.title)}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-lg border border-border/80 p-2 text-left transition-all hover:border-primary hover:shadow-xs cursor-pointer bg-card",
                currentMoodBoardImage === board.previewUrl &&
                  "border-primary ring-2 ring-primary/20",
              )}
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                <img
                  src={board.previewUrl}
                  alt={board.title}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Embedded palette preview stripe */}
                <div className="absolute inset-x-0 bottom-0 flex h-2">
                  {board.colors.slice(0, 5).map((color, cIdx) => (
                    <div key={cIdx} className="flex-1" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <span className="mt-1.5 font-medium text-xs text-foreground truncate">
                {board.title}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">{board.tagline}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Extracted Swatches Display */}
      <div className="rounded-xl border border-border/80 bg-secondary/20 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              Extracted Dynamic Palette ({extractedPalette.length} Hues)
            </span>
            <span className="text-[10px] text-muted-foreground">
              Click swatch to set base fabric, or assign to parts
            </span>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleAutoApplyMoodBoard}
            className="text-xs h-7 gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            <Wand2 className="size-3" />
            <span>Auto-Harmonize Garment</span>
          </Button>
        </div>

        {/* Swatches Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {extractedPalette.map((color, idx) => {
            const isBase = baseColorHex.toLowerCase() === color.hex.toLowerCase();
            const isBody = garmentTheme.mainBody.toLowerCase() === color.hex.toLowerCase();
            const isTrims = garmentTheme.trims.toLowerCase() === color.hex.toLowerCase();
            const isButtons = garmentTheme.buttons.toLowerCase() === color.hex.toLowerCase();
            const isStitch = garmentTheme.stitching.toLowerCase() === color.hex.toLowerCase();

            return (
              <div
                key={`${color.hex}-${idx}`}
                className={cn(
                  "group relative flex flex-col rounded-lg border border-border bg-card p-2 text-left transition-all hover:border-primary hover:shadow-xs",
                  isBase && "ring-2 ring-primary border-primary",
                )}
              >
                {/* Color Swatch Block */}
                <button
                  type="button"
                  onClick={() => onSelectBaseColor(color.hex)}
                  className="relative aspect-4/3 w-full rounded-md shadow-inner transition-transform group-hover:scale-98 cursor-pointer flex items-center justify-center"
                  style={{ backgroundColor: color.hex }}
                  title="Set as base fabric color"
                >
                  {isBase && (
                    <span className="rounded-full bg-black/40 p-1 text-white backdrop-blur-xs">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  )}
                </button>

                {/* Swatch Information */}
                <div className="mt-1.5 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground truncate">{color.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase truncate">
                    {color.hex}
                  </p>
                </div>

                {/* Active Assignments Badges */}
                <div className="mt-1 flex flex-wrap gap-1 min-h-[14px]">
                  {isBody && (
                    <span className="text-[9px] font-medium px-1 rounded bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                      Body
                    </span>
                  )}
                  {isTrims && (
                    <span className="text-[9px] font-medium px-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      Trims
                    </span>
                  )}
                  {isButtons && (
                    <span className="text-[9px] font-medium px-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                      Btns
                    </span>
                  )}
                  {isStitch && (
                    <span className="text-[9px] font-medium px-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">
                      Stitch
                    </span>
                  )}
                </div>

                {/* Quick Assign Buttons on Hover */}
                <div className="mt-2 grid grid-cols-4 gap-0.5 pt-1 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => onUpdateGarmentTheme({ mainBody: color.hex })}
                    title="Apply to Main Body"
                    className="text-[9px] py-0.5 rounded text-center hover:bg-primary hover:text-primary-foreground font-medium text-muted-foreground transition-colors cursor-pointer"
                  >
                    Body
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateGarmentTheme({ trims: color.hex })}
                    title="Apply to Trims"
                    className="text-[9px] py-0.5 rounded text-center hover:bg-primary hover:text-primary-foreground font-medium text-muted-foreground transition-colors cursor-pointer"
                  >
                    Trim
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateGarmentTheme({ buttons: color.hex })}
                    title="Apply to Buttons"
                    className="text-[9px] py-0.5 rounded text-center hover:bg-primary hover:text-primary-foreground font-medium text-muted-foreground transition-colors cursor-pointer"
                  >
                    Btn
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateGarmentTheme({ stitching: color.hex })}
                    title="Apply to Stitching"
                    className="text-[9px] py-0.5 rounded text-center hover:bg-primary hover:text-primary-foreground font-medium text-muted-foreground transition-colors cursor-pointer"
                  >
                    Stitch
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
