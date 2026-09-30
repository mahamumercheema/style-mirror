import { useState } from "react";
import { ArrowRight, Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  cmToFeetInches,
  feetInchesToCm,
  MAX_HEIGHT_CM,
  MIN_HEIGHT_CM,
  readUnitPreference,
  saveUnitPreference,
} from "@/lib/body-measurements";

type Unit = "cm" | "ft_in";

export function HeightCalibrationCard({
  initialCm,
  onSubmit,
}: {
  initialCm: number | null;
  onSubmit: (heightCm: number) => void;
}) {
  const initialFtIn = initialCm ? cmToFeetInches(initialCm) : null;
  // Follows the shared unit preference: inches → feet/inches (the default), cm → cm
  const [unit, setUnitState] = useState<Unit>(() =>
    readUnitPreference() === "cm" ? "cm" : "ft_in",
  );
  const setUnit = (next: Unit) => {
    setUnitState(next);
    saveUnitPreference(next === "cm" ? "cm" : "in");
  };
  const [cmInput, setCmInput] = useState(initialCm ? String(Math.round(initialCm)) : "");
  const [ftInput, setFtInput] = useState(initialFtIn ? String(initialFtIn.feet) : "");
  const [inInput, setInInput] = useState(initialFtIn ? String(initialFtIn.inches) : "");

  const heightCm =
    unit === "cm" ? Number(cmInput) : feetInchesToCm(Number(ftInput) || 0, Number(inInput) || 0);
  const hasInput = unit === "cm" ? cmInput !== "" : ftInput !== "";
  const isValid = heightCm >= MIN_HEIGHT_CM && heightCm <= MAX_HEIGHT_CM;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isValid) onSubmit(heightCm);
  };

  return (
    <form onSubmit={handleSubmit} className="surface mx-auto max-w-xl space-y-5 p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Ruler className="size-5 text-gold-ink" />
        </div>
        <div>
          <p className="eyebrow">Before we measure</p>
          <h2 className="mt-1 text-2xl font-display">How tall are you?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your height is the ruler for the photo: we compare it with your head-to-heel distance to
            convert every measurement into real centimeters.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={unit === "cm" ? "height-cm" : "height-ft"}>Your height</Label>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={unit}
            onValueChange={(value) => value && setUnit(value as Unit)}
          >
            <ToggleGroupItem value="cm" className="px-3 text-xs">
              cm
            </ToggleGroupItem>
            <ToggleGroupItem value="ft_in" className="px-3 text-xs">
              ft / in
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {unit === "cm" ? (
          <div className="flex items-center gap-2">
            <Input
              id="height-cm"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 168"
              min={MIN_HEIGHT_CM}
              max={MAX_HEIGHT_CM}
              value={cmInput}
              onChange={(e) => setCmInput(e.target.value)}
              className="w-32"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">cm</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              id="height-ft"
              type="number"
              inputMode="numeric"
              placeholder="5"
              min={3}
              max={7}
              value={ftInput}
              onChange={(e) => setFtInput(e.target.value)}
              className="w-20"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">ft</span>
            <Input
              aria-label="Inches"
              type="number"
              inputMode="numeric"
              placeholder="6"
              min={0}
              max={11}
              value={inInput}
              onChange={(e) => setInInput(e.target.value)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">in</span>
            {isValid ? (
              <span className="ml-2 text-xs text-muted-foreground">
                = {Math.round(heightCm)} cm
              </span>
            ) : null}
          </div>
        )}

        {hasInput && !isValid ? (
          <p className="text-xs text-destructive">
            Enter a height between {MIN_HEIGHT_CM} and {MAX_HEIGHT_CM} cm (3′4″ – 7′6″).
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Measure without shoes if you can — it directly affects every result.
          </p>
        )}
      </div>

      <Button type="submit" disabled={!isValid} className="w-full gap-2 cursor-pointer">
        Measure my photo
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
