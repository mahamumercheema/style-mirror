import { useState } from "react";
import { AlertTriangle, BadgeCheck, Info, PencilLine, RotateCcw, Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  LOW_CONFIDENCE,
  type ManualKey,
  type ManualMeasurements,
  type ResolvedMeasurements,
  type ResolvedValue,
} from "@/lib/body-measurements";
import type { Measurements } from "@/lib/pose";
import { cn } from "@/lib/utils";

const MANUAL_FIELDS: {
  key: ManualKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  aiValue: (r: ResolvedMeasurements) => ResolvedValue | null;
}[] = [
  {
    key: "height",
    label: "Height",
    hint: "Barefoot",
    min: 100,
    max: 230,
    aiValue: (r) => r.height,
  },
  {
    key: "shoulderWidth",
    label: "Shoulder width",
    hint: "Straight across",
    min: 20,
    max: 70,
    aiValue: (r) => r.shoulderWidth,
  },
  {
    key: "waist",
    label: "Waist",
    hint: "Around, at the narrowest point",
    min: 40,
    max: 200,
    aiValue: (r) => r.waistCircumference,
  },
  {
    key: "hips",
    label: "Hips",
    hint: "Around, at the widest point",
    min: 50,
    max: 200,
    aiValue: (r) => r.hipCircumference,
  },
  {
    key: "inseam",
    label: "Inseam / leg length",
    hint: "Hip to ankle",
    min: 40,
    max: 130,
    aiValue: (r) => r.legLength,
  },
];

function SourceBadge({ value }: { value: ResolvedValue | { source: "user" | "ai" } }) {
  return value.source === "user" ? (
    <span className="inline-block whitespace-nowrap rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
      User-provided
    </span>
  ) : (
    <span className="inline-block whitespace-nowrap rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      AI-estimated
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
  resolved,
  lowConfidence,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  resolved?: ResolvedValue | { source: "user" | "ai" } | null | undefined;
  lowConfidence?: boolean | undefined;
}) {
  return (
    <div
      className={cn(
        "rounded-md bg-secondary/60 p-4",
        lowConfidence && "ring-1 ring-amber-500/50 bg-amber-500/5",
      )}
    >
      <p className="eyebrow">{label}</p>
      {resolved ? (
        <div className="mt-1.5">
          <SourceBadge value={resolved} />
        </div>
      ) : null}
      <p className="mt-2 font-display text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      {lowConfidence ? (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-700">
          <AlertTriangle className="size-3" />
          Low confidence — consider entering it manually
        </p>
      ) : null}
    </div>
  );
}

const cm = (value: ResolvedValue | null) => (value ? `${Math.round(value.cm)} cm` : "—");
const isLow = (value: ResolvedValue | null) =>
  Boolean(value && value.source === "ai" && value.confidence < LOW_CONFIDENCE);

/** Labels of AI-estimated measurements whose confidence is low. */
export function lowConfidenceLabels(resolved: ResolvedMeasurements) {
  const entries: [string, ResolvedValue | null][] = [
    ["Shoulder width", resolved.shoulderWidth],
    ["Waist", resolved.waistWidth],
    ["Hips", resolved.hipWidth],
    ["Torso length", resolved.torsoLength],
    ["Leg length", resolved.legLength],
    ["Arm length", resolved.armLength],
  ];
  const labels = entries.filter(([, value]) => isLow(value)).map(([label]) => label);
  const curve = resolved.hipCurve;
  if (curve && curve.source === "ai" && curve.confidence < LOW_CONFIDENCE) {
    labels.push("Hip curvature");
  }
  return labels;
}

export function MeasurementsCard({
  measurements,
  resolved,
  manual,
  manualEnabled,
  onManualChange,
  onManualEnabledChange,
  onRecalibrate,
}: {
  measurements: Measurements;
  resolved: ResolvedMeasurements;
  manual: ManualMeasurements;
  manualEnabled: boolean;
  onManualChange: (next: ManualMeasurements) => void;
  onManualEnabledChange: (enabled: boolean) => void;
  onRecalibrate: () => void;
}) {
  const calibrated = measurements.calibrated;
  const [drafts, setDrafts] = useState<Partial<Record<ManualKey, string>>>(() =>
    Object.fromEntries(Object.entries(manual).map(([k, v]) => [k, String(v)])),
  );

  const setField = (key: ManualKey, text: string, min: number, max: number) => {
    setDrafts((prev) => ({ ...prev, [key]: text }));
    const value = Number(text);
    const next = { ...manual };
    if (text !== "" && value >= min && value <= max) next[key] = value;
    else delete next[key];
    onManualChange(next);
  };

  const clearField = (key: ManualKey) => {
    setDrafts((prev) => ({ ...prev, [key]: "" }));
    const next = { ...manual };
    delete next[key];
    onManualChange(next);
  };

  const clearAll = () => {
    setDrafts({});
    onManualChange({});
  };

  const curve = resolved.hipCurve;
  const curveShape = !curve
    ? null
    : curve.averageCm < 2
      ? "Straight"
      : curve.averageCm < 5
        ? "Moderate curve"
        : "Pronounced curve";
  const hasAnyValue = Boolean(calibrated) || (manualEnabled && Object.keys(manual).length > 0);

  return (
    <section className="surface p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Step 02 — Body read</p>
          <h2 className="mt-1 text-2xl font-display">Your measurements</h2>
        </div>
        {calibrated ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700">
            <BadgeCheck className="size-3.5" />
            Confirmed via manual height · {Math.round(
              resolved.height?.cm ?? calibrated.heightCm,
            )}{" "}
            cm
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700">
            <Info className="size-3.5" />
            Estimated
          </span>
        )}
      </div>

      {calibrated ? (
        <p className="flex gap-2 rounded-md bg-accent/12 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-accent-foreground/70" />
          <span>
            Scaled from your {Math.round(calibrated.heightCm)} cm height using your{" "}
            {calibrated.scaleMethod === "silhouette"
              ? "head-to-heel outline"
              : calibrated.scaleMethod === "landmarks"
                ? "head and ankle landmarks"
                : "visible body (feet not detected — less accurate)"}
            . Photo-based measurements are typically within a few centimeters; widths are seen from
            the front only.
          </span>
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-amber-500/10 p-3 text-xs text-amber-800">
          <span>
            These proportions aren't calibrated yet. Add your height to get measurements in
            centimeters.
          </span>
          <Button size="sm" variant="outline" onClick={onRecalibrate} className="h-7 text-xs">
            <Ruler className="size-3.5" />
            Measure with my height
          </Button>
        </div>
      )}

      {hasAnyValue ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Height"
            value={cm(resolved.height)}
            hint="Reference baseline for the scale"
            resolved={resolved.height}
          />
          <Stat
            label="Shoulder width"
            value={cm(resolved.shoulderWidth)}
            hint="Straight line, shoulder to shoulder"
            resolved={resolved.shoulderWidth}
            lowConfidence={isLow(resolved.shoulderWidth)}
          />
          <Stat
            label="Waist width"
            value={cm(resolved.waistWidth)}
            hint={
              resolved.waistCircumference
                ? `≈ ${Math.round(resolved.waistCircumference.cm)} cm around`
                : undefined
            }
            resolved={resolved.waistWidth}
            lowConfidence={isLow(resolved.waistWidth)}
          />
          <Stat
            label="Hip width"
            value={cm(resolved.hipWidth)}
            hint={
              resolved.hipCircumference
                ? `≈ ${Math.round(resolved.hipCircumference.cm)} cm around`
                : undefined
            }
            resolved={resolved.hipWidth}
            lowConfidence={isLow(resolved.hipWidth)}
          />
          <Stat
            label="Hip curvature"
            value={curve ? `+${Math.max(0, Math.round(curve.averageCm))} cm` : "—"}
            hint={
              curve
                ? `${curveShape} per side · L ${Math.round(curve.leftCm)} / R ${Math.round(curve.rightCm)} cm · waist:hip ${curve.waistToHipWidthRatio.toFixed(2)}`
                : undefined
            }
            resolved={curve}
            lowConfidence={Boolean(
              curve && curve.source === "ai" && curve.confidence < LOW_CONFIDENCE,
            )}
          />
          <Stat
            label="Torso length"
            value={cm(resolved.torsoLength)}
            hint="Shoulder to hip"
            resolved={resolved.torsoLength}
            lowConfidence={isLow(resolved.torsoLength)}
          />
          <Stat
            label="Inseam / leg length"
            value={cm(resolved.legLength)}
            hint="Hip to ankle"
            resolved={resolved.legLength}
            lowConfidence={isLow(resolved.legLength)}
          />
          <Stat
            label="Arm length"
            value={cm(resolved.armLength)}
            hint="Shoulder to wrist"
            resolved={resolved.armLength}
            lowConfidence={isLow(resolved.armLength)}
          />
          <Stat
            label="Body silhouette"
            value={measurements.bodyType}
            hint={`Shoulder:hip ratio ${measurements.shoulderToHipRatio.toFixed(2)}`}
          />
        </div>
      ) : null}

      {/* Manual entry / override */}
      <div className="rounded-lg border border-border bg-card/60 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PencilLine className="size-4 text-accent-foreground/80" />
            <div>
              <Label htmlFor="manual-toggle" className="text-sm font-medium cursor-pointer">
                Manually enter measurements
              </Label>
              <p className="text-xs text-muted-foreground">
                Your numbers replace the AI estimates everywhere, including garment fit.
              </p>
            </div>
          </div>
          <Switch
            id="manual-toggle"
            checked={manualEnabled}
            onCheckedChange={onManualEnabledChange}
          />
        </div>

        {manualEnabled ? (
          <div className="space-y-4 border-t border-border/70 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {MANUAL_FIELDS.map((field) => {
                const draft = drafts[field.key] ?? "";
                const applied = manual[field.key] !== undefined;
                const invalid = draft !== "" && !applied;
                const ai = field.aiValue(resolved);
                return (
                  <div key={field.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`manual-${field.key}`} className="text-xs">
                        {field.label} <span className="text-muted-foreground">(cm)</span>
                      </Label>
                      {applied ? (
                        <button
                          type="button"
                          onClick={() => clearField(field.key)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="size-3" />
                          Use AI estimate
                        </button>
                      ) : null}
                    </div>
                    <Input
                      id={`manual-${field.key}`}
                      type="number"
                      inputMode="decimal"
                      min={field.min}
                      max={field.max}
                      placeholder={
                        ai && ai.source === "ai" ? `AI: ${Math.round(ai.cm)}` : field.hint
                      }
                      value={draft}
                      onChange={(e) => setField(field.key, e.target.value, field.min, field.max)}
                      className={cn(
                        applied && "border-emerald-500/60",
                        invalid && "border-destructive",
                      )}
                    />
                    <p
                      className={cn(
                        "text-[11px]",
                        invalid ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {invalid ? `Enter ${field.min}–${field.max} cm` : field.hint}
                    </p>
                  </div>
                );
              })}
            </div>
            {Object.keys(manual).length > 0 ? (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs">
                <RotateCcw className="size-3.5" />
                Switch all back to AI estimates
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {calibrated ? (
        <button
          type="button"
          onClick={onRecalibrate}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Re-measure with a different height
        </button>
      ) : null}
    </section>
  );
}
