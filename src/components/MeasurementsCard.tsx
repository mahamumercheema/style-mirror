import { useState } from "react";
import { AlertTriangle, Info, PencilLine, RotateCcw, Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  formatLength,
  fromUnit,
  LOW_CONFIDENCE,
  readUnitPreference,
  saveUnitPreference,
  toUnit,
  type LengthUnit,
  type ManualKey,
  type ManualMeasurements,
  type ResolvedMeasurements,
  type ResolvedValue,
} from "@/lib/body-measurements";
import type { Measurements } from "@/lib/pose";
import { cn } from "@/lib/utils";

/** Manual entry fields. min/max are in cm; values are always stored in cm. */
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
    hint: "Stand barefoot against a wall; measure floor to the top of your head",
    min: 100,
    max: 230,
    aiValue: (r) => r.height,
  },
  {
    key: "shoulderWidth",
    label: "Shoulder width",
    hint: "Across the back, from the outer edge of one shoulder to the other",
    min: 25,
    max: 70,
    aiValue: (r) => r.shoulderWidth,
  },
  {
    key: "bust",
    label: "Bust circumference",
    hint: "Wrap the tape around the fullest part of your chest, under the arms, kept level",
    min: 60,
    max: 200,
    aiValue: (r) => r.bustCircumference,
  },
  {
    key: "waist",
    label: "Waist circumference",
    hint: "Wrap the tape around your natural waist, the narrowest point",
    min: 40,
    max: 200,
    aiValue: (r) => r.waistCircumference,
  },
  {
    key: "hips",
    label: "Hip circumference",
    hint: "Wrap the tape around the fullest part of your hips and seat",
    min: 50,
    max: 200,
    aiValue: (r) => r.hipCircumference,
  },
  {
    key: "torsoLength",
    label: "Torso length",
    hint: "From the top of your shoulder straight down to your hip bone",
    min: 30,
    max: 90,
    aiValue: (r) => r.torsoLength,
  },
  {
    key: "inseam",
    label: "Inseam",
    hint: "Along the inside of your leg, from the crotch to the ankle",
    min: 40,
    max: 130,
    aiValue: (r) => r.legLength,
  },
  {
    key: "armLength",
    label: "Arm length",
    hint: "Arm relaxed, from the outer shoulder edge down to the wrist bone",
    min: 35,
    max: 100,
    aiValue: (r) => r.armLength,
  },
];

function Stat({
  label,
  value,
  hint,
  lowConfidence,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  lowConfidence?: boolean | undefined;
}) {
  return (
    <div
      className={cn(
        "rounded-md bg-secondary/60 p-4",
        lowConfidence && "ring-1 ring-gold/50 border border-gold/40",
      )}
    >
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      {lowConfidence ? (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-gold-ink">
          <AlertTriangle className="size-3" />
          Low confidence — consider entering it manually
        </p>
      ) : null}
    </div>
  );
}

function UnitToggle({
  unit,
  onChange,
}: {
  unit: LengthUnit;
  onChange: (unit: LengthUnit) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={unit}
      onValueChange={(value) => value && onChange(value as LengthUnit)}
      aria-label="Measurement units"
    >
      <ToggleGroupItem value="cm" className="px-3 text-xs">
        cm
      </ToggleGroupItem>
      <ToggleGroupItem value="in" className="px-3 text-xs">
        in
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

const isLow = (value: ResolvedValue | null) =>
  Boolean(value && value.source === "ai" && value.confidence < LOW_CONFIDENCE);

/** Labels of AI-estimated measurements whose confidence is low. */
export function lowConfidenceLabels(resolved: ResolvedMeasurements) {
  const entries: [string, ResolvedValue | null][] = [
    ["Shoulder width", resolved.shoulderWidth],
    ["Bust", resolved.bustWidth],
    ["Waist", resolved.waistWidth],
    ["Hips", resolved.hipWidth],
    ["Torso length", resolved.torsoLength],
    ["Leg length", resolved.legLength],
    ["Arm length", resolved.armLength],
  ];
  const labels = entries.filter(([, value]) => isLow(value)).map(([label]) => label);
  const curve = resolved.hipCurve;
  if (curve && curve.source === "ai" && curve.confidence < LOW_CONFIDENCE) {
    labels.push("Hip curve");
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

  // Display unit only — every value is stored and passed around in cm
  const [unit, setUnitState] = useState<LengthUnit>(readUnitPreference);

  const [drafts, setDrafts] = useState<Partial<Record<ManualKey, string>>>(() =>
    Object.fromEntries(
      Object.entries(manual).map(([k, v]) => [k, String(toUnit(v, readUnitPreference()))]),
    ),
  );

  const setUnit = (next: LengthUnit) => {
    setUnitState(next);
    saveUnitPreference(next);
    // Re-express typed values in the new unit
    setDrafts((prev) => {
      const converted: Partial<Record<ManualKey, string>> = { ...prev };
      for (const key of Object.keys(manual) as ManualKey[]) {
        const cmValue = manual[key];
        if (cmValue !== undefined) converted[key] = String(toUnit(cmValue, next));
      }
      return converted;
    });
  };

  const fmt = (value: ResolvedValue | null) => (value ? formatLength(value.cm, unit) : "—");

  const setField = (key: ManualKey, text: string, min: number, max: number) => {
    setDrafts((prev) => ({ ...prev, [key]: text }));
    const cmValue = fromUnit(Number(text), unit);
    const next = { ...manual };
    if (text !== "" && cmValue >= min && cmValue <= max) next[key] = cmValue;
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
    // Unboxed; columns follow the width it's given (a narrow side column or full width)
    <section className="@container space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Step 02 — Body read</p>
          <h2 className="mt-1 text-2xl font-display">Your measurements</h2>
        </div>
        <div className="flex items-center gap-2">
          {!calibrated ? (
            <span className="flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1 text-xs font-medium text-gold-ink">
              <Info className="size-3.5" />
              Estimated
            </span>
          ) : null}
          <UnitToggle unit={unit} onChange={setUnit} />
        </div>
      </div>

      {calibrated ? (
        <p className="flex gap-2 rounded-md bg-accent/12 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-gold-ink" />
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gold/40 p-3 text-xs text-gold-ink">
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
        <div className="grid gap-3 @sm:grid-cols-2 @3xl:grid-cols-3">
          <Stat
            label="Height"
            value={fmt(resolved.height)}
            hint="Reference baseline for the scale"
          />
          <Stat
            label="Shoulder width (outer edge)"
            value={fmt(resolved.shoulderWidth)}
            hint={
              resolved.shoulderWidth?.source === "user"
                ? "You entered this"
                : calibrated
                  ? `Joint-to-joint ${formatLength(calibrated.shoulderJointWidth.cm * (resolved.height ? resolved.height.cm / calibrated.heightCm : 1), unit)} + edge allowance`
                  : undefined
            }
            lowConfidence={isLow(resolved.shoulderWidth)}
          />
          <Stat
            label="Bust width (front view)"
            value={fmt(resolved.bustWidth)}
            hint={
              resolved.bustWidth?.basis === "approximation"
                ? resolved.bustWidth.source === "user"
                  ? "Estimated from your bust circumference"
                  : "Estimated from shoulders and hips — arms hid the chest outline"
                : "Straight line across the chest, as seen from the front"
            }
            lowConfidence={isLow(resolved.bustWidth)}
          />
          <Stat
            label="Bust (around)"
            value={fmt(resolved.bustCircumference)}
            hint={
              resolved.bustCircumference?.source === "user" &&
              resolved.bustCircumference.basis === "user"
                ? "You entered this"
                : "Estimated from front width — enter a tape measurement to be exact"
            }
          />
          <Stat
            label="Waist width (front view)"
            value={fmt(resolved.waistWidth)}
            hint={
              resolved.waistWidth?.basis === "approximation"
                ? resolved.waistWidth.source === "user"
                  ? "Estimated from your waist circumference"
                  : "Rough estimate — arms hid the waist outline"
                : "Straight line across, as seen from the front"
            }
            lowConfidence={isLow(resolved.waistWidth)}
          />
          <Stat
            label="Waist (around)"
            value={fmt(resolved.waistCircumference)}
            hint={
              resolved.waistCircumference?.source === "user" &&
              resolved.waistCircumference.basis === "user"
                ? "You entered this"
                : "Estimated from front width — enter a tape measurement to be exact"
            }
          />
          <Stat
            label="Hip width (front view)"
            value={fmt(resolved.hipWidth)}
            hint={
              resolved.hipWidth?.basis === "approximation"
                ? resolved.hipWidth.source === "user"
                  ? "Estimated from your hip circumference"
                  : "Rough estimate — arms hid the hip outline"
                : "Straight line across, as seen from the front"
            }
            lowConfidence={isLow(resolved.hipWidth)}
          />
          <Stat
            label="Hips (around)"
            value={fmt(resolved.hipCircumference)}
            hint={
              resolved.hipCircumference?.source === "user" &&
              resolved.hipCircumference.basis === "user"
                ? "You entered this"
                : "Estimated from front width — enter a tape measurement to be exact"
            }
          />
          <Stat
            label="Hip curve (outward bulge per side)"
            value={curve ? `+${formatLength(Math.max(0, curve.averageCm), unit)}` : "—"}
            hint={
              curve
                ? `${curveShape} · L ${formatLength(curve.leftCm, unit)} / R ${formatLength(curve.rightCm, unit)} · waist:hip width ${curve.waistToHipWidthRatio.toFixed(2)}`
                : undefined
            }
            lowConfidence={Boolean(
              curve && curve.source === "ai" && curve.confidence < LOW_CONFIDENCE,
            )}
          />
          <Stat
            label="Torso length"
            value={fmt(resolved.torsoLength)}
            hint={resolved.torsoLength?.source === "user" ? "You entered this" : "Shoulder to hip"}
            lowConfidence={isLow(resolved.torsoLength)}
          />
          <Stat
            label="Inseam / leg length"
            value={fmt(resolved.legLength)}
            hint={resolved.legLength?.source === "user" ? "You entered this" : "Hip to ankle"}
            lowConfidence={isLow(resolved.legLength)}
          />
          <Stat
            label="Arm length"
            value={fmt(resolved.armLength)}
            hint={resolved.armLength?.source === "user" ? "You entered this" : "Shoulder to wrist"}
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
            <PencilLine className="size-4 text-gold-ink" />
            <div>
              <Label htmlFor="manual-toggle" className="text-sm font-medium cursor-pointer">
                Manually enter measurements
              </Label>
              <p className="text-xs text-muted-foreground">
                Your numbers replace the AI estimates. Shoulder width also sets the garment size on
                the try-on canvas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {manualEnabled ? <UnitToggle unit={unit} onChange={setUnit} /> : null}
            <Switch
              id="manual-toggle"
              checked={manualEnabled}
              onCheckedChange={onManualEnabledChange}
            />
          </div>
        </div>

        {manualEnabled ? (
          <div className="space-y-4 border-t border-border/70 pt-4">
            <div className="grid gap-4 @sm:grid-cols-2">
              {MANUAL_FIELDS.map((field) => {
                const draft = drafts[field.key] ?? "";
                const applied = manual[field.key] !== undefined;
                const invalid = draft !== "" && !applied;
                const ai = field.aiValue(resolved);
                return (
                  <div key={field.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`manual-${field.key}`} className="text-xs">
                        {field.label} <span className="text-muted-foreground">({unit})</span>
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
                      step="0.1"
                      placeholder={ai && ai.source === "ai" ? `AI: ${toUnit(ai.cm, unit)}` : ""}
                      value={draft}
                      onChange={(e) => setField(field.key, e.target.value, field.min, field.max)}
                      className={cn(invalid && "border-destructive")}
                    />
                    <p
                      className={cn(
                        "text-[11px]",
                        invalid ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {invalid
                        ? `Enter ${toUnit(field.min, unit)}–${toUnit(field.max, unit)} ${unit}`
                        : field.hint}
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
