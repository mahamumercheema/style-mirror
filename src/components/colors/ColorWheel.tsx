import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  hslToHex,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  getFashionColorName,
  type ExtractedColor,
  type HarmonyType,
  type HSL,
} from "@/lib/color-palette";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface ColorWheelProps {
  baseColorHex: string;
  onBaseColorChange: (newHex: string) => void;
  extractedColors?: ExtractedColor[];
  activeHarmony?: HarmonyType | null;
  className?: string;
  size?: number;
}

export function ColorWheel({
  baseColorHex,
  onBaseColorChange,
  extractedColors = [],
  activeHarmony = "complementary",
  className,
  size = 280,
}: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Parse current base color HSL
  const currentHsl = useMemo(() => {
    const rgb = hexToRgb(baseColorHex);
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
  }, [baseColorHex]);

  const [lightness, setLightness] = useState<number>(currentHsl.l);

  // Sync lightness when external base color changes
  useEffect(() => {
    setLightness(currentHsl.l);
  }, [currentHsl.l]);

  // Radius definitions
  const radius = size / 2;
  const padding = 16;
  const wheelRadius = radius - padding;

  // Draw circular color wheel canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);

    ctx.clearRect(0, 0, size, size);

    const centerX = radius;
    const centerY = radius;

    // Draw full hue wheel with radial saturation gradient
    // Using angular segments for crisp rendering
    const segments = 360;
    const angleStep = (2 * Math.PI) / segments;

    for (let i = 0; i < segments; i++) {
      const startAngle = i * angleStep - Math.PI / 2;
      const endAngle = (i + 1.5) * angleStep - Math.PI / 2;
      const hue = i;

      const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, wheelRadius);

      // Center is neutral / desaturated; outer rim is saturated hue
      grad.addColorStop(0, `hsl(${hue}, 0%, ${lightness}%)`);
      grad.addColorStop(0.7, `hsl(${hue}, 80%, ${lightness}%)`);
      grad.addColorStop(1, `hsl(${hue}, 100%, ${lightness}%)`);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, wheelRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Outer refined border ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, wheelRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center focal dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fill();
  }, [size, wheelRadius, radius, lightness]);

  // Convert polar coordinates (angle + distance) to canvas X/Y
  const polarToXY = useCallback(
    (hue: number, sat: number) => {
      const angleRad = ((hue - 90) * Math.PI) / 180;
      const dist = (sat / 100) * wheelRadius;
      return {
        x: radius + dist * Math.cos(angleRad),
        y: radius + dist * Math.sin(angleRad),
      };
    },
    [radius, wheelRadius],
  );

  // Position of active base color
  const basePos = useMemo(() => {
    return polarToXY(currentHsl.h, currentHsl.s);
  }, [polarToXY, currentHsl.h, currentHsl.s]);

  // Harmony geometry coordinates
  const harmonyCoordinates = useMemo(() => {
    if (!activeHarmony) return null;
    const h = currentHsl.h;
    const s = currentHsl.s;

    switch (activeHarmony) {
      case "complementary": {
        const compHue = (h + 180) % 360;
        const compPos = polarToXY(compHue, s);
        return {
          type: "complementary",
          lines: [{ from: basePos, to: compPos }],
          points: [{ pos: compPos, label: "180° Comp", color: hslToHex(compHue, s, lightness) }],
        };
      }
      case "triadic": {
        const t1 = (h + 120) % 360;
        const t2 = (h + 240) % 360;
        const p1 = polarToXY(t1, s);
        const p2 = polarToXY(t2, s);
        return {
          type: "triadic",
          polygon: [basePos, p1, p2],
          points: [
            { pos: p1, label: "+120°", color: hslToHex(t1, s, lightness) },
            { pos: p2, label: "+240°", color: hslToHex(t2, s, lightness) },
          ],
        };
      }
      case "analogous": {
        const a1 = (h - 30 + 360) % 360;
        const a2 = (h + 30) % 360;
        const p1 = polarToXY(a1, s);
        const p2 = polarToXY(a2, s);
        return {
          type: "analogous",
          lines: [
            { from: basePos, to: p1 },
            { from: basePos, to: p2 },
          ],
          points: [
            { pos: p1, label: "-30°", color: hslToHex(a1, s, lightness) },
            { pos: p2, label: "+30°", color: hslToHex(a2, s, lightness) },
          ],
        };
      }
      case "splitComplementary": {
        const s1 = (h + 150) % 360;
        const s2 = (h + 210) % 360;
        const p1 = polarToXY(s1, s);
        const p2 = polarToXY(s2, s);
        return {
          type: "splitComplementary",
          polygon: [basePos, p1, p2],
          points: [
            { pos: p1, label: "+150°", color: hslToHex(s1, s, lightness) },
            { pos: p2, label: "+210°", color: hslToHex(s2, s, lightness) },
          ],
        };
      }
      case "monochromatic": {
        const innerPos = polarToXY(h, Math.max(15, s - 35));
        const outerPos = polarToXY(h, Math.min(100, s + 25));
        return {
          type: "monochromatic",
          lines: [{ from: innerPos, to: outerPos }],
          points: [
            {
              pos: innerPos,
              label: "Muted",
              color: hslToHex(h, Math.max(15, s - 35), lightness),
            },
            {
              pos: outerPos,
              label: "Vivid",
              color: hslToHex(h, Math.min(100, s + 25), lightness),
            },
          ],
        };
      }
      default:
        return null;
    }
  }, [activeHarmony, currentHsl.h, currentHsl.s, polarToXY, basePos, lightness]);

  // Handle pointer down / move on the wheel
  const handlePointerUpdate = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left - radius;
      const y = clientY - rect.top - radius;

      // Distance from center
      const distance = Math.hypot(x, y);
      const sat = Math.min(100, Math.max(5, Math.round((distance / wheelRadius) * 100)));

      // Angle relative to top (0 deg = red at top, 90 deg = green at right, etc.)
      const angleRad = Math.atan2(y, x);
      let deg = (angleRad * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;
      const hue = Math.round(deg % 360);

      const newHex = hslToHex(hue, sat, lightness);
      onBaseColorChange(newHex);
    },
    [radius, wheelRadius, lightness, onBaseColorChange],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerUpdate(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handlePointerUpdate(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleLightnessChange = ([newL]: number[]) => {
    const safeL = newL ?? 50;
    setLightness(safeL);
    const updatedHex = hslToHex(currentHsl.h, currentHsl.s, safeL);
    onBaseColorChange(updatedHex);
  };

  const colorName = getFashionColorName(baseColorHex);

  return (
    <div className={cn("flex flex-col items-center select-none", className)}>
      {/* Color Wheel SVG & Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative touch-none cursor-crosshair rounded-full transition-shadow duration-200"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          className="rounded-full shadow-inner pointer-events-none"
          style={{ width: size, height: size }}
        />

        {/* SVG Overlay for geometric harmony lines & markers */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Harmony Geometry */}
          {harmonyCoordinates?.lines?.map((line, idx) => (
            <line
              key={idx}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke="rgba(255, 255, 255, 0.95)"
              strokeWidth="2.5"
              strokeDasharray="4 3"
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.35))"
            />
          ))}

          {harmonyCoordinates?.polygon && (
            <polygon
              points={harmonyCoordinates.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="rgba(255, 255, 255, 0.15)"
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth="2"
              strokeDasharray="5 4"
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.35))"
            />
          )}

          {/* Harmony Suggestion Points */}
          {harmonyCoordinates?.points?.map((pt, idx) => (
            <g key={idx} transform={`translate(${pt.pos.x}, ${pt.pos.y})`}>
              <circle
                r="7"
                fill={pt.color}
                stroke="#ffffff"
                strokeWidth="2.5"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
              />
              <circle r="2.5" fill="#ffffff" />
            </g>
          ))}

          {/* Mood Board Extracted Palette Pins */}
          {extractedColors.map((extColor, idx) => {
            const pos = polarToXY(extColor.hsl.h, extColor.hsl.s);
            // Don't render pin if it's right on top of base
            const isNearBase = Math.hypot(pos.x - basePos.x, pos.y - basePos.y) < 12;
            if (isNearBase) return null;

            return (
              <g
                key={`mood-${idx}-${extColor.hex}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer transition-transform hover:scale-125"
              >
                <circle
                  r="5"
                  fill={extColor.hex}
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.4))"
                />
              </g>
            );
          })}

          {/* Main Active Base Marker */}
          <g transform={`translate(${basePos.x}, ${basePos.y})`}>
            {/* Outer pulsating glow ring */}
            <circle
              r="13"
              fill="none"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="2"
              className="animate-pulse"
            />
            {/* White boundary ring */}
            <circle
              r="10"
              fill={baseColorHex}
              stroke="#ffffff"
              strokeWidth="3"
              filter="drop-shadow(0 3px 6px rgba(0,0,0,0.5))"
            />
            {/* Inner target dot */}
            <circle r="2.5" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {/* Lightness Slider & Hue / Saturation readout */}
      <div className="w-full mt-4 space-y-3 px-1">
        <div className="flex items-center justify-between text-xs">
          <Label className="text-muted-foreground font-normal">Fabric Tone / Lightness</Label>
          <span className="font-mono text-xs text-foreground font-medium">{lightness}%</span>
        </div>
        <Slider
          value={[lightness]}
          min={10}
          max={92}
          step={1}
          onValueChange={handleLightnessChange}
          className="cursor-pointer"
        />

        {/* Selected Color Chip & Meta Details */}
        <div className="flex items-center justify-between gap-3 pt-1 rounded-lg border border-border/80 bg-secondary/30 p-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="size-7 rounded-md border border-black/10 shadow-xs shrink-0"
              style={{ backgroundColor: baseColorHex }}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{colorName}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">
                {baseColorHex} • H:{currentHsl.h}° S:{currentHsl.s}% L:{lightness}%
              </p>
            </div>
          </div>

          <label
            htmlFor="direct-hex-input"
            className="text-[11px] font-mono text-muted-foreground underline cursor-pointer hover:text-foreground shrink-0"
          >
            Hex
            <input
              id="direct-hex-input"
              type="color"
              value={baseColorHex}
              onChange={(e) => onBaseColorChange(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
