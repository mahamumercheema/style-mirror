import { useCallback, useRef, useState } from "react";
import { Camera, ImageUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GUIDELINES = [
  "Stand front-facing, arms slightly away from your body",
  "Full body in frame, from head to feet",
  "Plain wall or uncluttered background",
  "Even lighting, fitted clothes read best",
];

export function PhotoUploader({
  busy,
  onPhoto,
}: {
  busy?: boolean;
  onPhoto: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("That file isn't an image. Use a JPG, PNG or WebP photo.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError("That photo is over 15 MB. Try a smaller one.");
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = () => onPhoto(String(reader.result));
      reader.onerror = () => setError("Couldn't read that photo. Try another file.");
      reader.readAsDataURL(file);
    },
    [onPhoto],
  );

  return (
    <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
      <div
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
          "flex min-h-[22rem] flex-col items-center justify-center gap-5 rounded-lg border border-dashed px-8 py-14 text-center transition-colors",
          dragging ? "border-accent bg-accent/10" : "border-border bg-card",
        )}
      >
        {busy ? (
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary">
            <ImageUp className="size-6 text-secondary-foreground" />
          </span>
        )}
        <div className="space-y-1.5">
          <h2 className="text-2xl">Drop your full-body photo</h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Your photo never leaves this browser tab — measuring runs on your own device.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={busy} size="lg">
          <Camera className="size-4" />
          Choose a photo
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

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
      </aside>
    </div>
  );
}
