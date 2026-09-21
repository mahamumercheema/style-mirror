import { useState } from "react";
import { Info, Pencil, RotateCcw, Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BodyType, Measurements } from "@/lib/pose";

const BODY_TYPES: BodyType[] = ["Rectangle", "Triangle", "Inverted triangle", "Hourglass"];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md bg-secondary/60 p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function MeasurementsCard({
  measurements,
  original,
  onChange,
}: {
  measurements: Measurements;
  original: Measurements;
  onChange: (next: Measurements) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [heightInput, setHeightInput] = useState<string>(
    measurements.userHeightCm ? String(measurements.userHeightCm) : "",
  );

  const pct = (value: number) => `${Math.round(value * 100)}%`;

  // Real scale calibration calculations
  const userHeight = Number(heightInput);
  const isCalibrated = userHeight > 50 && userHeight < 250;

  // Derive estimated cm from normalized ratios
  const shoulderRatio =
    measurements.heightToShoulderRatio > 0 ? 1 / measurements.heightToShoulderRatio : 0.15;
  const estimatedShoulderCm = isCalibrated ? Math.round(userHeight * shoulderRatio) : null;
  const estimatedTorsoCm = isCalibrated
    ? Math.round(userHeight * (measurements.torsoHeightRatio || 0.28))
    : null;
  const estimatedLegCm = isCalibrated
    ? Math.round(userHeight * (measurements.legLengthRatio || 0.52))
    : null;

  const handleHeightChange = (val: string) => {
    setHeightInput(val);
    const num = Number(val);
    if (num > 50 && num < 250) {
      onChange({
        ...measurements,
        userHeightCm: num,
        estimatedShoulderWidthCm: Math.round(num * shoulderRatio),
        estimatedTorsoHeightCm: Math.round(num * (measurements.torsoHeightRatio || 0.28)),
        estimatedLegLengthCm: Math.round(num * (measurements.legLengthRatio || 0.52)),
      });
    } else {
      onChange({
        ...measurements,
        userHeightCm: undefined,
        estimatedShoulderWidthCm: undefined,
        estimatedTorsoHeightCm: undefined,
        estimatedLegLengthCm: undefined,
      });
    }
  };

  return (
    <section className="surface p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Step 02 — Body read</p>
          <h2 className="mt-1 text-2xl font-display">Detected proportions</h2>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <Button variant="ghost" size="sm" onClick={() => onChange(original)}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setEditing((value) => !value)}>
            <Pencil className="size-3.5" />
            {editing ? "Done" : "Adjust"}
          </Button>
        </div>
      </div>

      <p className="flex gap-2 rounded-md bg-accent/12 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-foreground/70" />
        These figures are normalized proportions calculated from your photo's detected landmarks.
        They reflect body ratios rather than absolute tailoring measurements.
      </p>

      {/* Proportions Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Height-to-shoulder"
          value={`${measurements.heightToShoulderRatio.toFixed(1)}×`}
          hint="Body height vs shoulder span"
        />
        <Stat
          label="Torso ratio"
          value={pct(measurements.torsoHeightRatio || 0.28)}
          hint="Vertical spine to total height"
        />
        <Stat
          label="Leg ratio"
          value={pct(measurements.legLengthRatio || 0.52)}
          hint="Hip to ankle proportion"
        />
        <Stat
          label="Shoulder width"
          value={pct(measurements.shoulderWidthRatio)}
          hint="Of photo frame width"
        />
        <Stat
          label="Hip width"
          value={pct(measurements.hipWidthRatio)}
          hint="Of photo frame width"
        />
        <Stat
          label="Body silhouette"
          value={measurements.bodyType}
          hint={`Shoulder:hip ratio ${measurements.shoulderToHipRatio.toFixed(2)}`}
        />
      </div>

      {/* Optional Real-World Reference Scale Calibration */}
      <div className="rounded-lg border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Ruler className="size-4 text-accent-foreground/80" />
            <div>
              <p className="text-sm font-medium">Height calibration (optional)</p>
              <p className="text-xs text-muted-foreground">
                Enter your height to estimate real-world dimensions in centimeters.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="e.g. 175"
              min={100}
              max={230}
              value={heightInput}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="w-24 text-sm"
            />
            <span className="text-xs text-muted-foreground font-medium">cm</span>
          </div>
        </div>

        {isCalibrated ? (
          <div className="mt-4 grid gap-3 border-t border-border/70 pt-3 text-xs sm:grid-cols-3">
            <div className="rounded bg-secondary/50 p-2.5">
              <span className="text-muted-foreground">Est. shoulder span</span>
              <p className="mt-0.5 text-base font-semibold">{estimatedShoulderCm} cm</p>
            </div>
            <div className="rounded bg-secondary/50 p-2.5">
              <span className="text-muted-foreground">Est. torso height</span>
              <p className="mt-0.5 text-base font-semibold">{estimatedTorsoCm} cm</p>
            </div>
            <div className="rounded bg-secondary/50 p-2.5">
              <span className="text-muted-foreground">Est. leg length</span>
              <p className="mt-0.5 text-base font-semibold">{estimatedLegCm} cm</p>
            </div>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="height-ratio">Height ratio (×)</Label>
            <Input
              id="height-ratio"
              type="number"
              step="0.1"
              value={measurements.heightToShoulderRatio.toFixed(1)}
              onChange={(event) =>
                onChange({
                  ...measurements,
                  heightToShoulderRatio: Number(event.target.value) || 0,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shoulder-width">Shoulder width (%)</Label>
            <Input
              id="shoulder-width"
              type="number"
              value={Math.round(measurements.shoulderWidthRatio * 100)}
              onChange={(event) =>
                onChange({
                  ...measurements,
                  shoulderWidthRatio: (Number(event.target.value) || 0) / 100,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hip-width">Hip width (%)</Label>
            <Input
              id="hip-width"
              type="number"
              value={Math.round(measurements.hipWidthRatio * 100)}
              onChange={(event) =>
                onChange({
                  ...measurements,
                  hipWidthRatio: (Number(event.target.value) || 0) / 100,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body-type">Body silhouette</Label>
            <Select
              value={measurements.bodyType}
              onValueChange={(value) => onChange({ ...measurements, bodyType: value as BodyType })}
            >
              <SelectTrigger id="body-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BODY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </section>
  );
}
