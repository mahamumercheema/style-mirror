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
  Upload,
  Check,
  Layers,
  Shirt,
  Tag,
  Scale,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { GarmentAnchor } from "@/lib/garment-anchor";
import type { PoseGuide } from "@/lib/pose";
import type { GarmentColorTheme } from "@/lib/color-palette";
import { getStoredWardrobeItems } from "@/lib/wardrobe-service";
import { useAuth } from "@/context/AuthContext";

const MAX_EDGE = 1100;

export type Layer = { x: number; y: number; scale: number; rotation: number; opacity: number };
export type ViewMode = "sideBySide" | "split" | "single";
export type ComparisonType = "outfit" | "size";

export interface SizeOption {
  id: string;
  label: string;
  name: string;
  scaleMultiplier: number;
  description: string;
}

export const COMPARISON_SIZES: SizeOption[] = [
  {
    id: "xs",
    label: "XS",
    name: "Extra Small",
    scaleMultiplier: 0.9,
    description: "Petite & Fitted (-10%)",
  },
  { id: "s", label: "S", name: "Small", scaleMultiplier: 0.95, description: "Slim Fit (-5%)" },
  {
    id: "m",
    label: "M",
    name: "Medium",
    scaleMultiplier: 1.0,
    description: "Standard True-to-Size",
  },
  { id: "l", label: "L", name: "Large", scaleMultiplier: 1.07, description: "Relaxed Fit (+7%)" },
  {
    id: "xl",
    label: "XL",
    name: "Extra Large",
    scaleMultiplier: 1.14,
    description: "Loose Fit (+14%)",
  },
  {
    id: "oversized",
    label: "Oversized",
    name: "Oversized",
    scaleMultiplier: 1.22,
    description: "Boxy / Drape (+22%)",
  },
];

export interface PresetOutfit {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description: string;
}

export const CURATED_OUTFITS_B: PresetOutfit[] = [
  {
    id: "emerald_kameez",
    title: "Emerald Embroidered Set",
    category: "Full-Body / Ethnic",
    imageUrl:
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
    description: "Raw Silk with gold embroidery",
  },
  {
    id: "classic_white_shirt",
    title: "Classic Crisp White Shirt",
    category: "Tops / Shirt",
    imageUrl:
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80",
    description: "Tailored Oxford Cotton",
  },
  {
    id: "charcoal_blazer",
    title: "Structured Tailored Blazer",
    category: "Outerwear",
    imageUrl:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
    description: "Modern Charcoal Wool",
  },
  {
    id: "silk_slip_dress",
    title: "Silk Evening Slip Dress",
    category: "Full-Body / Dress",
    imageUrl:
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80",
    description: "Satin with fluid drape",
  },
  {
    id: "casual_denim_top",
    title: "Relaxed Linen Chambray",
    category: "Tops",
    imageUrl:
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80",
    description: "Breathable Casual Silhouette",
  },
];

function useImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImage(null);
    setFailed(false);
    if (!src) return;
    const element = new Image();
    element.crossOrigin = "anonymous";
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
  garmentAnchor,
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
  const { user } = useAuth();
  const wardrobeItems = useMemo(() => getStoredWardrobeItems(user?.id || "guest_user"), [user?.id]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sideBySideLeftRef = useRef<HTMLCanvasElement>(null);
  const sideBySideRightRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { image: photo } = useImage(photoDataUrl);

  // Comparison Configuration States
  const [comparisonType, setComparisonType] = useState<ComparisonType>("outfit");
  const [viewMode, setViewMode] = useState<ViewMode>("sideBySide");
  const [splitPosition, setSplitPosition] = useState<number>(50); // 0 to 100 percentage
  const [swapSides, setSwapSides] = useState<boolean>(false); // false: Left=A, Right=B
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [activeTabLook, setActiveTabLook] = useState<"A" | "B">("A");
  const [singleFocusLook, setSingleFocusLook] = useState<"A" | "B">("A");

  // Look A Source & Sizing
  const hasRealGarment = Boolean(garmentDataUrl) && garmentDataUrl !== customGarmentDataUrl;
  const [preferCustomGarment, setPreferCustomGarment] = useState(false);
  const useCustomGarment =
    Boolean(customGarmentDataUrl) && (!hasRealGarment || preferCustomGarment);

  const lookASource =
    useCustomGarment && customGarmentDataUrl ? customGarmentDataUrl : garmentDataUrl;
  const [lookASizeId, setLookASizeId] = useState<string>("s");
  const { image: garmentA, failed: garmentAFailed } = useImage(lookASource);

  // Look B Source & Sizing
  // Pick default preset that is different from Look A
  const defaultOutfitB = useMemo(() => {
    if (
      garmentTitle.toLowerCase().includes("white") ||
      garmentTitle.toLowerCase().includes("shirt")
    ) {
      return CURATED_OUTFITS_B[0]!;
    }
    return CURATED_OUTFITS_B[1]!;
  }, [garmentTitle]);

  const [lookBSource, setLookBSource] = useState<string>(defaultOutfitB.imageUrl);
  const [lookBTitle, setLookBTitle] = useState<string>(defaultOutfitB.title);
  const [lookBSizeId, setLookBSizeId] = useState<string>("l"); // S vs L by default for contrast
  const [showOutfitBPicker, setShowOutfitBPicker] = useState<boolean>(false);

  // If in size comparison mode, Look B uses the exact same outfit source as Look A
  const effectiveLookBSource = comparisonType === "size" ? lookASource : lookBSource;
  const effectiveLookBTitle =
    comparisonType === "size" ? `${garmentTitle} (Size ${lookBSizeId.toUpperCase()})` : lookBTitle;
  const { image: garmentB, failed: garmentBFailed } = useImage(effectiveLookBSource);

  const [showGuide, setShowGuide] = useState(true);

  // Layer transforms for Look A and Look B
  const [layerA, setLayerA] = useState<Layer>({
    x: 0.5,
    y: 0.42,
    scale: 1,
    rotation: 0,
    opacity: 1,
  });

  const [layerB, setLayerB] = useState<Layer>({
    x: 0.5,
    y: 0.42,
    scale: 1,
    rotation: 0,
    opacity: 1,
  });

  const dragRef = useRef<{
    pointerId: number;
    dx: number;
    dy: number;
    target: "A" | "B";
  } | null>(null);

  const size = useMemo(() => {
    if (!photo) return { width: 800, height: 1000 };
    const ratio = Math.min(1, MAX_EDGE / Math.max(photo.naturalWidth, photo.naturalHeight));
    return {
      width: Math.round(photo.naturalWidth * ratio),
      height: Math.round(photo.naturalHeight * ratio),
    };
  }, [photo]);

  const scaleFactor = photo ? size.width / photo.naturalWidth : 1;

  // Selected Size Scale Multipliers
  const sizeMultiplierA = useMemo(() => {
    const found = COMPARISON_SIZES.find((s) => s.id === lookASizeId);
    return found ? found.scaleMultiplier : 1;
  }, [lookASizeId]);

  const sizeMultiplierB = useMemo(() => {
    const found = COMPARISON_SIZES.find((s) => s.id === lookBSizeId);
    return found ? found.scaleMultiplier : 1.07;
  }, [lookBSizeId]);

  const activeAnchorA = useCustomGarment && customGarmentDataUrl ? null : garmentAnchor;

  // Helper to compute garment placement based on body guides and size scale
  const computePlacement = useCallback(
    (gImg: HTMLImageElement | null, anchor: GarmentAnchor | null | undefined, sizeMult: number) => {
      const effectiveScale = fitScale * sizeMult;

      if (guide && gImg && anchor) {
        const userL = {
          x: guide.leftShoulder.x * scaleFactor,
          y: guide.leftShoulder.y * scaleFactor,
        };
        const userR = {
          x: guide.rightShoulder.x * scaleFactor,
          y: guide.rightShoulder.y * scaleFactor,
        };
        const userMid = { x: (userL.x + userR.x) / 2, y: (userL.y + userR.y) / 2 };
        const { leftShoulder: gL, rightShoulder: gR, hipCenter: gHip } = anchor;
        const garmentMid = { x: (gL.x + gR.x) / 2, y: (gL.y + gR.y) / 2 };
        const garmentSpan = Math.hypot(gL.x - gR.x, gL.y - gR.y);
        const userSpan = Math.hypot(userL.x - userR.x, userL.y - userR.y);

        if (garmentSpan > 4 && userSpan > 4) {
          const sx = (userSpan / garmentSpan) * effectiveScale;
          let sy = sx;
          if (gHip) {
            const garmentTorso = Math.hypot(gHip.x - garmentMid.x, gHip.y - garmentMid.y);
            const userTorso = Math.hypot(
              guide.hipCenter.x * scaleFactor - userMid.x,
              guide.hipCenter.y * scaleFactor - userMid.y,
            );
            if (garmentTorso > 4) {
              sy = Math.min(sx * 1.25, Math.max(sx * 0.8, userTorso / garmentTorso));
            }
          }
          const width = gImg.naturalWidth * sx;
          const height = gImg.naturalHeight * sy;
          return {
            width,
            height,
            center: {
              x: (userMid.x + (gImg.naturalWidth / 2 - garmentMid.x) * sx) / size.width,
              y: (userMid.y + (gImg.naturalHeight / 2 - garmentMid.y) * sy) / size.height,
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
        if (shoulderSpan > 4) width = shoulderSpan * 1.9 * effectiveScale;
      }
      const height = gImg ? (gImg.naturalHeight / gImg.naturalWidth) * width : width;
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
    },
    [fitScale, guide, scaleFactor, size.height, size.width],
  );

  const placementA = useMemo(
    () => computePlacement(garmentA, activeAnchorA, sizeMultiplierA),
    [computePlacement, garmentA, activeAnchorA, sizeMultiplierA],
  );

  const placementB = useMemo(
    () => computePlacement(garmentB, null, sizeMultiplierB),
    [computePlacement, garmentB, sizeMultiplierB],
  );

  const alignToBody = useCallback(() => {
    setLayerA({ ...placementA.center, scale: 1, rotation: 0, opacity: 1 });
    setLayerB({ ...placementB.center, scale: 1, rotation: 0, opacity: 1 });
  }, [placementA.center, placementB.center]);

  useEffect(() => {
    alignToBody();
  }, [alignToBody]);

  // Helper to draw garment on a canvas context
  const drawGarmentOnCtx = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      gImg: HTMLImageElement | null,
      plc: { width: number; height: number; center: { x: number; y: number } },
      lay: Layer,
    ) => {
      if (!gImg) return;
      const width = plc.width * lay.scale;
      const height = plc.height * lay.scale;
      ctx.save();
      ctx.globalAlpha = lay.opacity;
      ctx.translate(lay.x * size.width, lay.y * size.height);
      ctx.rotate((lay.rotation * Math.PI) / 180);
      ctx.drawImage(gImg, -width / 2, -height / 2, width, height);
      ctx.restore();
    },
    [size.height, size.width],
  );

  // Helper to draw guide lines on a canvas context
  const drawGuideOnCtx = useCallback(
    (ctx: CanvasRenderingContext2D, alpha = 0.85) => {
      if (!showGuide || !guide) return;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
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
    },
    [guide, scaleFactor, showGuide, size.width],
  );

  // Render Split Canvas with Central Sliding Toggle (Look A on Left, Look B on Right)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !photo || viewMode === "sideBySide") return;

    canvas.width = size.width;
    canvas.height = size.height;
    ctx.clearRect(0, 0, size.width, size.height);

    const firstLook = !swapSides ? "A" : "B";
    const secondLook = !swapSides ? "B" : "A";

    const gFirst = firstLook === "A" ? garmentA : garmentB;
    const plcFirst = firstLook === "A" ? placementA : placementB;
    const layFirst = firstLook === "A" ? layerA : layerB;

    const gSecond = secondLook === "A" ? garmentA : garmentB;
    const plcSecond = secondLook === "A" ? placementA : placementB;
    const laySecond = secondLook === "A" ? layerA : layerB;

    if (viewMode === "single") {
      // Single look rendering
      ctx.drawImage(photo, 0, 0, size.width, size.height);
      drawGuideOnCtx(ctx, 0.9);
      if (singleFocusLook === "A") {
        drawGarmentOnCtx(ctx, garmentA, placementA, layerA);
      } else {
        drawGarmentOnCtx(ctx, garmentB, placementB, layerB);
      }
      return;
    }

    // Split Canvas Mode: Left is Look 1 (0 to splitPx), Right is Look 2 (splitPx to width)
    const splitPx = (splitPosition / 100) * size.width;

    // 1. Draw base photo
    ctx.drawImage(photo, 0, 0, size.width, size.height);

    // 2. Draw Left Look clipped to (0, 0, splitPx, height)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitPx, size.height);
    ctx.clip();
    drawGuideOnCtx(ctx, 0.8);
    drawGarmentOnCtx(ctx, gFirst, plcFirst, layFirst);
    ctx.restore();

    // 3. Draw Right Look clipped to (splitPx, 0, width - splitPx, height)
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitPx, 0, Math.max(0, size.width - splitPx), size.height);
    ctx.clip();
    drawGuideOnCtx(ctx, 0.8);
    drawGarmentOnCtx(ctx, gSecond, plcSecond, laySecond);
    ctx.restore();
  }, [
    drawGarmentOnCtx,
    drawGuideOnCtx,
    garmentA,
    garmentB,
    layerA,
    layerB,
    photo,
    placementA,
    placementB,
    singleFocusLook,
    size.height,
    size.width,
    splitPosition,
    swapSides,
    viewMode,
  ]);

  // Render Side-by-Side Synchronized Dual Views
  useEffect(() => {
    if (viewMode !== "sideBySide" || !photo) return;

    const firstLook = !swapSides ? "A" : "B";
    const secondLook = !swapSides ? "B" : "A";

    const gLeft = firstLook === "A" ? garmentA : garmentB;
    const plcLeft = firstLook === "A" ? placementA : placementB;
    const layLeft = firstLook === "A" ? layerA : layerB;

    const gRight = secondLook === "A" ? garmentA : garmentB;
    const plcRight = secondLook === "A" ? placementA : placementB;
    const layRight = secondLook === "A" ? layerA : layerB;

    // 1. Render Left Canvas (Look 1 on User Body)
    const leftCanvas = sideBySideLeftRef.current;
    if (leftCanvas) {
      const leftCtx = leftCanvas.getContext("2d");
      if (leftCtx) {
        leftCanvas.width = size.width;
        leftCanvas.height = size.height;
        leftCtx.clearRect(0, 0, size.width, size.height);
        leftCtx.drawImage(photo, 0, 0, size.width, size.height);
        drawGuideOnCtx(leftCtx, 0.75);
        drawGarmentOnCtx(leftCtx, gLeft, plcLeft, layLeft);
      }
    }

    // 2. Render Right Canvas (Look 2 on User Body)
    const rightCanvas = sideBySideRightRef.current;
    if (rightCanvas) {
      const rightCtx = rightCanvas.getContext("2d");
      if (rightCtx) {
        rightCanvas.width = size.width;
        rightCanvas.height = size.height;
        rightCtx.clearRect(0, 0, size.width, size.height);
        rightCtx.drawImage(photo, 0, 0, size.width, size.height);
        drawGuideOnCtx(rightCtx, 0.75);
        drawGarmentOnCtx(rightCtx, gRight, plcRight, layRight);
      }
    }
  }, [
    drawGarmentOnCtx,
    drawGuideOnCtx,
    garmentA,
    garmentB,
    layerA,
    layerB,
    photo,
    placementA,
    placementB,
    size.height,
    size.width,
    swapSides,
    viewMode,
  ]);

  // Central Slider Bar Dragging Logic
  const handleSliderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setIsDraggingSlider(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSliderPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSlider || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width;
    const clampedPct = Math.max(0, Math.min(100, Math.round(relativeX * 100)));
    setSplitPosition(clampedPct);
  };

  const handleSliderPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSlider) {
      setIsDraggingSlider(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
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
  const handleCanvasPointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>,
    target: "A" | "B",
  ) => {
    if (isDraggingSlider) return;
    const currentLayer = target === "A" ? layerA : layerB;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    dragRef.current = {
      pointerId: event.pointerId,
      dx: currentLayer.x - px,
      dy: currentLayer.y - py,
      target,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveTabLook(target);
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    if (drag.target === "A") {
      setLayerA((current) => ({
        ...current,
        x: Math.max(0.1, Math.min(0.9, px + drag.dx)),
        y: Math.max(0.1, Math.min(0.9, py + drag.dy)),
      }));
    } else {
      setLayerB((current) => ({
        ...current,
        x: Math.max(0.1, Math.min(0.9, px + drag.dx)),
        y: Math.max(0.1, Math.min(0.9, py + drag.dy)),
      }));
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  // Handle uploading Outfit B image
  const handleUploadOutfitB = (file: File | undefined | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLookBSource(String(reader.result));
      setLookBTitle(file.name.replace(/\.[^.]+$/, ""));
      setShowOutfitBPicker(false);
    };
    reader.readAsDataURL(file);
  };

  // Download Look handler
  const download = (mode: "sideBySide" | "split" | "singleA" | "singleB" = "sideBySide") => {
    if (!photo) return;

    if (mode === "sideBySide" || viewMode === "sideBySide") {
      // Export dual-panel side-by-side high-res editorial comparison card
      const exportCanvas = document.createElement("canvas");
      const gap = Math.round(size.width * 0.03);
      exportCanvas.width = size.width * 2 + gap;
      exportCanvas.height = size.height;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return;

      // Fill background
      ctx.fillStyle = "#1e1c1a";
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Left Look
      const leftCanvas = sideBySideLeftRef.current;
      if (leftCanvas) {
        ctx.drawImage(leftCanvas, 0, 0);
      } else {
        ctx.drawImage(photo, 0, 0, size.width, size.height);
        drawGarmentOnCtx(ctx, garmentA, placementA, layerA);
      }

      // Right Look
      const rightCanvas = sideBySideRightRef.current;
      if (rightCanvas) {
        ctx.drawImage(rightCanvas, size.width + gap, 0);
      } else {
        ctx.save();
        ctx.translate(size.width + gap, 0);
        ctx.drawImage(photo, 0, 0, size.width, size.height);
        drawGarmentOnCtx(ctx, garmentB, placementB, layerB);
        ctx.restore();
      }

      // Editorial divider line & badges
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(size.width + gap / 2, 0);
      ctx.lineTo(size.width + gap / 2, size.height);
      ctx.stroke();

      const fontSize = Math.max(14, Math.round(size.width * 0.024));
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 6;

      const titleA =
        comparisonType === "size"
          ? `${garmentTitle} • Size ${lookASizeId.toUpperCase()}`
          : garmentTitle;
      const titleB =
        comparisonType === "size"
          ? `${garmentTitle} • Size ${lookBSizeId.toUpperCase()}`
          : lookBTitle;

      ctx.fillText(`LOOK A: ${titleA.toUpperCase()}`, 24, 38);
      ctx.fillText(`LOOK B: ${titleB.toUpperCase()}`, size.width + gap + 24, 38);
      ctx.restore();

      const link = document.createElement("a");
      link.download = `style-mirror-comparison-${comparisonType}.png`;
      link.href = exportCanvas.toDataURL("image/png");
      link.click();
      return;
    }

    // Split Canvas Export
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = size.width;
    exportCanvas.height = size.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(canvas, 0, 0);

    const splitPx = (splitPosition / 100) * size.width;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = Math.max(2, size.width * 0.003);
    ctx.beginPath();
    ctx.moveTo(splitPx, 0);
    ctx.lineTo(splitPx, size.height);
    ctx.stroke();

    const fontSize = Math.max(14, Math.round(size.width * 0.022));
    ctx.font = `600 ${fontSize}px sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 6;

    const leftLabel = !swapSides
      ? comparisonType === "size"
        ? `LOOK A • SIZE ${lookASizeId.toUpperCase()}`
        : `LOOK A • ${garmentTitle.slice(0, 20).toUpperCase()}`
      : comparisonType === "size"
        ? `LOOK B • SIZE ${lookBSizeId.toUpperCase()}`
        : `LOOK B • ${lookBTitle.slice(0, 20).toUpperCase()}`;

    const rightLabel = !swapSides
      ? comparisonType === "size"
        ? `LOOK B • SIZE ${lookBSizeId.toUpperCase()}`
        : `LOOK B • ${lookBTitle.slice(0, 20).toUpperCase()}`
      : comparisonType === "size"
        ? `LOOK A • SIZE ${lookASizeId.toUpperCase()}`
        : `LOOK A • ${garmentTitle.slice(0, 20).toUpperCase()}`;

    ctx.fillText(leftLabel, 20, 36);
    ctx.textAlign = "right";
    ctx.fillText(rightLabel, size.width - 20, 36);
    ctx.restore();

    const link = document.createElement("a");
    link.download = `style-mirror-split-comparison.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  const leftLookTitle = !swapSides ? "Look A" : "Look B";
  const rightLookTitle = !swapSides ? "Look B" : "Look A";

  const activeLayer = activeTabLook === "A" ? layerA : layerB;
  const setActiveLayer = activeTabLook === "A" ? setLayerA : setLayerB;

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <div className="surface flex flex-col gap-3 p-3">
        {/* Top Viewport Toolbar */}
        <div className="flex flex-col gap-2.5 border-b border-border/60 pb-3 px-1">
          {/* Comparison Mode & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Compare What: Outfits vs Sizes */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mr-1 hidden sm:inline">
                Compare:
              </span>
              <div className="inline-flex rounded-lg bg-secondary/80 p-0.5 border border-border/60">
                <button
                  type="button"
                  onClick={() => setComparisonType("outfit")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    comparisonType === "outfit"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Compare two different garments or outfits side by side"
                >
                  <Shirt className="size-3" />
                  <span>Two Outfits</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonType("size")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    comparisonType === "size"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Compare two different sizes (e.g. Size S vs Size L) on your body"
                >
                  <Scale className="size-3" />
                  <span>Two Sizes</span>
                </button>
              </div>
            </div>

            {/* Viewport Mode Switcher */}
            <div className="flex items-center gap-1.5">
              <div className="inline-flex rounded-lg bg-secondary/80 p-0.5 border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewMode("sideBySide")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    viewMode === "sideBySide"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Side-by-side synchronized rendering views"
                >
                  <Columns className="size-3" />
                  <span>Side-by-Side</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("split")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    viewMode === "split"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Split canvas with central draggable slider wipe"
                >
                  <SlidersHorizontal className="size-3" />
                  <span>Sliding Wipe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("single")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    viewMode === "single"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Focus on single look"
                >
                  <Maximize2 className="size-3" />
                  <span>Single</span>
                </button>
              </div>

              {/* Reset View & Swap */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSwapSides(!swapSides)}
                className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Swap Left and Right looks"
              >
                <ArrowLeftRight className="size-3" />
                <span className="hidden sm:inline">Swap</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSplitPosition(50);
                  alignToBody();
                }}
                className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer text-foreground hover:bg-secondary border-border/80 shadow-2xs font-medium"
                title="Reset slider to 50% and align garments to body"
              >
                <RotateCcw className="size-3 text-muted-foreground" />
                <span>Reset View</span>
              </Button>
            </div>
          </div>

          {/* Interactive Sliding Toggle Bar between Look A and Look B */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-secondary/40 border border-border/50 p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Sparkles className="size-3.5 text-gold" />
                <span>Comparison Sliding Toggle:</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {viewMode === "split"
                  ? "Drag slider horizontally across your photo"
                  : "Slide to focus or balance between Look A and Look B"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSplitPosition(0);
                  setSingleFocusLook("A");
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  splitPosition === 0 || singleFocusLook === "A"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "hover:bg-secondary text-muted-foreground"
                }`}
              >
                Look A (100%)
              </button>

              <div className="w-24 sm:w-32 px-1">
                <Slider
                  value={[splitPosition]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([val]) => {
                    if (val !== undefined) setSplitPosition(val);
                  }}
                  className="cursor-ew-resize"
                />
              </div>

              <button
                type="button"
                onClick={() => setSplitPosition(50)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  splitPosition === 50
                    ? "bg-primary/20 text-primary font-bold"
                    : "hover:bg-secondary text-muted-foreground"
                }`}
                title="Balance 50/50"
              >
                50% Split
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitPosition(100);
                  setSingleFocusLook("B");
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  splitPosition === 100 || singleFocusLook === "B"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "hover:bg-secondary text-muted-foreground"
                }`}
              >
                Look B (100%)
              </button>
            </div>
          </div>
        </div>

        {garmentAFailed || garmentBFailed ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-background/95 p-3 text-sm text-destructive shadow-sm"
          >
            Couldn't load one of the garment images directly — try uploading an alternative image.
          </div>
        ) : null}

        {/* ================= VIEWPORT RENDERING ================= */}
        {viewMode === "sideBySide" ? (
          /* Side-by-Side Dual Synced Rendering Views on User's Body */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {/* Left Synced View: Look A */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" />
                  <span>
                    {leftLookTitle}:{" "}
                    {comparisonType === "size" ? `Size ${lookASizeId.toUpperCase()}` : garmentTitle}
                  </span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {comparisonType === "size" ? `Fit ${lookASizeId.toUpperCase()}` : `Outfit A`}
                </span>
              </div>
              <div className="surface overflow-hidden rounded-md border border-border/80 relative group">
                <canvas
                  ref={sideBySideLeftRef}
                  onPointerDown={(e) => handleCanvasPointerDown(e, !swapSides ? "A" : "B")}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="checkerboard w-full h-auto block cursor-grab touch-none active:cursor-grabbing select-none"
                />
                <div className="absolute bottom-2 left-2 z-10 pointer-events-none rounded bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-xs border border-border/60">
                  {comparisonType === "size"
                    ? `Size ${lookASizeId.toUpperCase()} • Scale ${Math.round(sizeMultiplierA * 100)}%`
                    : garmentTitle}
                </div>
              </div>
            </div>

            {/* Right Synced View: Look B */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Sparkles className="size-3 text-gold" />
                  <span>
                    {rightLookTitle}:{" "}
                    {comparisonType === "size" ? `Size ${lookBSizeId.toUpperCase()}` : lookBTitle}
                  </span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  {comparisonType === "size" ? `Fit ${lookBSizeId.toUpperCase()}` : `Outfit B`}
                </span>
              </div>
              <div className="surface overflow-hidden rounded-md border border-primary/40 relative group">
                <canvas
                  ref={sideBySideRightRef}
                  onPointerDown={(e) => handleCanvasPointerDown(e, !swapSides ? "B" : "A")}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="checkerboard w-full h-auto block cursor-grab touch-none active:cursor-grabbing select-none"
                />
                <div className="absolute bottom-2 left-2 z-10 pointer-events-none rounded bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-xs border border-border/60">
                  {comparisonType === "size"
                    ? `Size ${lookBSizeId.toUpperCase()} • Scale ${Math.round(sizeMultiplierB * 100)}%`
                    : lookBTitle}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Central Split Slider / Wipe Viewport */
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-md select-none touch-none"
            style={{ touchAction: "none" }}
          >
            {/* View Badges */}
            {viewMode === "split" && (
              <>
                <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-md shadow-xs border border-border/60">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span>
                    Left:{" "}
                    {comparisonType === "size"
                      ? `Size ${(!swapSides ? lookASizeId : lookBSizeId).toUpperCase()}`
                      : (!swapSides ? garmentTitle : lookBTitle).slice(0, 22)}
                  </span>
                </div>

                <div className="absolute top-3 right-3 z-10 pointer-events-none flex items-center gap-1.5 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-medium text-primary-foreground backdrop-blur-md shadow-xs">
                  <Sparkles className="size-3 text-gold" />
                  <span>
                    Right:{" "}
                    {comparisonType === "size"
                      ? `Size ${(!swapSides ? lookBSizeId : lookASizeId).toUpperCase()}`
                      : (!swapSides ? lookBTitle : garmentTitle).slice(0, 22)}
                  </span>
                </div>
              </>
            )}

            {/* Main Interactive Canvas */}
            <canvas
              ref={canvasRef}
              onPointerDown={(e) => handleCanvasPointerDown(e, activeTabLook)}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="checkerboard w-full h-auto block cursor-grab touch-none active:cursor-grabbing rounded-md"
            />

            {/* Central Interactive Vertical Slider Bar */}
            {viewMode === "split" && (
              <div
                role="slider"
                tabIndex={0}
                aria-label="Comparison split slider"
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
                ? "Drag central vertical slider horizontally across your body to compare • Drag garment on canvas to adjust"
                : viewMode === "sideBySide"
                  ? "Side-by-side live comparison on your calibrated pose • Click & drag on either look to adjust position"
                  : "Single look focus mode • Use sliding toggle to switch looks"}
            </span>
          </span>
          <span className="font-mono text-[10px]">
            {comparisonType === "size"
              ? `Sizes: ${lookASizeId.toUpperCase()} vs ${lookBSizeId.toUpperCase()}`
              : `Outfits: Look A vs Look B`}
          </span>
        </div>
      </div>

      {/* ================= CONTROLS & OUTFIT / SIZE SELECTORS ================= */}
      <div className="surface space-y-6 p-6">
        {/* Look A / Look B Customization Tabs */}
        <div>
          <p className="eyebrow">Comparison Controls</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-secondary/80 p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setActiveTabLook("A")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTabLook === "A"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="size-2 rounded-full bg-primary" />
                <span>Look A: {garmentTitle.slice(0, 16)}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTabLook("B")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTabLook === "B"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="size-3 text-gold" />
                <span>
                  Look B:{" "}
                  {comparisonType === "size"
                    ? `Size ${lookBSizeId.toUpperCase()}`
                    : lookBTitle.slice(0, 16)}
                </span>
              </button>
            </div>

            {onOpenColorStudio && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenColorStudio}
                className="text-xs gap-1.5 cursor-pointer h-8"
              >
                <Palette className="size-3 text-primary" />
                <span className="hidden sm:inline">Color Atelier</span>
              </Button>
            )}
          </div>
        </div>

        {/* SIZE SELECTOR: Compare sizes with accurate proportional scaling */}
        <div className="rounded-xl border border-border bg-secondary/25 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Tag className="size-3.5 text-primary" />
              <span>{activeTabLook === "A" ? "Look A" : "Look B"} Size & Fit Specification</span>
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {activeTabLook === "A"
                ? `${COMPARISON_SIZES.find((s) => s.id === lookASizeId)?.description}`
                : `${COMPARISON_SIZES.find((s) => s.id === lookBSizeId)?.description}`}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {COMPARISON_SIZES.map((sizeOpt) => {
              const isSelected =
                activeTabLook === "A" ? lookASizeId === sizeOpt.id : lookBSizeId === sizeOpt.id;

              return (
                <button
                  key={sizeOpt.id}
                  type="button"
                  onClick={() => {
                    if (activeTabLook === "A") {
                      setLookASizeId(sizeOpt.id);
                    } else {
                      setLookBSizeId(sizeOpt.id);
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-xs font-bold"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="text-xs font-semibold">{sizeOpt.label}</span>
                  <span
                    className={`text-[9px] mt-0.5 ${
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {Math.round(sizeOpt.scaleMultiplier * 100)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* OUTFIT B SELECTOR (When editing Look B in outfit comparison) */}
        {comparisonType === "outfit" && (
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Shirt className="size-3.5 text-primary" />
                <span>Look B Outfit Selection ({lookBTitle})</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowOutfitBPicker(!showOutfitBPicker)}
                className="h-7 text-xs text-primary hover:underline cursor-pointer"
              >
                {showOutfitBPicker ? "Done" : "Change Garment B"}
              </Button>
            </div>

            {/* Quick Preset Garments */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CURATED_OUTFITS_B.map((preset) => {
                const isSelected = lookBSource === preset.imageUrl;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setLookBSource(preset.imageUrl);
                      setLookBTitle(preset.title);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs font-semibold"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={preset.imageUrl}
                      alt={preset.title}
                      className="size-8 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium truncate text-foreground">
                        {preset.title}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate">{preset.category}</p>
                    </div>
                    {isSelected && <Check className="size-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>

            {/* Upload or Pick from Closet for Look B */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Upload className="size-3.5" />
                <span>Upload Garment for Look B</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadOutfitB(e.target.files?.[0])}
                />
              </label>

              {customGarmentDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLookBSource(customGarmentDataUrl);
                    setLookBTitle("Color Atelier Custom Theme");
                  }}
                  className="text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Palette className="size-3" />
                  <span>Use Bespoke Color Atelier</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Layer Fine-Tuning Sliders for the Active Look */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              <span>Fine-Tuning: Look {activeTabLook}</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                // Synchronize placement from Look A to Look B or vice versa
                if (activeTabLook === "A") {
                  setLayerB({ ...layerA });
                } else {
                  setLayerA({ ...layerB });
                }
              }}
              className="h-6 text-[11px] px-2 text-primary hover:underline cursor-pointer"
            >
              Sync Placement to Other Look
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Scale Adjustment</Label>
              <span className="text-muted-foreground font-mono text-xs">
                {Math.round(activeLayer.scale * 100)}%
              </span>
            </div>
            <Slider
              value={[activeLayer.scale]}
              min={0.5}
              max={2.0}
              step={0.01}
              onValueChange={([value]) =>
                setActiveLayer((current) => ({ ...current, scale: value ?? current.scale }))
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Rotation</Label>
              <span className="text-muted-foreground font-mono text-xs">
                {Math.round(activeLayer.rotation)}°
              </span>
            </div>
            <Slider
              value={[activeLayer.rotation]}
              min={-45}
              max={45}
              step={1}
              onValueChange={([value]) =>
                setActiveLayer((current) => ({
                  ...current,
                  rotation: value ?? current.rotation,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Fabric Opacity</Label>
              <span className="text-muted-foreground font-mono text-xs">
                {Math.round(activeLayer.opacity * 100)}%
              </span>
            </div>
            <Slider
              value={[activeLayer.opacity]}
              min={0.2}
              max={1}
              step={0.01}
              onValueChange={([value]) =>
                setActiveLayer((current) => ({
                  ...current,
                  opacity: value ?? current.opacity,
                }))
              }
            />
          </div>
        </div>

        {/* Pose Guide Toggle */}
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

        {/* Action Buttons & Downloads */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            onClick={() => download(viewMode === "split" ? "split" : "sideBySide")}
            size="lg"
            className="cursor-pointer gap-2"
          >
            <Download className="size-4" />
            <span>
              {viewMode === "split" ? "Download Split Comparison" : "Download Side-by-Side Card"}
            </span>
          </Button>

          <Button variant="outline" onClick={alignToBody} className="cursor-pointer">
            <Crosshair className="size-4" />
            Snap Both to Shoulders
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              setLayerA((curr) => ({ ...curr, rotation: 0, scale: 1 }));
              setLayerB((curr) => ({ ...curr, rotation: 0, scale: 1 }));
            }}
            className="cursor-pointer"
          >
            <RotateCcw className="size-4" />
            Reset Fits
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {viewMode === "split"
            ? `Download exports the exact horizontal split position showing Look A and Look B side by side.`
            : `Download creates a high-resolution editorial side-by-side card comparing both outfits or sizes on your body.`}
        </p>
      </div>
    </section>
  );
}
