import { useState, useRef, useEffect, useCallback } from "react";
import {
  Shirt,
  Sparkles,
  Layers,
  CircleDot,
  Pipette,
  Check,
  RotateCcw,
  Download,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  type ExtractedColor,
  type GarmentColorTheme,
  getFashionColorName,
  isColorDark,
} from "@/lib/color-palette";
import { cn } from "@/lib/utils";

export type GarmentSilhouette = "blazer" | "overshirt" | "coat" | "kurta";

interface GarmentColorCustomizerProps {
  theme: GarmentColorTheme;
  onChange: (newTheme: GarmentColorTheme) => void;
  extractedPalette: ExtractedColor[];
  onGenerateCustomGarmentUrl?: (dataUrl: string) => void;
  className?: string;
}

export function GarmentColorCustomizer({
  theme,
  onChange,
  extractedPalette,
  onGenerateCustomGarmentUrl,
  className,
}: GarmentColorCustomizerProps) {
  const [activeChannel, setActiveChannel] = useState<
    "mainBody" | "trims" | "buttons" | "stitching"
  >("mainBody");
  const [silhouette, setSilhouette] = useState<GarmentSilhouette>("blazer");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate a high-resolution transparent PNG of the garment with applied colors
  const renderGarmentToDataUrl = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 800;
    const height = 960;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const bodyCol = theme.mainBody;
    const trimCol = theme.trims;
    const btnCol = theme.buttons;
    const stitchCol = theme.stitching;

    ctx.save();

    if (silhouette === "blazer") {
      // 1. MAIN BODY: Torso & Sleeves
      ctx.fillStyle = bodyCol;
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 3;

      // Left Sleeve
      ctx.beginPath();
      ctx.moveTo(250, 200);
      ctx.lineTo(130, 480);
      ctx.lineTo(210, 520);
      ctx.lineTo(290, 320);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Sleeve
      ctx.beginPath();
      ctx.moveTo(550, 200);
      ctx.lineTo(670, 480);
      ctx.lineTo(590, 520);
      ctx.lineTo(510, 320);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Torso Main
      ctx.beginPath();
      ctx.moveTo(250, 190);
      ctx.quadraticCurveTo(400, 170, 550, 190); // Shoulders
      ctx.lineTo(540, 720); // Right side
      ctx.quadraticCurveTo(400, 750, 260, 720); // Hem
      ctx.lineTo(250, 190); // Left side
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Body subtle shadow & fold lines
      ctx.strokeStyle = isColorDark(bodyCol) ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(330, 260);
      ctx.quadraticCurveTo(320, 500, 340, 720);
      ctx.moveTo(470, 260);
      ctx.quadraticCurveTo(480, 500, 460, 720);
      ctx.stroke();

      // 2. TRIMS: Lapels, Collar, Cuffs, Hem Border
      ctx.fillStyle = trimCol;
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 2.5;

      // Collar
      ctx.beginPath();
      ctx.moveTo(330, 180);
      ctx.quadraticCurveTo(400, 160, 470, 180);
      ctx.lineTo(460, 230);
      ctx.lineTo(400, 260);
      ctx.lineTo(340, 230);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Left Lapel
      ctx.beginPath();
      ctx.moveTo(330, 180);
      ctx.lineTo(290, 290);
      ctx.lineTo(365, 340);
      ctx.lineTo(395, 520);
      ctx.lineTo(385, 340);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Lapel
      ctx.beginPath();
      ctx.moveTo(470, 180);
      ctx.lineTo(510, 290);
      ctx.lineTo(435, 340);
      ctx.lineTo(405, 520);
      ctx.lineTo(415, 340);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Left Cuff Trim
      ctx.beginPath();
      ctx.moveTo(130, 480);
      ctx.lineTo(150, 460);
      ctx.lineTo(225, 500);
      ctx.lineTo(210, 520);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Cuff Trim
      ctx.beginPath();
      ctx.moveTo(670, 480);
      ctx.lineTo(650, 460);
      ctx.lineTo(575, 500);
      ctx.lineTo(590, 520);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Lower Hem Trim
      ctx.beginPath();
      ctx.moveTo(260, 700);
      ctx.quadraticCurveTo(400, 730, 540, 700);
      ctx.lineTo(540, 720);
      ctx.quadraticCurveTo(400, 750, 260, 720);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. STITCHING: Contrast Thread Top-Stitching
      ctx.strokeStyle = stitchCol;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);

      // Lapel Stitching
      ctx.beginPath();
      ctx.moveTo(295, 295);
      ctx.lineTo(365, 345);
      ctx.lineTo(395, 515);
      ctx.moveTo(505, 295);
      ctx.lineTo(435, 345);
      ctx.lineTo(405, 515);
      // Shoulder Seam Stitching
      ctx.moveTo(260, 195);
      ctx.lineTo(330, 185);
      ctx.moveTo(540, 195);
      ctx.lineTo(470, 185);
      // Hem Stitching
      ctx.moveTo(270, 695);
      ctx.quadraticCurveTo(400, 725, 530, 695);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // 4. BUTTONS & HARDWARE: Center Placket Buttons & Cuff Buttons
      const buttonPositions = [
        { x: 400, y: 535, r: 12 },
        { x: 400, y: 585, r: 12 },
        { x: 400, y: 635, r: 12 },
        // Left Cuff Buttons
        { x: 165, y: 485, r: 6 },
        { x: 178, y: 492, r: 6 },
        // Right Cuff Buttons
        { x: 635, y: 485, r: 6 },
        { x: 622, y: 492, r: 6 },
      ];

      for (const btn of buttonPositions) {
        // Outer Button Rim
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, btn.r, 0, 2 * Math.PI);
        ctx.fillStyle = btnCol;
        ctx.fill();
        ctx.strokeStyle = isColorDark(btnCol) ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner Button Ring
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, btn.r * 0.65, 0, 2 * Math.PI);
        ctx.strokeStyle = isColorDark(btnCol) ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4 Button Thread Holes
        const holeDist = btn.r * 0.3;
        ctx.fillStyle = stitchCol;
        ctx.beginPath();
        ctx.arc(btn.x - holeDist, btn.y - holeDist, 1.2, 0, 2 * Math.PI);
        ctx.arc(btn.x + holeDist, btn.y - holeDist, 1.2, 0, 2 * Math.PI);
        ctx.arc(btn.x - holeDist, btn.y + holeDist, 1.2, 0, 2 * Math.PI);
        ctx.arc(btn.x + holeDist, btn.y + holeDist, 1.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else if (silhouette === "overshirt" || silhouette === "kurta") {
      // Clean Boxy Overshirt or Elegant Kameez/Kurta
      const isKurta = silhouette === "kurta";
      const hemY = isKurta ? 850 : 700;

      // Main Body
      ctx.fillStyle = bodyCol;
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 3;

      // Sleeves
      ctx.beginPath();
      ctx.moveTo(250, 190);
      ctx.lineTo(120, 520);
      ctx.lineTo(200, 550);
      ctx.lineTo(280, 340);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(550, 190);
      ctx.lineTo(680, 520);
      ctx.lineTo(600, 550);
      ctx.lineTo(520, 340);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Torso
      ctx.beginPath();
      ctx.moveTo(250, 185);
      ctx.quadraticCurveTo(400, 165, 550, 185);
      ctx.lineTo(540, hemY);
      ctx.quadraticCurveTo(400, hemY + 20, 260, hemY);
      ctx.lineTo(250, 185);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Side slits for kurta
      if (isKurta) {
        ctx.strokeStyle = trimCol;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(260, 580);
        ctx.lineTo(260, hemY);
        ctx.moveTo(540, 580);
        ctx.lineTo(540, hemY);
        ctx.stroke();
      }

      // Trims: Mandarin/Spread Collar & Placket
      ctx.fillStyle = trimCol;
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 2.5;

      // Collar Band
      ctx.beginPath();
      ctx.moveTo(340, 185);
      ctx.quadraticCurveTo(400, 160, 460, 185);
      ctx.lineTo(455, 220);
      ctx.quadraticCurveTo(400, 195, 345, 220);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center Placket Strip
      ctx.beginPath();
      ctx.rect(385, 215, 30, 260);
      ctx.fill();
      ctx.stroke();

      // Cuffs
      ctx.beginPath();
      ctx.rect(120, 500, 80, 45);
      ctx.rect(600, 500, 80, 45);
      ctx.fill();
      ctx.stroke();

      // Stitching: Double Seams along Placket & Collar
      ctx.strokeStyle = stitchCol;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);

      ctx.beginPath();
      ctx.moveTo(388, 220);
      ctx.lineTo(388, 470);
      ctx.moveTo(412, 220);
      ctx.lineTo(412, 470);
      // Collar edge
      ctx.moveTo(345, 180);
      ctx.quadraticCurveTo(400, 155, 455, 180);
      ctx.stroke();
      ctx.setLineDash([]);

      // Buttons
      const kurtaButtons = [
        { x: 400, y: 250, r: 7 },
        { x: 400, y: 300, r: 7 },
        { x: 400, y: 350, r: 7 },
        { x: 400, y: 400, r: 7 },
        { x: 400, y: 450, r: 7 },
      ];

      for (const btn of kurtaButtons) {
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, btn.r, 0, 2 * Math.PI);
        ctx.fillStyle = btnCol;
        ctx.fill();
        ctx.strokeStyle = isColorDark(btnCol) ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = stitchCol;
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, 1.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      // Trench / Long Coat
      // Main Body
      ctx.fillStyle = bodyCol;
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(240, 180);
      ctx.quadraticCurveTo(400, 160, 560, 180);
      ctx.lineTo(580, 880);
      ctx.quadraticCurveTo(400, 910, 220, 880);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sleeves
      ctx.beginPath();
      ctx.moveTo(240, 180);
      ctx.lineTo(110, 560);
      ctx.lineTo(190, 580);
      ctx.lineTo(260, 350);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(560, 180);
      ctx.lineTo(690, 560);
      ctx.lineTo(610, 580);
      ctx.lineTo(540, 350);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Trims: Wide Trench Lapels & Waist Belt
      ctx.fillStyle = trimCol;
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 2.5;

      // Left Trench Lapel
      ctx.beginPath();
      ctx.moveTo(330, 175);
      ctx.lineTo(260, 320);
      ctx.lineTo(370, 380);
      ctx.lineTo(400, 540);
      ctx.lineTo(380, 340);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Trench Lapel
      ctx.beginPath();
      ctx.moveTo(470, 175);
      ctx.lineTo(540, 320);
      ctx.lineTo(430, 380);
      ctx.lineTo(400, 540);
      ctx.lineTo(420, 340);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Belt
      ctx.beginPath();
      ctx.rect(240, 520, 320, 35);
      ctx.fill();
      ctx.stroke();

      // Buckle
      ctx.strokeStyle = btnCol;
      ctx.lineWidth = 4;
      ctx.strokeRect(380, 515, 40, 45);

      // Stitching: Double needle trench seams
      ctx.strokeStyle = stitchCol;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);

      ctx.beginPath();
      ctx.moveTo(245, 523);
      ctx.lineTo(555, 523);
      ctx.moveTo(245, 552);
      ctx.lineTo(555, 552);
      ctx.moveTo(230, 875);
      ctx.quadraticCurveTo(400, 905, 570, 875);
      ctx.stroke();
      ctx.setLineDash([]);

      // Double-breasted buttons
      const dbButtons = [
        { x: 360, y: 390, r: 11 },
        { x: 440, y: 390, r: 11 },
        { x: 360, y: 460, r: 11 },
        { x: 440, y: 460, r: 11 },
        { x: 360, y: 600, r: 11 },
        { x: 440, y: 600, r: 11 },
      ];

      for (const btn of dbButtons) {
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, btn.r, 0, 2 * Math.PI);
        ctx.fillStyle = btnCol;
        ctx.fill();
        ctx.strokeStyle = isColorDark(btnCol) ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = stitchCol;
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    ctx.restore();

    // Export image data URL
    const dataUrl = canvas.toDataURL("image/png");
    if (onGenerateCustomGarmentUrl) {
      onGenerateCustomGarmentUrl(dataUrl);
    }
  }, [theme, silhouette, onGenerateCustomGarmentUrl]);

  // Re-render canvas whenever colors or silhouette change
  useEffect(() => {
    renderGarmentToDataUrl();
  }, [renderGarmentToDataUrl]);

  const channels: Array<{
    id: "mainBody" | "trims" | "buttons" | "stitching";
    label: string;
    description: string;
    currentColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "mainBody",
      label: "Main Body",
      description: "Primary fabric cloth, torso & sleeves",
      currentColor: theme.mainBody,
      icon: Shirt,
    },
    {
      id: "trims",
      label: "Trims & Accents",
      description: "Lapels, collar band, cuffs & hem border",
      currentColor: theme.trims,
      icon: Layers,
    },
    {
      id: "buttons",
      label: "Buttons & Hardware",
      description: "Placket fasteners, cuff buttons & buckle",
      currentColor: theme.buttons,
      icon: CircleDot,
    },
    {
      id: "stitching",
      label: "Top-Stitching",
      description: "Edge seams, needle thread & embroidery",
      currentColor: theme.stitching,
      icon: Sparkles,
    },
  ];

  const handleColorUpdate = (colorHex: string) => {
    onChange({
      ...theme,
      [activeChannel]: colorHex,
    });
  };

  return (
    <div className={cn("surface p-5 space-y-6", className)}>
      {/* Hidden offscreen rendering canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header & Silhouette Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Layers className="size-3.5" />
            <span>Garment Color Customizer</span>
          </div>
          <h3 className="font-display text-xl">Color Allocation & Blueprint</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Apply colors directly to the main body, trims, buttons, and stitching.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-lg">
          {(["blazer", "overshirt", "kurta", "coat"] as GarmentSilhouette[]).map((sil) => (
            <button
              key={sil}
              type="button"
              onClick={() => setSilhouette(sil)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md capitalize font-medium transition-all cursor-pointer",
                silhouette === sil
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {sil}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Interactive Garment Canvas Preview & Target Channel Controls */}
      <div className="grid gap-6 md:grid-cols-[1fr_1.15fr] items-start">
        {/* Visual Garment Blueprint Canvas Render */}
        <div className="space-y-3">
          <div className="checkerboard relative aspect-5/6 w-full overflow-hidden rounded-xl border border-border/80 p-4 shadow-inner flex items-center justify-center">
            {/* Visual SVG representation for instant responsive layout */}
            <svg
              className="size-full max-h-[360px] filter drop-shadow-md"
              viewBox="0 0 800 960"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {silhouette === "blazer" && (
                <>
                  {/* Sleeves */}
                  <path
                    d="M250 200 L130 480 L210 520 L290 320 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  <path
                    d="M550 200 L670 480 L590 520 L510 320 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  {/* Body Torso */}
                  <path
                    d="M250 190 Q400 170 550 190 L540 720 Q400 750 260 720 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  {/* Collar */}
                  <path
                    d="M330 180 Q400 160 470 180 L460 230 L400 260 L340 230 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                  {/* Lapels */}
                  <path
                    d="M330 180 L290 290 L365 340 L395 520 L385 340 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M470 180 L510 290 L435 340 L405 520 L415 340 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                  {/* Cuffs */}
                  <path
                    d="M130 480 L150 460 L225 500 L210 520 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  <path
                    d="M670 480 L650 460 L575 500 L590 520 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  {/* Hem Trim */}
                  <path
                    d="M260 700 Q400 730 540 700 L540 720 Q400 750 260 720 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  {/* Stitching lines */}
                  <path
                    d="M295 295 L365 345 L395 515 M505 295 L435 345 L405 515 M260 195 L330 185 M540 195 L470 185 M270 695 Q400 725 530 695"
                    stroke={theme.stitching}
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                  />
                  {/* Buttons */}
                  {[
                    { cx: 400, cy: 535, r: 12 },
                    { cx: 400, cy: 585, r: 12 },
                    { cx: 400, cy: 635, r: 12 },
                    { cx: 165, cy: 485, r: 6 },
                    { cx: 178, cy: 492, r: 6 },
                    { cx: 635, cy: 485, r: 6 },
                    { cx: 622, cy: 492, r: 6 },
                  ].map((b, idx) => (
                    <g key={idx}>
                      <circle
                        cx={b.cx}
                        cy={b.cy}
                        r={b.r}
                        fill={theme.buttons}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <circle cx={b.cx} cy={b.cy} r={b.r * 0.3} fill={theme.stitching} />
                    </g>
                  ))}
                </>
              )}

              {(silhouette === "overshirt" || silhouette === "kurta") && (
                <>
                  <path
                    d="M250 185 Q400 165 550 185 L540 780 Q400 800 260 780 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  <path
                    d="M250 190 L120 520 L200 550 L280 340 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  <path
                    d="M550 190 L680 520 L600 550 L520 340 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  {/* Collar */}
                  <path
                    d="M340 185 Q400 160 460 185 L455 220 Q400 195 345 220 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                  {/* Center Placket */}
                  <rect
                    x="385"
                    y="215"
                    width="30"
                    height="280"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  {/* Cuffs */}
                  <rect
                    x="120"
                    y="500"
                    width="80"
                    height="45"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  <rect
                    x="600"
                    y="500"
                    width="80"
                    height="45"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  {/* Stitching */}
                  <path
                    d="M388 220 L388 490 M412 220 L412 490 M345 180 Q400 155 455 180"
                    stroke={theme.stitching}
                    strokeWidth="3"
                    strokeDasharray="6 5"
                  />
                  {/* Placket Buttons */}
                  {[260, 310, 360, 410, 460].map((cy, idx) => (
                    <circle
                      key={idx}
                      cx="400"
                      cy={cy}
                      r="7"
                      fill={theme.buttons}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  ))}
                </>
              )}

              {silhouette === "coat" && (
                <>
                  <path
                    d="M240 180 Q400 160 560 180 L580 880 Q400 910 220 880 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  <path
                    d="M240 180 L110 560 L190 580 L260 350 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  <path
                    d="M560 180 L690 560 L610 580 L540 350 Z"
                    fill={theme.mainBody}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="3"
                  />
                  {/* Trench Lapels */}
                  <path
                    d="M330 175 L260 320 L370 380 L400 540 L380 340 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M470 175 L540 320 L430 380 L400 540 L420 340 Z"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2.5"
                  />
                  {/* Belt */}
                  <rect
                    x="240"
                    y="520"
                    width="320"
                    height="35"
                    fill={theme.trims}
                    stroke="rgba(0,0,0,0.22)"
                    strokeWidth="2"
                  />
                  <rect
                    x="380"
                    y="515"
                    width="40"
                    height="45"
                    fill="none"
                    stroke={theme.buttons}
                    strokeWidth="4"
                  />
                  {/* Stitching */}
                  <path
                    d="M245 523 L555 523 M245 552 L555 552 M230 875 Q400 905 570 875"
                    stroke={theme.stitching}
                    strokeWidth="3"
                    strokeDasharray="7 5"
                  />
                  {/* Buttons */}
                  {[
                    { cx: 360, cy: 390 },
                    { cx: 440, cy: 390 },
                    { cx: 360, cy: 460 },
                    { cx: 440, cy: 460 },
                    { cx: 360, cy: 600 },
                    { cx: 440, cy: 600 },
                  ].map((b, idx) => (
                    <circle
                      key={idx}
                      cx={b.cx}
                      cy={b.cy}
                      r="10"
                      fill={theme.buttons}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  ))}
                </>
              )}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Dynamic Tailored Silhouette: {silhouette.toUpperCase()}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={renderGarmentToDataUrl}
              className="h-6 text-[10px] gap-1 cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Refresh Render</span>
            </Button>
          </div>
        </div>

        {/* Target Component Channels & Color Swatches */}
        <div className="space-y-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Select Garment Part to Customize:
          </Label>

          <div className="grid grid-cols-2 gap-2">
            {channels.map((ch) => {
              const Icon = ch.icon;
              const isSelected = activeChannel === ch.id;
              const colorName = getFashionColorName(ch.currentColor);

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChannel(ch.id)}
                  className={cn(
                    "flex flex-col rounded-xl border p-3 text-left transition-all cursor-pointer relative overflow-hidden",
                    isSelected
                      ? "border-primary bg-card ring-2 ring-primary/20 shadow-xs"
                      : "border-border/80 bg-secondary/30 hover:border-border hover:bg-secondary/60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Icon className="size-3.5 text-primary" />
                      <span>{ch.label}</span>
                    </span>
                    <div
                      className="size-5 rounded-md border border-black/10 shadow-2xs"
                      style={{ backgroundColor: ch.currentColor }}
                    />
                  </div>

                  <span className="text-[10px] text-muted-foreground mt-1 truncate">
                    {colorName}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground/80 uppercase">
                    {ch.currentColor}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Channel Color Palette & Swatches */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground">
                  Apply Color to: {channels.find((c) => c.id === activeChannel)?.label}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Pick from extracted mood board, suggested harmonies, or custom hex
                </p>
              </div>

              {/* Native Color Picker Trigger */}
              <label
                htmlFor={`color-input-${activeChannel}`}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer border border-border px-2 py-1 rounded-md bg-secondary/40"
              >
                <Pipette className="size-3.5" />
                <span>Custom</span>
                <input
                  id={`color-input-${activeChannel}`}
                  type="color"
                  value={theme[activeChannel]}
                  onChange={(e) => handleColorUpdate(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Quick Palette Swatches */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Mood Board & Suggested Palette:
              </span>
              <div className="flex flex-wrap gap-2">
                {extractedPalette.map((col, idx) => {
                  const isCurrent = theme[activeChannel].toLowerCase() === col.hex.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleColorUpdate(col.hex)}
                      className={cn(
                        "group relative size-8 rounded-lg border border-black/10 shadow-2xs transition-transform hover:scale-110 cursor-pointer flex items-center justify-center",
                        isCurrent && "ring-2 ring-primary ring-offset-2 scale-105",
                      )}
                      style={{ backgroundColor: col.hex }}
                      title={`${col.name} (${col.hex})`}
                    >
                      {isCurrent && (
                        <Check
                          className={cn(
                            "size-3.5 stroke-[3]",
                            col.isDark ? "text-white" : "text-black",
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Classic Neutral & Hardware Swatches for Accents */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Classic Tailoring Neutrals & Metallics:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Alabaster White", hex: "#f8f9fa" },
                  { name: "Oatmeal Beige", hex: "#e5ded4" },
                  { name: "Antique Gold", hex: "#c6923b" },
                  { name: "Brushed Silver", hex: "#a8b2bc" },
                  { name: "Tortoise Horn", hex: "#4a3224" },
                  { name: "Espresso", hex: "#2b1e16" },
                  { name: "Obsidian Black", hex: "#17181c" },
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleColorUpdate(preset.hex)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/80 bg-secondary/30 text-[10px] hover:border-primary cursor-pointer transition-colors"
                  >
                    <div
                      className="size-3 rounded-full border border-black/10"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
