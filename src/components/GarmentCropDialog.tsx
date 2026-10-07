import { useRef, useState } from "react";
import { Crop as CropIcon } from "lucide-react";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Pre-selected on open: the centre 70% of the image */
const DEFAULT_CROP: PercentCrop = { unit: "%", x: 15, y: 15, width: 70, height: 70 };

/**
 * Image area height: the viewport minus the modal's 64px margin and its header, footer and
 * padding, so the whole image always fits without scrolling.
 */
const IMAGE_MAX_HEIGHT = "calc(100svh - 64px - 240px)";

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read the cropped image."));
    reader.readAsDataURL(blob);
  });
}

/** Draws the selected region of the image at its natural resolution and returns a JPEG. */
async function cropImage(image: HTMLImageElement, crop: PercentCrop) {
  // Percentages of the displayed box map 1:1 onto the natural pixel size
  const sx = Math.round((crop.x / 100) * image.naturalWidth);
  const sy = Math.round((crop.y / 100) * image.naturalHeight);
  const width = Math.max(1, Math.round((crop.width / 100) * image.naturalWidth));
  const height = Math.max(1, Math.round((crop.height / 100) * image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff"; // flatten transparent PNGs onto white
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, sx, sy, width, height, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("Couldn't export the cropped image.");
  return blobToDataUrl(blob);
}

/**
 * Lets the user frame the garment, e.g. to cut a product photo out of a full-page screenshot,
 * before it's used for try-on. Opens with a centred crop box that can be moved and resized.
 */
export function GarmentCropDialog({
  src,
  onCancel,
  onConfirm,
}: {
  src: string | null;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<PercentCrop>();
  const [saving, setSaving] = useState(false);

  const hasCrop = Boolean(crop && crop.width > 0 && crop.height > 0);

  const applyCrop = async () => {
    const image = imageRef.current;
    if (!image || !crop || !hasCrop) return;
    setSaving(true);
    try {
      onConfirm(await cropImage(image, crop));
    } catch (error) {
      console.error("Garment crop failed", error);
      toast.error("Couldn't crop that image. Try again, or use the full image.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={Boolean(src)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="flex max-h-[calc(100svh-64px)] w-[calc(100vw-32px)] max-w-[960px] flex-col gap-4 p-4 sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle>Crop to the garment</DialogTitle>
          <DialogDescription>
            Move or resize the box so it covers just the garment. Leave out page text, buttons and
            other items.
          </DialogDescription>
        </DialogHeader>

        {src ? (
          <div className="flex min-h-0 justify-center">
            <ReactCrop
              {...(crop ? { crop } : {})}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              keepSelection
              ruleOfThirds
              className="[--rc-border-color:var(--color-gold)] [--rc-drag-handle-bg-colour:var(--color-gold)] [--rc-drag-handle-size:14px] [--rc-drag-handle-mobile-size:26px]"
              style={{ maxHeight: IMAGE_MAX_HEIGHT }}
            >
              <img
                ref={imageRef}
                src={src}
                alt="Garment to crop"
                onLoad={() => setCrop(DEFAULT_CROP)}
                className="block max-w-full object-contain"
                style={{ maxHeight: IMAGE_MAX_HEIGHT }}
              />
            </ReactCrop>
          </div>
        ) : null}

        <DialogFooter className="items-center gap-2 sm:gap-2">
          {!hasCrop ? (
            <p className="text-xs text-muted-foreground sm:mr-auto">Drag to select the garment</p>
          ) : null}
          <Button variant="secondary" onClick={() => src && onConfirm(src)} disabled={saving}>
            Use full image
          </Button>
          <Button onClick={() => void applyCrop()} disabled={saving || !hasCrop}>
            <CropIcon className="size-4" />
            Use crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
