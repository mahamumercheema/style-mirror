import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ImageUp,
  Loader2,
  Lock,
  RefreshCw,
  Trash2,
  X,
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
    // The upload panel only; it fills the height its parent gives it
    <div className="h-full">
      {photoUrl ? (
        /* Image Preview State inside Step 01 Area */
        <div className="surface flex h-full flex-col gap-4 overflow-hidden p-4 sm:p-6">
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

          <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-md bg-muted/40">
            <img
              src={photoUrl}
              alt="Uploaded full-body preview"
              className="absolute inset-0 size-full object-contain p-2"
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

          {/* Validation still runs for every photo; only warnings are shown */}
          {validationNote && validationNote.type === "warning" ? (
            <div className="flex items-start gap-2.5 rounded-md border border-gold/40 p-3 text-xs text-gold-ink">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-gold-ink" />
              <p>{validationNote.message}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-4">
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
            "flex h-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-6 py-8 text-center transition-colors duration-300 sm:px-8",
            dragging
              ? "border-gold bg-foreground/[0.06]"
              : "border-white/30 bg-card hover:border-gold",
          )}
        >
          {busy ? (
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary">
              <ImageUp className="size-6 text-secondary-foreground" />
            </span>
          )}
          <h2 className="mt-5 text-2xl">Drop your full-body photo</h2>
          <p className="mt-2 mx-auto max-w-sm text-sm text-muted-foreground">
            Click anywhere to browse or drop an image file. Accepts JPG, PNG or WebP.
          </p>
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
            className="mt-6"
          >
            <Camera className="size-4" />
            Choose a photo
          </Button>

          {error ? (
            <p className="mt-4 flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** "For the best read" checklist, good/avoid examples and the privacy note (no card) */
export function PhotoGuidance() {
  return (
    <div className="flex flex-col">
      <p className="eyebrow">For the best read</p>
      <ul className="mt-4 space-y-3">
        {GUIDELINES.map((line, index) => (
          <li key={line} className="flex gap-3 text-[13px] text-muted-foreground">
            <span className="font-display text-base text-gold-ink">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {/* Good / avoid examples */}
      <div className="mt-8 grid max-w-sm grid-cols-2 gap-3">
        <PoseExample good />
        <PoseExample good={false} />
      </div>

      <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5 shrink-0 text-gold-ink" />
        Your photo is processed in this browser and never stored
      </p>
    </div>
  );
}

/**
 * Illustrated example photo: a full-length, front-facing figure with arms slightly out
 * ("Good"), or one turned side-on, arms against the body and cropped at the shins ("Avoid").
 */
function PoseExample({ good }: { good: boolean }) {
  return (
    <figure className="space-y-2">
      <div
        className={cn(
          "overflow-hidden rounded-md border bg-foreground/[0.04]",
          good ? "border-gold/50" : "border-border",
        )}
      >
        <svg
          viewBox="0 0 80 110"
          role="img"
          aria-label={
            good
              ? "Front-facing, full body, arms slightly away from the body"
              : "Side-on, arms against the body, cropped below the knees"
          }
          className="mx-auto block h-24 w-auto text-muted-foreground min-[900px]:h-28"
          fill="currentColor"
        >
          {good ? (
            <>
              <circle cx="40" cy="15" r="8" />
              <rect x="31" y="26" width="18" height="34" rx="5" />
              <rect x="20" y="28" width="6" height="30" rx="3" transform="rotate(14 23 28)" />
              <rect x="54" y="28" width="6" height="30" rx="3" transform="rotate(-14 57 28)" />
              <rect x="32" y="58" width="7" height="40" rx="3" />
              <rect x="41" y="58" width="7" height="40" rx="3" />
              <rect x="28" y="98" width="11" height="4" rx="2" />
              <rect x="41" y="98" width="11" height="4" rx="2" />
              <line x1="10" y1="104" x2="70" y2="104" stroke="currentColor" strokeOpacity=".3" />
            </>
          ) : (
            <>
              {/* Cropped: the frame cuts the figure off at the shins */}
              <circle cx="42" cy="22" r="9" />
              <rect x="34" y="34" width="13" height="40" rx="5" />
              <rect x="38" y="36" width="6" height="34" rx="3" opacity=".75" />
              <rect x="35" y="72" width="7" height="40" rx="3" />
              <rect x="41" y="72" width="7" height="40" rx="3" transform="rotate(6 44 72)" />
            </>
          )}
        </svg>
      </div>
      <figcaption className="flex items-center gap-1.5 text-xs">
        {good ? (
          <>
            <CheckCircle2 className="size-3.5 text-gold-ink" />
            <span className="text-foreground">Good</span>
          </>
        ) : (
          <>
            <X className="size-3.5 text-destructive" />
            <span className="text-muted-foreground">Avoid</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
