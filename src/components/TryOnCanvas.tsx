import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Download, Move, RotateCcw, Palette, Layers, Shirt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { PoseGuide } from "@/lib/pose";
import type { GarmentColorTheme } from "@/lib/color-palette";

const MAX_EDGE = 1100;

type Layer = { x: number; y: number; scale: number; rotation: number; opacity: number };

function useImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const element = new Image();
    element.onload = () => setImage(element);
    element.src = src;
    return () => {
      element.onload = null;
    };
  }, [src]);
  return image;
}

export function TryOnCanvas({
  photoDataUrl,
  garmentDataUrl,
  garmentTitle,
  guide,
  customGarmentTheme,
  customGarmentDataUrl,
  onOpenColorStudio,
}: {
  photoDataUrl: string;
  garmentDataUrl: string;
  garmentTitle: string;
  guide: PoseGuide | null;
  customGarmentTheme?: GarmentColorTheme | null;
  customGarmentDataUrl?: string | null;
  onOpenColorStudio?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photo = useImage(photoDataUrl);

  // Toggle between custom colorway garment and original garment
  const [useCustomGarment, setUseCustomGarment] = useState(Boolean(customGarmentDataUrl));

  useEffect(() => {
    if (customGarmentDataUrl) {
      setUseCustomGarment(true);
    }
  }, [customGarmentDataUrl]);

  const activeGarmentSource =
    useCustomGarment && customGarmentDataUrl ? customGarmentDataUrl : garmentDataUrl;
  const garment = useImage(activeGarmentSource);

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

  /** Garment width at scale 1, in canvas px, aligned to shoulder span. */
  const baseWidth = useMemo(() => {
    if (guide) {
      const shoulderSpan =
        Math.hypot(
          guide.leftShoulder.x - guide.rightShoulder.x,
          guide.leftShoulder.y - guide.rightShoulder.y,
        ) * scaleFactor;
      if (shoulderSpan > 4) return shoulderSpan * 1.9;
    }
    return size.width * 0.55;
  }, [guide, scaleFactor, size.width]);

  const alignToBody = useCallback(() => {
    if (!guide || !photo) {
      setLayer({ x: 0.5, y: 0.42, scale: 1, rotation: 0, opacity: 1 });
      return;
    }
    const shoulderMidX =
      (((guide.leftShoulder.x + guide.rightShoulder.x) / 2) * scaleFactor) / size.width;
    const shoulderMidY = ((guide.leftShoulder.y + guide.rightShoulder.y) / 2) * scaleFactor;
    const torso = guide.torsoHeight * scaleFactor;
    setLayer({
      x: shoulderMidX,
      y: (shoulderMidY + torso * 0.55) / size.height,
      scale: 1,
      rotation: 0,
      opacity: 1,
    });
  }, [guide, photo, scaleFactor, size.height, size.width]);

  useEffect(() => {
    alignToBody();
  }, [alignToBody]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !photo) return;

    canvas.width = size.width;
    canvas.height = size.height;
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.drawImage(photo, 0, 0, size.width, size.height);

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
      const width = baseWidth * layer.scale;
      const height = (garment.naturalHeight / garment.naturalWidth) * width;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.translate(layer.x * size.width, layer.y * size.height);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.drawImage(garment, -width / 2, -height / 2, width, height);
      ctx.restore();
    }
  }, [baseWidth, garment, guide, layer, photo, scaleFactor, showGuide, size.height, size.width]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
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

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `virtual-try-room-${
      garmentTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40) || "look"
    }.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      <div className="surface overflow-hidden p-3">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="checkerboard w-full cursor-grab touch-none rounded-md active:cursor-grabbing"
        />
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
              {customGarmentDataUrl && garmentDataUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Custom Colors</span>
                  <Switch
                    checked={useCustomGarment}
                    onCheckedChange={setUseCustomGarment}
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
              onValueChange={([value]) => setLayer((current) => ({ ...current, scale: value }))}
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
              onValueChange={([value]) => setLayer((current) => ({ ...current, rotation: value }))}
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
              onValueChange={([value]) => setLayer((current) => ({ ...current, opacity: value }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-secondary/60 p-3">
          <Label htmlFor="guide-toggle" className="text-sm">
            Show body guide lines
          </Label>
          <Switch
            id="guide-toggle"
            checked={showGuide}
            onCheckedChange={setShowGuide}
            disabled={!guide}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={download} size="lg" className="cursor-pointer">
            <Download className="size-4" />
            Download look
          </Button>
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
          Guide lines are hidden in the download only if you switch them off first.
        </p>
      </div>
    </section>
  );
}
