import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  Download,
  Move,
  RotateCcw,
  Palette,
  Columns,
  Maximize2,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { GarmentAnchor } from "@/lib/garment-anchor";
import type { PoseGuide } from "@/lib/pose";
import type { GarmentColorTheme } from "@/lib/color-palette";

const MAX_EDGE = 1100;

type Layer = { x: number; y: number; scale: number; rotation: number; opacity: number };
type ViewMode = "split" | "sideBySide" | "single";

function useImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setImage(null);
    setFailed(false);
    if (!src) return;
    const element = new Image();
    element.onload = () => setImage(element);
    element.onerror = () => setFailed(true);
    element.src = src;
    return () => {
      element.onload = null;
      element.onerror = null;
    };
  }, [src]);
  return { image, failed };
}

export function TryOnCanvas({
  photoDataUrl,
  garmentDataUrl,
  garmentTitle,
  guide,
  customGarmentTheme,
  customGarmentDataUrl,
  onOpenColorStudio,
  fitScale = 1,
  garmentAnchor = null,
}: {
  photoDataUrl: string;
  garmentDataUrl: string;
  garmentTitle: string;
  guide: PoseGuide | null;
  customGarmentTheme?: GarmentColorTheme | null;
  customGarmentDataUrl?: string | null;
  onOpenColorStudio?: (() => void) | undefined;
  /** Garment width multiplier from user-entered vs detected shoulder width */
  fitScale?: number | undefined;
  /** Shop model's landmarks in the garment image, for body-to-body alignment */
  garmentAnchor?: GarmentAnchor | null | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sideBySideLeftRef = useRef<HTMLCanvasElement>(null);
  const sideBySideRightRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { image: photo } = useImage(photoDataUrl);

  // The fetched/uploaded garment is always the default layer. The Color Studio's
  // illustrated colorway is only used when there is no real garment, or when the
  // user explicitly switches to it.
  const hasRealGarment = Boolean(garmentDataUrl) && garmentDataUrl !== customGarmentDataUrl;
  const [preferCustomGarment, setPreferCustomGarment] = useState(false);
  const useCustomGarment =
    Boolean(customGarmentDataUrl) && (!hasRealGarment || preferCustomGarment);

  const activeGarmentSource =
    useCustomGarment && customGarmentDataUrl ? customGarmentDataUrl : garmentDataUrl;
  const { image: garment, failed: garmentFailed } = useImage(activeGarmentSource);

  // Split View & Synced Rendering States
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [splitPosition, setSplitPosition] = useState<number>(50); // 0 to 100 percentage
  const [swapSides, setSwapSides] = useState<boolean>(false); // false: Left=Original, Right=Try-On. true: Left=Try-On, Right=Original
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  const [showGuide, setShowGuide] = useState(true);
  const [layer, setLayer] = useState<Layer>({
    x: 0.5,
    y: 0.42,
    scale: 1,
    rotation: 0,
    opacity: 1,
  });
  const dragRef = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);

  const size = useMemo(() => {
    if (!photo) return { width: 800, height: 1000 };
    const ratio = Math.min(1, MAX_EDGE / Math.max(photo.naturalWidth, photo.naturalHeight));
    return {
      width: Math.round(photo.naturalWidth * ratio),
      height: Math.round(photo.naturalHeight * ratio),
    };
  }, [photo]);

  const scaleFactor = photo ? size.width / photo.naturalWidth : 1;

  const activeAnchor = useCustomGarment && customGarmentDataUrl ? null : garmentAnchor;

  /**
   * Garment size and centre at scale 1, in canvas px. With an anchor, the shop model's
   * shoulders map onto the user's shoulders (width) and shoulder→hip onto the user's
   * torso (height); otherwise the garment is sized from the shoulder span.
   */
  const placement = useMemo(() => {
    if (guide && garment && activeAnchor) {
      const userL = {
        x: guide.leftShoulder.x * scaleFactor,
        y: guide.leftShoulder.y * scaleFactor,
      };
      const userR = {
        x: guide.rightShoulder.x * scaleFactor,
        y: guide.rightShoulder.y * scaleFactor,
      };
      const userMid = { x: (userL.x + userR.x) / 2, y: (userL.y + userR.y) / 2 };
      const { leftShoulder: gL, rightShoulder: gR, hipCenter: gHip } = activeAnchor;
      const garmentMid = { x: (gL.x + gR.x) / 2, y: (gL.y + gR.y) / 2 };
      const garmentSpan = Math.hypot(gL.x - gR.x, gL.y - gR.y);
      const userSpan = Math.hypot(userL.x - userR.x, userL.y - userR.y);
      if (garmentSpan > 4 && userSpan > 4) {
        const sx = (userSpan / garmentSpan) * fitScale;
        let sy = sx;
        if (gHip) {
          const garmentTorso = Math.hypot(gHip.x - garmentMid.x, gHip.y - garmentMid.y);
          const userTorso = Math.hypot(
            guide.hipCenter.x * scaleFactor - userMid.x,
            guide.hipCenter.y * scaleFactor - userMid.y,
          );
          // Limit stretch so the garment isn't visibly distorted
          if (garmentTorso > 4)
            sy = Math.min(sx * 1.25, Math.max(sx * 0.8, userTorso / garmentTorso));
        }
        const width = garment.naturalWidth * sx;
        const height = garment.naturalHeight * sy;
        return {
          width,
          height,
          center: {
            x: (userMid.x + (garment.naturalWidth / 2 - garmentMid.x) * sx) / size.width,
            y: (userMid.y + (garment.naturalHeight / 2 - garmentMid.y) * sy) / size.height,
          },
        };
      }
    }

    let width = size.width * 0.55;
    if (guide) {
      const shoulderSpan =
        Math.hypot(
          guide.leftShoulder.x - guide.rightShoulder.x,
          guide.leftShoulder.y - guide.rightShoulder.y,
        ) * scaleFactor;
      if (shoulderSpan > 4) width = shoulderSpan * 1.9 * fitScale;
    }
    const height = garment ? (garment.naturalHeight / garment.naturalWidth) * width : width;
    const center = guide
      ? {
          x: (((guide.leftShoulder.x + guide.rightShoulder.x) / 2) * scaleFactor) / size.width,
          y:
            (((guide.leftShoulder.y + guide.rightShoulder.y) / 2) * scaleFactor +
              guide.torsoHeight * scaleFactor * 0.55) /
            size.height,
        }
      : { x: 0.5, y: 0.42 };
    return { width, height, center };
  }, [activeAnchor, fitScale, garment, guide, scaleFactor, size.height, size.width]);

  const alignToBody = useCallback(() => {
    setLayer({ ...placement.center, scale: 1, rotation: 0, opacity: 1 });
  }, [placement.center]);

  useEffect(() => {
    alignToBody();
  }, [alignToBody]);

  // Render main split canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !photo || viewMode === "sideBySide") return;

    canvas.width = size.width;
    canvas.height = size.height;
    ctx.clearRect(0, 0, size.width, size.height);

    // 1. Draw base photo across entire canvas (Left view is original photo by default)
    ctx.drawImage(photo, 0, 0, size.width, size.height);

    // 2. Determine Try-On layer clipping region based on split slider
    const splitPx = (splitPosition / 100) * size.width;

    if (viewMode === "split") {
      ctx.save();
      ctx.beginPath();
      if (!swapSides) {
        // Left side is Original Photo (0 to splitPx)
        // Right side is Virtual Try-On (splitPx to size.width)
        ctx.rect(splitPx, 0, Math.max(0, size.width - splitPx), size.height);
      } else {
        // Left side is Virtual Try-On (0 to splitPx)
        // Right side is Original Photo (splitPx to size.width)
        ctx.rect(0, 0, splitPx, size.height);
      }
      ctx.clip();

      // Render Guide Lines on Try-On view if enabled
      if (showGuide && guide) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = Math.max(2, size.width * 0.004);
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(guide.leftShoulder.x * scaleFactor, guide.leftShoulder.y * scaleFactor);
        ctx.lineTo(guide.rightShoulder.x * scaleFactor, guide.rightShoulder.y * scaleFactor);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(
          ((guide.leftShoulder.x + guide.rightShoulder.x) / 2) * scaleFactor,
          ((guide.leftShoulder.y + guide.rightShoulder.y) / 2) * scaleFactor,
        );
        ctx.lineTo(guide.hipCenter.x * scaleFactor, guide.hipCenter.y * scaleFactor);
        ctx.stroke();
        ctx.restore();
      }

      // Render Garment on Try-On view
      if (garment) {
        const width = placement.width * layer.scale;
        const height = placement.height * layer.scale;
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.translate(layer.x * size.width, layer.y * size.height);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.drawImage(garment, -width / 2, -height / 2, width, height);
        ctx.restore();
      }

      ctx.restore(); // end clip
    } else {
      // Single full Try-On view
      if (showGuide && guide) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = Math.max(2, size.width * 0.004);
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(guide.leftShoulder.x * scaleFactor, guide.leftShoulder.y * scaleFactor);
        ctx.lineTo(guide.rightShoulder.x * scaleFactor, guide.rightShoulder.y * scaleFactor);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(
          ((guide.leftShoulder.x + guide.rightShoulder.x) / 2) * scaleFactor,
          ((guide.leftShoulder.y + guide.rightShoulder.y) / 2) * scaleFactor,
        );
        ctx.lineTo(guide.hipCenter.x * scaleFactor, guide.hipCenter.y * scaleFactor);
        ctx.stroke();
        ctx.restore();
      }

      if (garment) {
        const width = placement.width * layer.scale;
        const height = placement.height * layer.scale;
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.translate(layer.x * size.width, layer.y * size.height);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.drawImage(garment, -width / 2, -height / 2, width, height);
        ctx.restore();
      }
    }
  }, [
    garment,
    guide,
    layer,
    photo,
    placement,
    scaleFactor,
    showGuide,
    size.height,
    size.width,
    splitPosition,
    swapSides,
    viewMode,
  ]);

  // Render side-by-side synchronized views when selected
  useEffect(() => {
    if (viewMode !== "sideBySide" || !photo) return;

    // 1. Left View: Original Photo
    const leftCanvas = sideBySideLeftRef.current;
    if (leftCanvas) {
      const leftCtx = leftCanvas.getContext("2d");
      if (leftCtx) {
        leftCanvas.width = size.width;
        leftCanvas.height = size.height;
        leftCtx.clearRect(0, 0, size.width, size.height);
        leftCtx.drawImage(photo, 0, 0, size.width, size.height);
        if (showGuide && guide) {
          leftCtx.save();
          leftCtx.strokeStyle = "rgba(255,255,255,0.7)";
          leftCtx.lineWidth = Math.max(2, size.width * 0.004);
          leftCtx.setLineDash([10, 8]);
          leftCtx.beginPath();
          leftCtx.moveTo(guide.leftShoulder.x * scaleFactor, guide.leftShoulder.y * scaleFactor);
          leftCtx.lineTo(guide.rightShoulder.x * scaleFactor, guide.rightShoulder.y * scaleFactor);
          leftCtx.stroke();
          leftCtx.restore();
        }
      }
    }

    // 2. Right View: Virtual Try-On
    const rightCanvas = sideBySideRightRef.current;
    if (rightCanvas) {
      const rightCtx = rightCanvas.getContext("2d");
      if (rightCtx) {
        rightCanvas.width = size.width;
        rightCanvas.height = size.height;
        rightCtx.clearRect(0, 0, size.width, size.height);
        rightCtx.drawImage(photo, 0, 0, size.width, size.height);

        if (showGuide && guide) {
          rightCtx.save();
          rightCtx.strokeStyle = "rgba(255,255,255,0.9)";
          rightCtx.lineWidth = Math.max(2, size.width * 0.004);
          rightCtx.setLineDash([10, 8]);
          rightCtx.beginPath();
          rightCtx.moveTo(guide.leftShoulder.x * scaleFactor, guide.leftShoulder.y * scaleFactor);
          rightCtx.lineTo(guide.rightShoulder.x * scaleFactor, guide.rightShoulder.y * scaleFactor);
          rightCtx.stroke();
          rightCtx.setLineDash([]);
          rightCtx.beginPath();
          rightCtx.moveTo(
            ((guide.leftShoulder.x + guide.rightShoulder.x) / 2) * scaleFactor,
            ((guide.leftShoulder.y + guide.rightShoulder.y) / 2) * scaleFactor,
          );
          rightCtx.lineTo(guide.hipCenter.x * scaleFactor, guide.hipCenter.y * scaleFactor);
          rightCtx.stroke();
          rightCtx.restore();
        }

        if (garment) {
          const width = placement.width * layer.scale;
          const height = placement.height * layer.scale;
          rightCtx.save();
          rightCtx.globalAlpha = layer.opacity;
          rightCtx.translate(layer.x * size.width, layer.y * size.height);
          rightCtx.rotate((layer.rotation * Math.PI) / 180);
          rightCtx.drawImage(garment, -width / 2, -height / 2, width, height);
          rightCtx.restore();
        }
      }
    }
  }, [
    garment,
    guide,
    layer,
    photo,
    placement,
    scaleFactor,
    showGuide,
    size.height,
    size.width,
    viewMode,
  ]);

  // Central Vertical Slider Bar Dragging Logic
  const handleSliderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setIsDraggingSlider(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSliderPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSlider || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = event.clientX;
    const relativeX = (clientX - rect.left) / rect.width;
    const clampedPct = Math.max(0, Math.min(100, Math.round(relativeX * 100)));
    setSplitPosition(clampedPct);
  };

  const handleSliderPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSlider) {
      setIsDraggingSlider(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore if already released
      }
    }
  };

  const handleSliderKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSplitPosition((p) => Math.max(0, p - 2));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setSplitPosition((p) => Math.min(100, p + 2));
    } else if (event.key === "Home") {
      event.preventDefault();
      setSplitPosition(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setSplitPosition(100);
    }
  };

  // Garment reposition dragging logic on canvas
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingSlider) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    dragRef.current = { pointerId: event.pointerId, dx: layer.x - px, dy: layer.y - py };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setLayer((current) => ({
      ...current,
      x: Math.min(1.2, Math.max(-0.2, px + drag.dx)),
      y: Math.min(1.2, Math.max(-0.2, py + drag.dy)),
    }));
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  // Download Look handler (supports Split Comparison or Full Try-On)
  const download = (mode: "current" | "full" = "current") => {
    if (mode === "full" || viewMode === "single") {
      // Export full try-on without split line
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = size.width;
      exportCanvas.height = size.height;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx || !photo) return;

      ctx.drawImage(photo, 0, 0, size.width, size.height);
      if (garment) {
        const width = placement.width * layer.scale;
        const height = placement.height * layer.scale;
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.translate(layer.x * size.width, layer.y * size.height);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.drawImage(garment, -width / 2, -height / 2, width, height);
        ctx.restore();
      }

      const link = document.createElement("a");
      link.download = `virtual-try-room-${
        garmentTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 40) || "look"
      }-full.png`;
      link.href = exportCanvas.toDataURL("image/png");
      link.click();
      return;
    }

    // Export current split canvas with high-res dividing hairline and editorial labels
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = size.width;
    exportCanvas.height = size.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Draw main rendered canvas
    ctx.drawImage(canvas, 0, 0);

    // Draw subtle vertical split line on export
    const splitPx = (splitPosition / 100) * size.width;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = Math.max(2, size.width * 0.003);
    ctx.beginPath();
    ctx.moveTo(splitPx, 0);
    ctx.lineTo(splitPx, size.height);
    ctx.stroke();

    // Subtle editorial labels
    const fontSize = Math.max(14, Math.round(size.width * 0.022));
    ctx.font = `600 ${fontSize}px sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = 6;

    const leftLabel = !swapSides ? "ORIGINAL PHOTO" : "VIRTUAL TRY-ON";
    const rightLabel = !swapSides ? "VIRTUAL TRY-ON" : "ORIGINAL PHOTO";
    ctx.fillText(leftLabel, 20, 36);
    ctx.textAlign = "right";
    ctx.fillText(rightLabel, size.width - 20, 36);
    ctx.restore();

    const link = document.createElement("a");
    link.download = `virtual-try-room-${
      garmentTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40) || "look"
    }-split-${splitPosition}pct.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  // Left & Right view labels based on swap status
  const leftViewTitle = !swapSides ? "Original Photo" : "Virtual Try-On";
  const rightViewTitle = !swapSides ? "Virtual Try-On" : "Original Photo";

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <div className="surface flex flex-col gap-3 p-3">
        {/* Top Viewport Mode & Preset Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mr-1 hidden sm:inline">
              Viewport:
            </span>
            <div className="inline-flex rounded-lg bg-secondary/80 p-0.5 border border-border/60">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  viewMode === "split"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Split canvas with central draggable slider"
              >
                <SlidersHorizontal className="size-3" />
                <span>Split Slider</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("sideBySide")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  viewMode === "sideBySide"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Divide viewport into two synced side-by-side views"
              >
                <Columns className="size-3" />
                <span>Side-by-Side Synced</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  viewMode === "single"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Full Try-on without split"
              >
                <Maximize2 className="size-3" />
                <span>Full</span>
              </button>
            </div>
          </div>

          {/* Quick Slider Presets (in Split mode), Swap button, and Reset View */}
          <div className="flex items-center gap-1.5">
            {viewMode === "split" && (
              <>
                <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setSplitPosition(0)}
                    className={`px-1.5 py-0.5 rounded hover:bg-secondary cursor-pointer transition-colors ${
                      splitPosition === 0 ? "bg-primary/10 text-primary font-semibold" : ""
                    }`}
                    title="Show only right view"
                  >
                    0%
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitPosition(25)}
                    className={`px-1.5 py-0.5 rounded hover:bg-secondary cursor-pointer transition-colors ${
                      splitPosition === 25 ? "bg-primary/10 text-primary font-semibold" : ""
                    }`}
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitPosition(75)}
                    className={`px-1.5 py-0.5 rounded hover:bg-secondary cursor-pointer transition-colors ${
                      splitPosition === 75 ? "bg-primary/10 text-primary font-semibold" : ""
                    }`}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitPosition(100)}
                    className={`px-1.5 py-0.5 rounded hover:bg-secondary cursor-pointer transition-colors ${
                      splitPosition === 100 ? "bg-primary/10 text-primary font-semibold" : ""
                    }`}
                    title="Show only left view"
                  >
                    100%
                  </button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSwapSides(!swapSides)}
                  className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Swap Left and Right views"
                >
                  <ArrowLeftRight className="size-3" />
                  <span className="hidden sm:inline">Swap</span>
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSplitPosition(50);
                if (viewMode !== "split") {
                  setViewMode("split");
                }
              }}
              className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer text-foreground hover:bg-secondary border-border/80 shadow-2xs font-medium"
              title="Reset central slider to default 50% position"
            >
              <RotateCcw className="size-3 text-muted-foreground" />
              <span>Reset View</span>
            </Button>
          </div>
        </div>

        {garmentFailed ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-background/95 p-3 text-sm text-destructive shadow-sm"
          >
            Couldn't load this image directly — try uploading it instead.
          </div>
        ) : null}

        {/* ================= VIEWPORT RENDERING ================= */}
        {viewMode === "sideBySide" ? (
          /* Side-by-Side Dual Synced Rendering Views */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {/* Left Synced View: Original Photo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-muted-foreground" />
                  <span>Left View: Original Photo</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Baseline
                </span>
              </div>
              <div className="surface overflow-hidden rounded-md border border-border/80">
                <canvas
                  ref={sideBySideLeftRef}
                  className="checkerboard w-full h-auto block select-none pointer-events-none"
                />
              </div>
            </div>

            {/* Right Synced View: Virtual Try-On */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Sparkles className="size-3 text-gold" />
                  <span>Right View: Virtual Try-On</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-primary font-medium">
                  Live Fitted
                </span>
              </div>
              <div className="surface overflow-hidden rounded-md border border-primary/30">
                <canvas
                  ref={sideBySideRightRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="checkerboard w-full h-auto block cursor-grab touch-none active:cursor-grabbing select-none"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Central Split Slider Viewport */
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-md select-none touch-none"
            style={{ touchAction: "none" }}
          >
            {/* View Badges (Synced Labels) */}
            {viewMode === "split" && (
              <>
                {/* Left View Badge */}
                <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-md shadow-xs border border-border/60">
                  <span className="size-1.5 rounded-full bg-muted-foreground" />
                  <span>Left: {leftViewTitle}</span>
                </div>

                {/* Right View Badge */}
                <div className="absolute top-3 right-3 z-10 pointer-events-none flex items-center gap-1.5 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-medium text-primary-foreground backdrop-blur-md shadow-xs">
                  <Sparkles className="size-3 text-gold" />
                  <span>Right: {rightViewTitle}</span>
                </div>
              </>
            )}

            {/* Main Interactive Canvas */}
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="checkerboard w-full h-auto block cursor-grab touch-none active:cursor-grabbing rounded-md"
            />

            {/* Central Interactive Vertical Slider Bar */}
            {viewMode === "split" && (
              <div
                role="slider"
                tabIndex={0}
                aria-label="Before and after split slider"
                aria-valuenow={splitPosition}
                aria-valuemin={0}
                aria-valuemax={100}
                onKeyDown={handleSliderKeyDown}
                onPointerDown={handleSliderPointerDown}
                onPointerMove={handleSliderPointerMove}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerUp}
                style={{ left: `${splitPosition}%` }}
                className="absolute top-0 bottom-0 z-20 flex items-center justify-center -translate-x-1/2 w-10 cursor-ew-resize touch-none select-none group"
              >
                {/* Full-height Vertical Dividing Line with contrast glow */}
                <div className="w-[2px] h-full bg-white/95 shadow-[0_0_8px_rgba(0,0,0,0.6),0_0_2px_rgba(0,0,0,0.9)] transition-colors group-hover:bg-gold" />

                {/* Central Interactive Floating Handle */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center size-9 sm:size-10 rounded-full bg-card/95 border-2 border-primary text-foreground shadow-[var(--shadow-lift)] backdrop-blur-md transition-transform duration-100 ${
                    isDraggingSlider
                      ? "scale-110 ring-4 ring-primary/20 border-gold"
                      : "group-hover:scale-105"
                  }`}
                >
                  <div className="flex items-center gap-0.5 text-primary">
                    <ChevronLeft className="size-3.5 stroke-[2.5]" />
                    <div className="w-0.5 h-3.5 bg-border rounded-full" />
                    <ChevronRight className="size-3.5 stroke-[2.5]" />
                  </div>

                  {/* Percentage Chip Badge */}
                  <div
                    className={`absolute -top-7 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm whitespace-nowrap pointer-events-none transition-opacity duration-150 ${
                      isDraggingSlider ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {splitPosition}%
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Viewport Info / Usage Cue */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Move className="size-3 text-primary" />
            <span>
              {viewMode === "split"
                ? "Drag vertical slider bar horizontally to compare • Drag garment on canvas to position"
                : viewMode === "sideBySide"
                  ? "Synced baseline (Left) and virtual fit (Right) • Drag on right canvas to position"
                  : "Drag garment to position on your body"}
            </span>
          </span>
          {viewMode === "split" && (
            <span className="hidden sm:inline font-mono text-[10px]">
              Split: {splitPosition}% (Use ← → keys)
            </span>
          )}
        </div>
      </div>

      <div className="surface space-y-6 p-6">
        <div>
          <p className="eyebrow">Step 04 — Fit it</p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <h2 className="text-2xl truncate">
              {useCustomGarment ? `Custom Colorway — ${garmentTitle}` : garmentTitle}
            </h2>
            {onOpenColorStudio && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenColorStudio}
                className="gap-1.5 text-xs shrink-0 cursor-pointer border-primary/30 text-primary hover:bg-primary/10"
              >
                <Palette className="size-3.5" />
                <span>Colors & Harmonies</span>
              </Button>
            )}
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Move className="size-3.5" /> Drag the garment on the photo, then fine-tune below.
          </p>
        </div>

        {/* Garment Color Scheme Active Pill & Toggle */}
        {customGarmentTheme && (
          <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Palette className="size-3.5 text-primary" />
                <span>Active Palette Channels:</span>
              </span>
              {customGarmentDataUrl && hasRealGarment && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Use Color Studio illustration
                  </span>
                  <Switch
                    checked={useCustomGarment}
                    onCheckedChange={setPreferCustomGarment}
                    aria-label="Toggle custom garment colors"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
              <div className="flex flex-col items-center gap-1 rounded-md bg-card p-1.5 border border-border">
                <div
                  className="size-4 rounded-full border border-black/10 shadow-2xs"
                  style={{ backgroundColor: customGarmentTheme.mainBody }}
                />
                <span className="text-muted-foreground font-medium">Body</span>
                <span className="font-mono text-[9px] uppercase">
                  {customGarmentTheme.mainBody}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 rounded-md bg-card p-1.5 border border-border">
                <div
                  className="size-4 rounded-full border border-black/10 shadow-2xs"
                  style={{ backgroundColor: customGarmentTheme.trims }}
                />
                <span className="text-muted-foreground font-medium">Trims</span>
                <span className="font-mono text-[9px] uppercase">{customGarmentTheme.trims}</span>
              </div>

              <div className="flex flex-col items-center gap-1 rounded-md bg-card p-1.5 border border-border">
                <div
                  className="size-4 rounded-full border border-black/10 shadow-2xs"
                  style={{ backgroundColor: customGarmentTheme.buttons }}
                />
                <span className="text-muted-foreground font-medium">Buttons</span>
                <span className="font-mono text-[9px] uppercase">{customGarmentTheme.buttons}</span>
              </div>

              <div className="flex flex-col items-center gap-1 rounded-md bg-card p-1.5 border border-border">
                <div
                  className="size-4 rounded-full border border-black/10 shadow-2xs"
                  style={{ backgroundColor: customGarmentTheme.stitching }}
                />
                <span className="text-muted-foreground font-medium">Stitch</span>
                <span className="font-mono text-[9px] uppercase">
                  {customGarmentTheme.stitching}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Size</Label>
              <span className="text-muted-foreground">{Math.round(layer.scale * 100)}%</span>
            </div>
            <Slider
              value={[layer.scale]}
              min={0.2}
              max={2.5}
              step={0.01}
              onValueChange={([value]) =>
                setLayer((current) => ({ ...current, scale: value ?? current.scale }))
              }
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Rotation</Label>
              <span className="text-muted-foreground">{Math.round(layer.rotation)}°</span>
            </div>
            <Slider
              value={[layer.rotation]}
              min={-45}
              max={45}
              step={1}
              onValueChange={([value]) =>
                setLayer((current) => ({ ...current, rotation: value ?? current.rotation }))
              }
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Opacity</Label>
              <span className="text-muted-foreground">{Math.round(layer.opacity * 100)}%</span>
            </div>
            <Slider
              value={[layer.opacity]}
              min={0.1}
              max={1}
              step={0.01}
              onValueChange={([value]) =>
                setLayer((current) => ({ ...current, opacity: value ?? current.opacity }))
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-secondary/60 p-3">
          <Label htmlFor="guide-toggle" className="text-sm cursor-pointer">
            Show body guide lines
          </Label>
          <Switch
            id="guide-toggle"
            checked={showGuide}
            onCheckedChange={setShowGuide}
            disabled={!guide}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={() => download("current")} size="lg" className="cursor-pointer gap-2">
            <Download className="size-4" />
            <span>{viewMode === "split" ? "Download Split View" : "Download Look"}</span>
          </Button>
          {viewMode === "split" && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => download("full")}
              className="cursor-pointer gap-1.5"
              title="Download 100% try-on without split line"
            >
              <Sparkles className="size-4 text-gold" />
              <span>Download Full</span>
            </Button>
          )}
          <Button variant="outline" onClick={alignToBody} className="cursor-pointer">
            <Crosshair className="size-4" />
            Snap to shoulders
          </Button>
          <Button
            variant="ghost"
            onClick={() => setLayer((current) => ({ ...current, rotation: 0, scale: 1 }))}
            className="cursor-pointer"
          >
            <RotateCcw className="size-4" />
            Reset fit
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {viewMode === "split"
            ? `Download Split View exports the exact ${splitPosition}% comparison with subtle editorial labels.`
            : "Guide lines are hidden in the download only if you switch them off first."}
        </p>
      </div>
    </section>
  );
}
