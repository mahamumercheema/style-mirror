import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

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
        // Cobalt accent
        ctx.strokeStyle = "rgba(123, 143, 224, 0.85)";
        ctx.moveTo(line.from.x * scaleFactor, line.from.y * scaleFactor);
        ctx.lineTo(line.to.x * scaleFactor, line.to.y * scaleFactor);
        ctx.stroke();
      }

      // Draw keypoint joints
      for (const kp of keypoints) {
        if (kp.score < 0.15) continue;
        const x = kp.x * scaleFactor;
        const y = kp.y * scaleFactor;

        // Outer translucent halo (coral for weakly detected joints, so they stand out from cobalt)
        const weak = kp.score < LOW_LANDMARK_SCORE;
        ctx.beginPath();
        ctx.fillStyle = weak ? "rgba(255, 107, 107, 0.5)" : "rgba(123, 143, 224, 0.35)";
        ctx.arc(x, y, Math.max(5, width * 0.007), 0, Math.PI * 2);
        ctx.fill();

        // Inner solid core
        ctx.beginPath();
        ctx.fillStyle = weak ? "#FFC9C9" : "#FAF8F5";
        ctx.strokeStyle = "rgba(45, 38, 32, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.arc(x, y, Math.max(2.5, width * 0.0035), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [imageLoaded, keypoints, showSkeleton, skeletonLines]);

  return (
    // Fills its parent: the photo (with skeleton) scales to fit, the bars stay at the bottom
    <div className="surface flex h-full flex-col overflow-hidden">
      <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-muted/30">
        <canvas
          ref={canvasRef}
          className="checkerboard absolute inset-0 block size-full object-contain"
        />

        {/* Toggle overlay button */}
        <div className="absolute top-3 right-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowSkeleton((prev) => !prev)}
            className="h-8 gap-1.5 bg-background/90 px-2.5 text-xs backdrop-blur-sm"
          >
            {showSkeleton ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {showSkeleton ? "Hide overlay" : "Show overlay"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-xs text-muted-foreground">
        <div>
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
