import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Info,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Ruler,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/**
 * Unified Core Measurements with combined circumference + front-width data.
 * Eliminates redundant split fields and provides a clean, single-frame view.
 */
const COMBINED_FIELDS: {
  key: ManualKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  getValue: (r: ResolvedMeasurements) => ResolvedValue | null;
  getSecondary: (r: ResolvedMeasurements, unit: LengthUnit) => string | null;
  checkLowConfidence: (r: ResolvedMeasurements) => boolean;
}[] = [
  {
    key: "height",
    label: "Height",
    hint: "Floor to head",
    min: 100,
    max: 230,
    getValue: (r) => r.height,
    getSecondary: () => "Scale baseline",
    checkLowConfidence: () => false,
  },
  {
    key: "shoulderWidth",
    label: "Shoulders",
    hint: "Outer edge to edge",
    min: 25,
    max: 70,
    getValue: (r) => r.shoulderWidth,
    getSecondary: (r, u) =>
      r.shoulderWidth?.source === "user" ? "Manual entry" : "Garment sizing key",
    checkLowConfidence: (r) => isLow(r.shoulderWidth),
  },
  {
    key: "bust",
    label: "Bust",
    hint: "Fullest chest circumference",
    min: 60,
    max: 200,
    getValue: (r) => r.bustCircumference,
    getSecondary: (r, u) =>
      r.bustWidth ? `Front: ${formatLength(r.bustWidth.cm, u)}` : "Circumference",
    checkLowConfidence: (r) => isLow(r.bustCircumference) || isLow(r.bustWidth),
  },
  {
    key: "waist",
    label: "Waist",
    hint: "Natural waistline",
    min: 40,
    max: 200,
    getValue: (r) => r.waistCircumference,
    getSecondary: (r, u) =>
      r.waistWidth ? `Front: ${formatLength(r.waistWidth.cm, u)}` : "Circumference",
    checkLowConfidence: (r) => isLow(r.waistCircumference) || isLow(r.waistWidth),
  },
  {
    key: "hips",
    label: "Hips",
    hint: "Fullest seat circumference",
    min: 50,
    max: 200,
    getValue: (r) => r.hipCircumference,
    getSecondary: (r, u) =>
      r.hipWidth ? `Front: ${formatLength(r.hipWidth.cm, u)}` : "Circumference",
    checkLowConfidence: (r) => isLow(r.hipCircumference) || isLow(r.hipWidth),
  },
  {
    key: "torsoLength",
    label: "Torso Length",
    hint: "Shoulder to hip",
    min: 30,
    max: 90,
    getValue: (r) => r.torsoLength,
    getSecondary: () => "Shoulder to hip",
    checkLowConfidence: (r) => isLow(r.torsoLength),
  },
  {
    key: "inseam",
    label: "Inseam",
    hint: "Crotch to ankle",
    min: 40,
    max: 130,
    getValue: (r) => r.legLength,
    getSecondary: () => "Leg length",
    checkLowConfidence: (r) => isLow(r.legLength),
  },
  {
    key: "armLength",
    label: "Arm Length",
    hint: "Shoulder to wrist",
    min: 35,
    max: 100,
    getValue: (r) => r.armLength,
    getSecondary: () => "Arm reach",
    checkLowConfidence: (r) => isLow(r.armLength),
  },
];

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
  onSaveToProfile,
  isSyncingProfile,
}: {
  measurements: Measurements;
  resolved: ResolvedMeasurements;
  manual: ManualMeasurements;
  manualEnabled: boolean;
  onManualChange: (next: ManualMeasurements) => void;
  onManualEnabledChange: (enabled: boolean) => void;
  onRecalibrate: () => void;
  onSaveToProfile?: () => void;
  isSyncingProfile?: boolean;
}) {
  const calibrated = measurements.calibrated;
  const [unit, setUnitState] = useState<LengthUnit>(readUnitPreference);

  const [drafts, setDrafts] = useState<Partial<Record<ManualKey, string>>>(() =>
    Object.fromEntries(
      Object.entries(manual).map(([k, v]) => [k, String(toUnit(v, readUnitPreference()))]),
    ),
  );

  const setUnit = (next: LengthUnit) => {
    setUnitState(next);
    saveUnitPreference(next);
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

  const hasManualOverrides = Object.keys(manual).length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
      {/* Unified Frame Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Your Measurements
            </h2>
            {calibrated ? (
              <span className="text-[11px] font-medium text-cobalt-text">
                · {Math.round(calibrated.heightCm)} cm baseline
              </span>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground">· Estimated</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {manualEnabled
              ? "Edit your tape measurements below. Values immediately update your fit."
              : "Calibrated proportions read from your pose and silhouette."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Unit Switch */}
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={unit}
            onValueChange={(value) => value && setUnit(value as LengthUnit)}
            aria-label="Measurement units"
            className="h-8 border-border"
          >
            <ToggleGroupItem value="in" className="h-7 px-2.5 text-xs font-medium cursor-pointer">
              in
            </ToggleGroupItem>
            <ToggleGroupItem value="cm" className="h-7 px-2.5 text-xs font-medium cursor-pointer">
              cm
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Inline Edit Toggle */}
          <Button
            type="button"
            variant={manualEnabled ? "secondary" : "outline"}
            size="sm"
            onClick={() => onManualEnabledChange(!manualEnabled)}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
          >
            {manualEnabled ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span>Done</span>
              </>
            ) : (
              <>
                <PencilLine className="size-3.5 text-cobalt-text" />
                <span>Customize</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Uncalibrated banner (if height has not been calibrated yet) */}
      {!calibrated && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-cobalt-border bg-cobalt-tint p-3 text-xs text-cobalt-text">
          <div className="flex items-center gap-2">
            <Info className="size-4 shrink-0" />
            <span>Calibrate with your exact height to lock accurate real-world dimensions.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRecalibrate}
            className="h-7 shrink-0 text-xs font-medium border-cobalt-border text-cobalt-text hover:bg-cobalt-tint cursor-pointer"
          >
            <Ruler className="size-3.5 mr-1" />
            Calibrate Height
          </Button>
        </div>
      )}

      {/* Unified Measurements Grid: 2 clean balanced columns, combined fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {COMBINED_FIELDS.map((field) => {
          const resolvedVal = field.getValue(resolved);
          const isUserCustom = manual[field.key] !== undefined;
          const isLowConf = !isUserCustom && field.checkLowConfidence(resolved);
          const secondary = field.getSecondary(resolved, unit);
          const draft = drafts[field.key] ?? "";
          const isInvalid = draft !== "" && !isUserCustom;

          return (
            <div
              key={field.key}
              className={cn(
                "group relative rounded-lg border border-border/80 bg-secondary/25 p-3 transition-colors hover:border-border",
                isUserCustom && "border-cobalt-border/60 bg-cobalt-tint/20",
                isInvalid && "border-destructive/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-foreground tracking-tight">
                    {field.label}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {secondary || field.hint}
                  </p>
                </div>

                {/* Status indicator or Reset button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isLowConf && (
                    <span
                      title="Low confidence estimate — consider customizing"
                      className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium"
                    >
                      <AlertTriangle className="size-3" />
                    </span>
                  )}
                  {isUserCustom && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-cobalt-text px-1.5 py-0.5 rounded-sm bg-cobalt-tint">
                        Custom
                      </span>
                      <button
                        type="button"
                        onClick={() => clearField(field.key)}
                        title="Reset to AI estimate"
                        className="cursor-pointer p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Value display or Inline input */}
              {manualEnabled ? (
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={`field-${field.key}`}
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={draft}
                      placeholder={
                        resolvedVal && resolvedVal.source === "ai"
                          ? String(toUnit(resolvedVal.cm, unit))
                          : ""
                      }
                      onChange={(e) => setField(field.key, e.target.value, field.min, field.max)}
                      className={cn(
                        "h-8 text-xs font-medium tabular-nums pr-8",
                        isInvalid && "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-mono pointer-events-none">
                      {unit}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-display text-2xl font-semibold tabular-nums text-foreground tracking-tight">
                    {fmt(resolvedVal)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unified Footer: Proportions Summary & Quick Actions */}
      <div className="border-t border-border/80 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground font-medium">Silhouette:</span>
            <span className="text-foreground">{measurements.bodyType}</span>
            <span className="text-[11px]">
              (Ratio {measurements.shoulderToHipRatio.toFixed(2)})
            </span>
          </div>

          {curve && (
            <div className="flex items-center gap-1.5">
              <span className="text-foreground font-medium">Hip Curve:</span>
              <span>
                +{formatLength(Math.max(0, curve.averageCm), unit)} · {curveShape}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {hasManualOverrides && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <RotateCcw className="size-3" />
              <span>Reset all to AI</span>
            </button>
          )}

          {calibrated && (
            <button
              type="button"
              onClick={onRecalibrate}
              className="flex items-center gap-1 text-[11px] text-cobalt-text hover:underline underline-offset-4 cursor-pointer"
            >
              <Ruler className="size-3" />
              <span>Re-measure height</span>
            </button>
          )}

          {onSaveToProfile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSyncingProfile}
              onClick={onSaveToProfile}
              className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer border-cobalt-border text-cobalt-text hover:bg-cobalt-tint"
            >
              {isSyncingProfile ? (
                <RefreshCw className="size-3 animate-spin" />
              ) : (
                <Save className="size-3" />
              )}
              <span>Save to Profile</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
