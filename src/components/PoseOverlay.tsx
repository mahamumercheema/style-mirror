import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DetectedKeypoint, SkeletonLine } from "@/lib/pose";

const LOW_LANDMARK_SCORE = 0.5;

export function PoseOverlay({
  photoUrl,
  keypoints,
  skeletonLines,
  confidence,
  detectedCount,
  totalCount,
  lowConfidenceMeasurements = [],
  backgroundRemoved = false,
}: {
  photoUrl: string;
  keypoints: DetectedKeypoint[];
  skeletonLines: SkeletonLine[];
  confidence: number;
  detectedCount?: number;
  totalCount?: number;
  lowConfidenceMeasurements?: string[];
  backgroundRemoved?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = photoUrl;
    return () => {
      img.onload = null;
    };
  }, [photoUrl]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set internal resolution matching natural image size (capped for performance)
    const maxDimension = 1200;
    const scaleDown = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scaleDown);
    const height = Math.round(img.naturalHeight * scaleDown);

    canvas.width = width;
    canvas.height = height;

    const scaleFactor = width / img.naturalWidth;

    // Draw base photograph
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    if (showSkeleton) {
      ctx.save();

      // Draw skeleton connecting lines
      ctx.lineWidth = Math.max(2, Math.round(width * 0.0035));
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const line of skeletonLines) {
        ctx.beginPath();
        // Warm clay / subtle gold editorial tone
        ctx.strokeStyle = "rgba(184, 134, 102, 0.85)";
        ctx.moveTo(line.from.x * scaleFactor, line.from.y * scaleFactor);
        ctx.lineTo(line.to.x * scaleFactor, line.to.y * scaleFactor);
        ctx.stroke();
      }

      // Draw keypoint joints
      for (const kp of keypoints) {
        if (kp.score < 0.15) continue;
        const x = kp.x * scaleFactor;
        const y = kp.y * scaleFactor;

        // Outer translucent halo (amber for weakly detected joints)
        const weak = kp.score < LOW_LANDMARK_SCORE;
        ctx.beginPath();
        ctx.fillStyle = weak ? "rgba(217, 119, 6, 0.45)" : "rgba(184, 134, 102, 0.35)";
        ctx.arc(x, y, Math.max(5, width * 0.007), 0, Math.PI * 2);
        ctx.fill();

        // Inner solid core
        ctx.beginPath();
        ctx.fillStyle = weak ? "#FDE68A" : "#FAF8F5";
        ctx.strokeStyle = "rgba(45, 38, 32, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.arc(x, y, Math.max(2.5, width * 0.0035), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [imageLoaded, keypoints, showSkeleton, skeletonLines]);

  const confidencePct = Math.round(confidence * 100);

  return (
    <div className="surface flex flex-col overflow-hidden">
      <div className="relative w-full overflow-hidden bg-muted/30">
        <canvas
          ref={canvasRef}
          className="checkerboard block h-auto max-h-[32rem] w-full object-contain"
        />

        {/* Floating status pill */}
        <div className="absolute top-3 left-3 right-36 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium backdrop-blur-sm shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {confidencePct}% landmark confidence
          </span>
          {detectedCount && totalCount ? (
            <span className="hidden items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-sm sm:flex shadow-sm">
              <CheckCircle2 className="size-3 text-emerald-600" />
              {detectedCount}/{totalCount} landmarks
            </span>
          ) : null}
          {backgroundRemoved ? (
            <span className="hidden items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-sm sm:flex shadow-sm">
              <Wand2 className="size-3 text-accent-foreground/70" />
              Background removed
            </span>
          ) : null}
        </div>

        {/* Toggle overlay button */}
        <div className="absolute top-3 right-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowSkeleton((prev) => !prev)}
            className="h-8 gap-1.5 bg-background/90 px-2.5 text-xs backdrop-blur-sm shadow-sm"
          >
            {showSkeleton ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {showSkeleton ? "Hide overlay" : "Show overlay"}
          </Button>
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 text-xs">
        {lowConfidenceMeasurements.length > 0 ? (
          <p className="flex items-start gap-1.5 text-amber-700">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <span className="font-medium">Low confidence:</span>{" "}
              {lowConfidenceMeasurements.join(", ")}. Amber joints were hard to see.
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="size-3.5" />
            All measurements detected with good confidence
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-accent-foreground/70" />
          <span>Real-time pose detected on your device</span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="skeleton-toggle" className="cursor-pointer text-xs">
            Show joints & skeleton
          </Label>
          <Switch id="skeleton-toggle" checked={showSkeleton} onCheckedChange={setShowSkeleton} />
        </div>
      </div>
    </div>
  );
}
