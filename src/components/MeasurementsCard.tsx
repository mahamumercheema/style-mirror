import { useState } from "react";
import { Info, Pencil, RotateCcw } from "lucide-react";

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
  const pct = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Step 02 — Body read</p>
          <h2 className="mt-1 text-2xl">Estimated proportions</h2>
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

      <p className="mt-4 flex gap-2 rounded-md bg-accent/12 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-foreground/70" />
        These numbers are approximate. They are ratios read from one photo, not tailoring
        measurements — adjust anything that looks off.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Height ratio"
          value={`${measurements.heightToShoulderRatio.toFixed(1)}×`}
          hint="Body height vs shoulder width"
        />
        <Stat
          label="Shoulder width"
          value={pct(measurements.shoulderWidthRatio)}
          hint="Of photo width"
        />
        <Stat label="Hip width" value={pct(measurements.hipWidthRatio)} hint="Of photo width" />
        <Stat
          label="Body type"
          value={measurements.bodyType}
          hint={`Shoulder:hip ${measurements.shoulderToHipRatio.toFixed(2)}`}
        />
      </div>

      {editing ? (
        <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
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
            <Label htmlFor="body-type">Body type</Label>
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
