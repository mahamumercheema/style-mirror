import { useState, useRef, useEffect, useCallback } from "react";
import {
  Shirt,
  Spool,
  Layers,
  CircleDot,
  Pipette,
  Check,
  RotateCcw,
  Download,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  type ExtractedColor,
  type GarmentColorTheme,
  getFashionColorName,
} from "@/lib/color-palette";
import { cn } from "@/lib/utils";

export type GarmentSilhouette = "pants" | "coat" | "shirt";

/** Selector order; Pants is the default */
const SILHOUETTES: Array<{ id: GarmentSilhouette; label: string }> = [
  { id: "pants", label: "Pants" },
  { id: "coat", label: "Coat" },
  { id: "shirt", label: "Shirt" },
];

type Channel = "mainBody" | "trims" | "buttons" | "stitching";

/** What each colour channel covers on each garment */
const CHANNEL_DESCRIPTIONS: Record<GarmentSilhouette, Record<Channel, string>> = {
  pants: {
    mainBody: "Primary fabric: legs & seat",
    trims: "Waistband, belt loops, pocket welts & turn-ups",
    buttons: "Waist button & pocket rivets",
    stitching: "Fly, side seams & hem stitching",
  },
  coat: {
    mainBody: "Primary fabric: body & sleeves",
    trims: "Trench lapels & waist belt",
    buttons: "Double-breasted buttons & buckle",
    stitching: "Belt seams & hem stitching",
  },
  shirt: {
    mainBody: "Primary fabric: body & sleeves",
    trims: "Collar band, placket & cuffs",
    buttons: "Placket buttons",
    stitching: "Placket & collar top-stitching",
  },
};

const RENDER_WIDTH = 800;
const RENDER_HEIGHT = 960;

interface GarmentColorCustomizerProps {
  theme: GarmentColorTheme;
  onChange: (newTheme: GarmentColorTheme) => void;
  extractedPalette: ExtractedColor[];
  onGenerateCustomGarmentUrl?: ((dataUrl: string) => void) | undefined;
  className?: string | undefined;
}

export function GarmentColorCustomizer({
  theme,
  onChange,
  extractedPalette,
  onGenerateCustomGarmentUrl,
  className,
}: GarmentColorCustomizerProps) {
  const [activeChannel, setActiveChannel] = useState<Channel>("mainBody");
  const [silhouette, setSilhouette] = useState<GarmentSilhouette>("pants");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  /** Ignores a slower, older render that finishes after a newer one */
  const renderVersion = useRef(0);

  // Rasterises the blueprint preview into a transparent PNG of the garment with its colors,
  // so the try-on image always matches what's shown
  const renderGarmentToDataUrl = useCallback(() => {
    const canvas = canvasRef.current;
    const svg = svgRef.current;
    if (!canvas || !svg) return;
    const version = ++renderVersion.current;
    const image = new Image();
    image.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx || version !== renderVersion.current) return;
      canvas.width = RENDER_WIDTH;
      canvas.height = RENDER_HEIGHT;
      ctx.clearRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
      ctx.drawImage(image, 0, 0, RENDER_WIDTH, RENDER_HEIGHT);
      onGenerateCustomGarmentUrl?.(canvas.toDataURL("image/png"));
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      new XMLSerializer().serializeToString(svg),
    )}`;
  }, [onGenerateCustomGarmentUrl]);

  // Re-render whenever colors or silhouette change
  useEffect(() => {
    renderGarmentToDataUrl();
  }, [renderGarmentToDataUrl, theme, silhouette]);

  const descriptions = CHANNEL_DESCRIPTIONS[silhouette];
  const channels: Array<{
    id: Channel;
    label: string;
    description: string;
    currentColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "mainBody",
      label: "Main Body",
      description: descriptions.mainBody,
      currentColor: theme.mainBody,
      icon: Shirt,
    },
    {
      id: "trims",
      label: "Trims & Accents",
      description: descriptions.trims,
      currentColor: theme.trims,
      icon: Layers,
    },
    {
      id: "buttons",
      label: "Buttons & Hardware",
      description: descriptions.buttons,
      currentColor: theme.buttons,
      icon: CircleDot,
    },
    {
      id: "stitching",
      label: "Top-Stitching",
      description: descriptions.stitching,
      currentColor: theme.stitching,
      icon: Spool,
    },
  ];

  const handleColorUpdate = (colorHex: string) => {
    onChange({
      ...theme,
      [activeChannel]: colorHex,
    });
  };

  const handleUploadGarmentImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setUploadedImage(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className={cn("surface p-5 space-y-6", className)}>
      {/* Hidden offscreen rendering canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header & Silhouette Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cobalt-text">
            <Layers className="size-3.5" />
            <span>Garment Color Customizer</span>
          </div>
          <h3 className="font-display text-xl">Color Allocation & Blueprint</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Apply colors directly to the main body, trims, buttons, and stitching.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Garment"
          className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-lg"
        >
          {SILHOUETTES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={silhouette === id}
              onClick={() => setSilhouette(id)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border font-medium transition-all cursor-pointer",
                silhouette === id
                  ? "border-cobalt-border text-cobalt-text"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Interactive Garment Canvas Preview & Target Channel Controls */}
      <div className="grid gap-6 md:grid-cols-[1fr_1.15fr] items-start">
        {/* Visual Garment Blueprint Canvas Render */}
        <div className="space-y-3">
          <div className="checkerboard relative aspect-5/6 w-full overflow-hidden rounded-md border border-border/80 p-4 flex items-center justify-center">
            {/* Visual SVG representation for instant responsive layout */}
            {uploadedImage && (
              <img
                src={uploadedImage}
                alt="Uploaded garment"
                className="max-h-[360px] w-auto object-contain"
              />
            )}
            <svg
              ref={svgRef}
              className={cn(
                "size-full max-h-[360px] filter drop-shadow-md",
                uploadedImage && "hidden",
              )}
              viewBox={`0 0 ${RENDER_WIDTH} ${RENDER_HEIGHT}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {silhouette === "pants" && (
                <>
                  {/* Legs & seat */}
                  <path
                    d="M255 160 L545 160 L580 880 L425 880 L400 340 L375 880 L220 880 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  {/* Waistband */}
                  <rect
                    x="250"
                    y="110"
                    width="300"
                    height="50"
                    rx="4"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                  {/* Belt loops */}
                  {[285, 360, 426, 501].map((x) => (
                    <rect
                      key={x}
                      x={x}
                      y="104"
                      width="14"
                      height="62"
                      rx="2"
                      fill={theme.trims}
                      stroke="rgba(0,0,0,0.25)"
                      strokeWidth="2"
                    />
                  ))}
                  {/* Slanted front pocket welts */}
                  <path
                    d="M262 172 Q288 238 338 166 M538 172 Q512 238 462 166"
                    stroke={theme.trims}
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  {/* Turn-ups */}
                  <path
                    d="M222 840 L377 840 L375 880 L220 880 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  <path
                    d="M578 840 L423 840 L425 880 L580 880 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  {/* Stitching: waistband, fly, side seams and hems */}
                  <path
                    d="M256 120 L544 120 M256 150 L544 150 M414 162 L414 270 Q414 300 396 306 M264 182 L230 830 M536 182 L570 830 M226 848 L374 848 M574 848 L426 848"
                    stroke={theme.stitching}
                    strokeWidth="3"
                    strokeDasharray="7 5"
                  />
                  {/* Waist button & pocket rivets */}
                  <circle
                    cx="400"
                    cy="135"
                    r="11"
                    fill={theme.buttons}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <circle cx="400" cy="135" r="2.5" fill={theme.stitching} />
                  {[
                    { cx: 266, cy: 176 },
                    { cx: 534, cy: 176 },
                  ].map((rivet) => (
                    <circle
                      key={rivet.cx}
                      cx={rivet.cx}
                      cy={rivet.cy}
                      r="5"
                      fill={theme.buttons}
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  ))}
                </>
              )}

              {silhouette === "coat" && (
                <>
                  <path
                    d="M240 180 Q400 160 560 180 L580 880 Q400 910 220 880 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  <path
                    d="M240 180 L110 560 L190 580 L260 350 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  <path
                    d="M560 180 L690 560 L610 580 L540 350 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  {/* Trench Lapels */}
                  <path
                    d="M330 175 L260 320 L370 380 L400 540 L380 340 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M470 175 L540 320 L430 380 L400 540 L420 340 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                  {/* Belt */}
                  <rect
                    x="240"
                    y="520"
                    width="320"
                    height="35"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  <rect
                    x="380"
                    y="515"
                    width="40"
                    height="45"
                    fill="none"
                    stroke={theme.buttons}
                    strokeWidth="4"
                  />
                  {/* Stitching */}
                  <path
                    d="M245 523 L555 523 M245 552 L555 552 M230 875 Q400 905 570 875"
                    stroke={theme.stitching}
                    strokeWidth="3"
                    strokeDasharray="7 5"
                  />
                  {/* Buttons */}
                  {[
                    { cx: 360, cy: 390 },
                    { cx: 440, cy: 390 },
                    { cx: 360, cy: 460 },
                    { cx: 440, cy: 460 },
                    { cx: 360, cy: 600 },
                    { cx: 440, cy: 600 },
                  ].map((b, idx) => (
                    <circle
                      key={idx}
                      cx={b.cx}
                      cy={b.cy}
                      r="10"
                      fill={theme.buttons}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  ))}
                </>
              )}

              {silhouette === "shirt" && (
                <>
                  <path
                    d="M250 185 Q400 165 550 185 L540 780 Q400 800 260 780 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  <path
                    d="M250 190 L120 520 L200 550 L280 340 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  <path
                    d="M550 190 L680 520 L600 550 L520 340 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  {/* Collar */}
                  <path
                    d="M340 185 Q400 160 460 185 L455 220 Q400 195 345 220 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                  {/* Center Placket */}
                  <rect
                    x="385"
                    y="215"
                    width="30"
                    height="280"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  {/* Cuffs */}
                  <rect
                    x="120"
                    y="500"
                    width="80"
                    height="45"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  <rect
                    x="600"
                    y="500"
                    width="80"
                    height="45"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  {/* Stitching */}
                  <path
                    d="M388 220 L388 490 M412 220 L412 490 M345 180 Q400 155 455 180"
                    stroke={theme.stitching}
                    strokeWidth="3"
                    strokeDasharray="6 5"
                  />
                  {/* Placket Buttons */}
                  {[260, 310, 360, 410, 460].map((cy, idx) => (
                    <circle
                      key={idx}
                      cx="400"
                      cy={cy}
                      r="7"
                      fill={theme.buttons}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  ))}
                </>
              )}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Dynamic Tailored Silhouette: {silhouette.toUpperCase()}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={renderGarmentToDataUrl}
              className="h-6 text-[10px] gap-1 cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Refresh Render</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs cursor-pointer"
            >
              Upload Garment Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadGarmentImage}
            />
          </div>
        </div>

        {/* Target Component Channels & Color Swatches */}
        <div className="space-y-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Select Garment Part to Customize:
          </Label>

          <div className="grid grid-cols-2 gap-2">
            {channels.map((ch) => {
              const Icon = ch.icon;
              const isSelected = activeChannel === ch.id;
              const colorName = getFashionColorName(ch.currentColor);

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChannel(ch.id)}
                  title={ch.description}
                  className={cn(
                    "flex flex-col rounded-md border p-3 text-left transition-all cursor-pointer relative overflow-hidden",
                    isSelected
                      ? "border-primary bg-card ring-2 ring-primary/20 "
                      : "border-border/80 bg-secondary/30 hover:border-border hover:bg-secondary/60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Icon className="size-3.5 text-cobalt-text" />
                      <span>{ch.label}</span>
                    </span>
                    <div
                      className="size-5 rounded-md border border-black/10"
                      style={{ backgroundColor: ch.currentColor }}
                    />
                  </div>

                  <span className="text-[10px] text-muted-foreground mt-1 truncate">
                    {colorName}
                  </span>
                  <span className="text-[9px] font-mono text-foreground uppercase">
                    {ch.currentColor}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Channel Color Palette & Swatches */}
          <div className="rounded-md border border-border bg-card p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground">
                  Apply Color to: {channels.find((c) => c.id === activeChannel)?.label}
                </span>
                <p className="text-[11px] text-foreground/90">{descriptions[activeChannel]}</p>
                <p className="text-[11px] text-muted-foreground">
                  Pick from extracted mood board, suggested harmonies, or custom hex
                </p>
              </div>

              {/* Native Color Picker Trigger */}
              <label
                htmlFor={`color-input-${activeChannel}`}
                className="flex items-center gap-1 text-xs font-medium text-cobalt-text hover:underline cursor-pointer border border-border px-2 py-1 rounded-md bg-secondary/40"
              >
                <Pipette className="size-3.5" />
                <span>Custom</span>
                <input
                  id={`color-input-${activeChannel}`}
                  type="color"
                  value={theme[activeChannel]}
                  onChange={(e) => handleColorUpdate(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Quick Palette Swatches */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Mood Board & Suggested Palette:
              </span>
              <div className="flex flex-wrap gap-2">
                {extractedPalette.map((col, idx) => {
                  const isCurrent = theme[activeChannel].toLowerCase() === col.hex.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleColorUpdate(col.hex)}
                      className={cn(
                        "group relative size-8 rounded-lg border border-black/10  transition-transform hover:scale-110 cursor-pointer flex items-center justify-center",
                        isCurrent && "ring-2 ring-primary ring-offset-2 scale-105",
                      )}
                      style={{ backgroundColor: col.hex }}
                      title={`${col.name} (${col.hex})`}
                    >
                      {isCurrent && (
                        <Check
                          className={cn(
                            "size-3.5 stroke-[3]",
                            col.isDark ? "text-white" : "text-black",
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Classic Neutral & Hardware Swatches for Accents */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Classic Tailoring Neutrals & Metallics:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Alabaster White", hex: "#f8f9fa" },
                  { name: "Oatmeal Beige", hex: "#e5ded4" },
                  { name: "Antique Gold", hex: "#c6923b" },
                  { name: "Brushed Silver", hex: "#a8b2bc" },
                  { name: "Tortoise Horn", hex: "#4a3224" },
                  { name: "Espresso", hex: "#2b1e16" },
                  { name: "Obsidian Black", hex: "#17181c" },
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleColorUpdate(preset.hex)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/80 bg-secondary/30 text-[10px] hover:border-primary cursor-pointer transition-colors"
                  >
                    <div
                      className="size-3 rounded-full border border-black/10"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
