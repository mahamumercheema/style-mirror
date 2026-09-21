import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImageUp,
  Info,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GUIDELINES = [
  "Stand front-facing, arms slightly away from your body",
  "Full body in frame, from head to feet",
  "Plain wall or uncluttered background",
  "Even lighting, fitted clothes read best",
];

type ImageMeta = {
  width: number;
  height: number;
  aspectRatio: number;
  fileName: string;
  sizeKb: number;
};

export function PhotoUploader({
  photoUrl,
  busy,
  onPhoto,
  onRemove,
  onContinue,
}: {
  photoUrl?: string | null;
  busy?: boolean;
  onPhoto: (dataUrl: string) => void;
  onRemove?: () => void;
  onContinue?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationNote, setValidationNote] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);
  const [meta, setMeta] = useState<ImageMeta | null>(null);

  const validateImage = (dataUrl: string, file: File) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = width / Math.max(height, 1);
      const sizeKb = Math.round(file.size / 1024);

      setMeta({
        width,
        height,
        aspectRatio,
        fileName: file.name,
        sizeKb,
      });

      if (aspectRatio > 1.25) {
        setValidationNote({
          type: "warning",
          message:
            "Landscape orientation detected. Full-body portrait photos with head, hips, and feet in frame give the best pose read.",
        });
      } else if (width < 350 || height < 500) {
        setValidationNote({
          type: "warning",
          message:
            "Photo resolution is on the lower side. A clearer, higher-resolution photo ensures more accurate landmark detection.",
        });
      } else {
        setValidationNote({
          type: "success",
          message: "Full-body portrait detected. Ready for in-browser pose & proportion analysis.",
        });
      }
    };
    img.onerror = () => {
      setError("Failed to process that image. Please try a different photo.");
    };
    img.src = dataUrl;
  };

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;

      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setError("This file type isn't supported. Please use a JPG, PNG, or WebP photo.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError("That photo is over 20 MB. Please choose a smaller photo.");
        return;
      }

      setError(null);
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result);
        validateImage(result, file);
        onPhoto(result);
      };
      reader.onerror = () => setError("We couldn't read this image. Please try another file.");
      reader.readAsDataURL(file);
    },
    [onPhoto],
  );

  return (
    <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
      {photoUrl ? (
        /* Image Preview State inside Step 01 Area */
        <div className="surface overflow-hidden p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Photo selected</p>
              <h3 className="font-display text-2xl">Preview & check</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                <RefreshCw className="size-3.5" />
                Replace
              </Button>
              {onRemove ? (
                <Button variant="ghost" size="sm" onClick={onRemove} disabled={busy}>
                  <Trash2 className="size-3.5 text-destructive" />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>

          <div className="relative mx-auto flex max-h-[26rem] w-full items-center justify-center overflow-hidden rounded-md bg-muted/40 p-2">
            <img
              src={photoUrl}
              alt="Uploaded full-body preview"
              className="max-h-[24rem] w-auto rounded object-contain shadow-sm"
            />
          </div>

          {meta ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-y border-border py-2.5">
              <span className="truncate max-w-[200px]">{meta.fileName}</span>
              <span>
                {meta.width} × {meta.height} px · {meta.sizeKb} KB
              </span>
            </div>
          ) : null}

          {validationNote ? (
            <div
              className={cn(
                "flex items-start gap-2.5 rounded-md p-3 text-xs",
                validationNote.type === "warning" &&
                  "bg-amber-500/10 text-amber-900 dark:text-amber-200",
                validationNote.type === "success" &&
                  "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
                validationNote.type === "info" && "bg-secondary text-secondary-foreground",
              )}
            >
              {validationNote.type === "warning" ? (
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <p>{validationNote.message}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Your photo is processed in this browser and is not stored.
            </p>
            {onContinue ? (
              <Button onClick={onContinue} disabled={busy} size="lg" className="gap-2">
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Continue to analysis</span>
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>
      ) : (
        /* Empty Upload Drop Area */
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex min-h-[22rem] cursor-pointer flex-col items-center justify-center gap-5 rounded-lg border border-dashed px-8 py-14 text-center transition-all",
            dragging
              ? "border-accent bg-accent/10 scale-[0.99]"
              : "border-border bg-card hover:border-accent/60 hover:bg-card/80",
          )}
        >
          {busy ? (
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary">
              <ImageUp className="size-6 text-secondary-foreground" />
            </span>
          )}
          <div className="space-y-1.5">
            <h2 className="text-2xl">Drop your full-body photo</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Click anywhere to browse or drop an image file. Accepts JPG, PNG or WebP.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            disabled={busy}
            size="lg"
          >
            <Camera className="size-4" />
            Choose a photo
          </Button>

          <p className="text-xs text-muted-foreground">
            Your photo is processed in this browser and is not stored.
          </p>

          {error ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>
      )}

      <aside className="surface p-6">
        <p className="eyebrow">For the best read</p>
        <ul className="mt-4 space-y-3">
          {GUIDELINES.map((line, index) => (
            <li key={line} className="flex gap-3 text-sm text-muted-foreground">
              <span className="font-display text-base text-accent-foreground/70">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-md bg-secondary/50 p-3.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground flex items-center gap-1.5 mb-1">
            <Info className="size-3.5 text-accent-foreground/70" />
            Local browser privacy
          </p>
          Pose estimation and measurement calculations run entirely locally on your device using
          MoveNet (TensorFlow.js).
        </div>
      </aside>
    </div>
  );
}
