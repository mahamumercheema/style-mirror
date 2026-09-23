import { useState, useEffect, useRef, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  getUserProfile,
  getStoredWardrobeItems,
} from "@/lib/wardrobe-service";
import {
  apiGetUserProfile,
  apiUpdateUserProfile,
} from "@/lib/user.functions";
import type {
  UserProfile,
  BodyShapeType,
  UserMeasurements,
  UserStylingPreferences,
} from "@/types/wardrobe";
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Ruler,
  Save,
  ShieldCheck,
  Shirt,
  Sparkles,
  User,
  X,
  Compass,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "User Profile & Try-On Proportions — Virtual Try Room" },
      {
        name: "description",
        content:
          "Manage your full-body base try-on photo, body proportions, measurements, silhouette shape, and modesty preferences.",
      },
      { property: "og:title", content: "Profile & Measurements — Virtual Try Room" },
    ],
  }),
  component: ProfilePage,
});

const BODY_SHAPES: {
  id: BodyShapeType;
  title: string;
  subtitle: string;
  description: string;
  stylistTip: string;
}[] = [
  {
    id: "Hourglass",
    title: "Hourglass",
    subtitle: "Balanced Shoulders & Hips, Defined Waist",
    description: "Shoulder and hip widths are nearly equal, with a significantly narrower, well-defined waistline.",
    stylistTip: "Emphasize your waist with belted kurtis, tailored blazers, and wrap dresses.",
  },
  {
    id: "Rectangle",
    title: "Rectangle",
    subtitle: "Uniform Proportions, Athletic Frame",
    description: "Shoulders, waist, and hips follow a straight vertical alignment with subtle waist curve.",
    stylistTip: "Create dimensional curves with peplum silhouettes, pleated ghararas, and layered outerwear.",
  },
  {
    id: "Pear",
    title: "Pear / Triangle",
    subtitle: "Fuller Hips & Thighs, Delicate Shoulders",
    description: "Hip circumference is visibly wider than the shoulder line, with a sculpted upper torso.",
    stylistTip: "Draw attention upward with statement embroidered necklines, puffed sleeves, and A-line skirts.",
  },
  {
    id: "Inverted Triangle",
    title: "Inverted Triangle",
    subtitle: "Broad Shoulders, Slender Hips",
    description: "Shoulder span is broader than hip line, often accompanied by athletic posture.",
    stylistTip: "Balance your upper body with voluminous flared palazzo pants, shararas, and V-neck cuts.",
  },
  {
    id: "Athletic",
    title: "Athletic",
    subtitle: "Sculpted & Square Frame",
    description: "Muscular structure with defined shoulder span and moderate waist indent.",
    stylistTip: "Soft flowing silk fabrics, draped dupattas, and fluid asymmetric cuts soften sharp angles.",
  },
  {
    id: "Apple",
    title: "Apple / Round",
    subtitle: "Fuller Midriff, Slender Limbs",
    description: "Torso volume is centered around the bust and waist, with slender legs and arms.",
    stylistTip: "Empire waist frocks, breezy kurtas with vertical pleating, and statement footwear look stunning.",
  },
];

const MODESTY_OPTIONS = [
  {
    id: "Full Coverage & Dupatta",
    label: "Full Coverage & Dupatta",
    desc: "Long hemlines, high/modest necklines, full sleeves, and coordinated draped dupattas.",
  },
  {
    id: "Modest & Loose Fit",
    label: "Modest & Relaxed",
    desc: "Comfortable, non-restrictive silhouettes with moderate coverage and easy layering.",
  },
  {
    id: "Moderate",
    label: "Contemporary Moderate",
    desc: "Balanced modern silhouettes suitable for everyday chic and professional attire.",
  },
  {
    id: "Standard",
    label: "Standard / No Preference",
    desc: "Standard designer fits with flexible cuts, necklines, and length freedom.",
  },
];

const STYLE_AESTHETICS = [
  "Traditional Ethnic",
  "Royal Glam",
  "Modern Chic",
  "Minimalist",
  "Bohemian",
  "Festive Luxe",
  "Classic Tailored",
  "Streetwear",
  "Old Money Aesthetic",
];

const OCCASION_OPTIONS = [
  "Wedding / Festive / Fancy",
  "Office / Work",
  "Casual / Daily",
  "Dinner / Date Night",
  "Formal / Business Meeting",
  "Party / Night Out",
  "Traditional / Religious",
  "Athletic / Gym",
];

function ProfilePage() {
  const { user, isAuthenticated, openLogin } = useAuth();
  const activeUserId = user?.id || "guest_user";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [heightStr, setHeightStr] = useState("168 cm");
  const [bodyType, setBodyType] = useState<BodyShapeType>("Hourglass");
  const [bodyTypeNotes, setBodyTypeNotes] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState<"in" | "cm">("in");
  const [isDetectingPose, setIsDetectingPose] = useState(false);

  // Measurements
  const [measurements, setMeasurements] = useState<UserMeasurements>({
    unit: "in",
    shoulderWidth: 16,
    bustChest: 36,
    waist: 28,
    hips: 38,
    inseam: 30,
    torsoLength: 17,
  });

  // Preferences
  const [defaultOccasion, setDefaultOccasion] = useState<string>("Wedding / Festive / Fancy");
  const [modestyPreference, setModestyPreference] = useState<string>("Modest & Loose Fit");
  const [selectedAesthetics, setSelectedAesthetics] = useState<string[]>([
    "Traditional Ethnic",
    "Royal Glam",
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile on mount
  useEffect(() => {
    async function loadData() {
      const p = await apiGetUserProfile(activeUserId);
      setProfile(p);
      setFullName(p.full_name || "");
      const photo = p.bodyPhotoUrl || p.user_photo_url || null;
      setPhotoUrl(photo);
      setHeightStr(typeof p.height === "number" ? `${p.height} cm` : p.height || "168 cm");
      if (p.bodyType && BODY_SHAPES.some((s) => s.id === p.bodyType)) {
        setBodyType(p.bodyType as BodyShapeType);
      }
      setBodyTypeNotes(p.body_type_notes || "");

      if (p.measurements) {
        setMeasurements(p.measurements);
        if (p.measurements.unit) setMeasurementUnit(p.measurements.unit);
      }

      if (p.preferences) {
        if (p.preferences.defaultOccasion) setDefaultOccasion(p.preferences.defaultOccasion);
        if (p.preferences.modestyPreference) setModestyPreference(p.preferences.modestyPreference);
        if (p.preferences.styleAesthetics) setSelectedAesthetics(p.preferences.styleAesthetics);
      }
    }

    void loadData();
  }, [activeUserId]);

  // Handle Photo upload
  const handlePhotoUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setPhotoUrl(e.target.result);
        toast.success("Full-body try-on photo uploaded!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoUpload(e.dataTransfer.files[0]);
    }
  };

  // Auto-detect proportions from uploaded base photo using TensorFlow MoveNet
  const handleAutoDetectFromPhoto = async () => {
    if (!photoUrl) {
      toast.error("Please upload a full-body photo first");
      return;
    }

    setIsDetectingPose(true);
    toast.info("Analyzing silhouette landmarks via browser AI MoveNet...");

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load photo image"));
        img.src = photoUrl;
      });

      const { estimateBody } = await import("@/lib/pose");
      const result = await estimateBody(img);

      const detected = result.measurements;
      // Map detected bodyType to shape
      if (detected.bodyType === "Hourglass") setBodyType("Hourglass");
      else if (detected.bodyType === "Inverted triangle") setBodyType("Inverted Triangle");
      else if (detected.bodyType === "Triangle") setBodyType("Pear");
      else setBodyType("Rectangle");

      // Approximate measurement estimates if calibrated or scale available
      if (detected.shoulderWidthRatio) {
        const approxShoulder = Math.round(detected.shoulderWidthRatio * 46);
        const approxHip = Math.round(detected.hipWidthRatio * 44);
        setMeasurements((prev) => ({
          ...prev,
          shoulderWidth: approxShoulder || prev.shoulderWidth,
          hips: approxHip || prev.hips,
          waist: Math.round((approxHip || 38) * 0.74),
        }));
      }

      toast.success(
        `Pose detected! Classified as ${detected.bodyType} shape with ${(detected.confidence * 100).toFixed(0)}% confidence.`,
      );
    } catch (err) {
      console.warn("Pose detection fallback:", err);
      toast.info("Using proportional body template for your silhouette.");
    } finally {
      setIsDetectingPose(false);
    }
  };

  // Silhouette Calculation from measurements
  const calculatedSilhouette = useMemo<{
    suggestedShape: BodyShapeType;
    shoulderToHipRatio: number;
    waistToHipRatio: number;
  }>(() => {
    const sw = measurements.shoulderWidth || 16;
    const hp = measurements.hips || 38;
    const ws = measurements.waist || 28;

    const shoulderToHipRatio = Number((sw / (hp || 1)).toFixed(2));
    const waistToHipRatio = Number((ws / (hp || 1)).toFixed(2));

    let suggestedShape: BodyShapeType = "Rectangle";
    if (shoulderToHipRatio > 1.15) {
      suggestedShape = "Inverted Triangle";
    } else if (shoulderToHipRatio < 0.88) {
      suggestedShape = "Pear";
    } else if (waistToHipRatio < 0.78 && shoulderToHipRatio >= 0.92 && shoulderToHipRatio <= 1.12) {
      suggestedShape = "Hourglass";
    } else if (waistToHipRatio > 0.85) {
      suggestedShape = "Apple";
    }

    return { suggestedShape, shoulderToHipRatio, waistToHipRatio };
  }, [measurements.shoulderWidth, measurements.hips, measurements.waist]);

  // Toggle Aesthetic tags
  const toggleAesthetic = (tag: string) => {
    setSelectedAesthetics((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Convert Measurement Units
  const handleUnitToggle = (newUnit: "in" | "cm") => {
    if (newUnit === measurementUnit) return;
    const factor = newUnit === "cm" ? 2.54 : 1 / 2.54;

    setMeasurements((prev) => ({
      ...prev,
      unit: newUnit,
      shoulderWidth: prev.shoulderWidth ? Math.round(prev.shoulderWidth * factor) : null,
      bustChest: prev.bustChest ? Math.round(prev.bustChest * factor) : null,
      waist: prev.waist ? Math.round(prev.waist * factor) : null,
      hips: prev.hips ? Math.round(prev.hips * factor) : null,
      inseam: prev.inseam ? Math.round(prev.inseam * factor) : null,
      torsoLength: prev.torsoLength ? Math.round(prev.torsoLength * factor) : null,
    }));
    setMeasurementUnit(newUnit);
  };

  // Save Complete Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload: Partial<UserProfile> = {
        full_name: fullName.trim() || "Fashion Enthusiast",
        user_photo_url: photoUrl,
        bodyPhotoUrl: photoUrl,
        height: heightStr.trim(),
        heightUnit: heightStr.toLowerCase().includes("cm") ? "cm" : "ft_in",
        bodyType,
        body_type_notes: bodyTypeNotes.trim() || null,
        measurements: {
          ...measurements,
          unit: measurementUnit,
        },
        preferences: {
          defaultOccasion,
          modestyPreference,
          styleAesthetics: selectedAesthetics,
        },
      };

      const updated = await apiUpdateUserProfile(activeUserId, payload);
      setProfile(updated);
      toast.success("Profile, Try-On photo & measurements saved successfully!");
    } catch (err) {
      console.error("Save profile error:", err);
      toast.error("Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const wardrobeItems = getStoredWardrobeItems(activeUserId);

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Top Navigation */}
      <nav className="border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="font-display text-lg tracking-tight hover:opacity-90 transition-opacity"
            >
              Virtual Try Room
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="text-xs font-medium">
                <Link to="/closet">My Closet</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs font-medium gap-1 text-amber-700 dark:text-amber-400"
              >
                <Link to="/generate">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>AI Stylist</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-xs font-medium">
                <Link to="/studio">Try-On Studio</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs font-semibold bg-secondary/80"
              >
                <Link to="/profile">Profile Settings</Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <HeaderAuthButtons />
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-8 space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-3.5" />
              </span>
              <span className="eyebrow">Phase 4 • Silhouette & Measurements</span>
            </div>
            <h1 className="text-3xl font-display font-medium tracking-tight text-foreground">
              User Profile & Fitting Setup
            </h1>
            <p className="text-xs text-muted-foreground">
              Store your reference full-body photo, exact body measurements, silhouette type, and modest styling preferences.
            </p>
          </div>

          {/* Quick Actions to Studio & Stylist */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Link to="/studio">
                <Shirt className="size-3.5 text-primary" />
                <span>Open Fitting Studio</span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Link to="/generate">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>AI Stylist</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {/* Left Column: Account & Body Shape Cards */}
          <div className="space-y-5 lg:sticky lg:top-20">
            {/* Identity Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-xs">
                  {(fullName || user?.email || "U").substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-semibold text-sm leading-tight text-foreground truncate">
                    {fullName || "Fashion Enthusiast"}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || "Local Guest Profile"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-secondary/40 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Body Shape</span>
                  <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-primary">
                    {bodyType}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Height</span>
                  <span className="font-medium text-foreground">{heightStr}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Wardrobe Items</span>
                  <span className="font-semibold text-foreground">{wardrobeItems.length} items</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Modesty Setting</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-[130px]">
                    {modestyPreference}
                  </span>
                </div>
              </div>

              {!isAuthenticated && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-2">
                  <p className="font-medium">Using Guest Mode</p>
                  <p className="text-[11px] text-muted-foreground">
                    Log in to automatically synchronize your base photo and tailored fitting room preferences across devices.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openLogin()}
                    className="w-full h-8 text-xs font-medium cursor-pointer"
                  >
                    Log In / Sign Up
                  </Button>
                </div>
              )}
            </div>

            {/* Selected Body Shape Guidance Card */}
            {(() => {
              const activeShape = BODY_SHAPES.find((s) => s.id === bodyType) || BODY_SHAPES[0];
              return (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      <span>{activeShape.title} Silhouette</span>
                    </span>
                    <span className="text-[10px] text-primary/80 font-mono">Active Fit</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {activeShape.description}
                  </p>
                  <div className="rounded-md bg-background/80 p-2.5 border border-border/60">
                    <p className="text-[11px] text-foreground font-medium flex items-center gap-1 mb-1">
                      <Compass className="size-3 text-amber-500" />
                      <span>Couture Stylist Note</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground italic">
                      &ldquo;{activeShape.stylistTip}&rdquo;
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Quick Measurement Preview Card */}
            <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Ruler className="size-3.5 text-muted-foreground" />
                  <span>Proportion Snapshot</span>
                </span>
                <span className="text-[11px] font-mono text-muted-foreground uppercase">
                  {measurementUnit}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="rounded-lg bg-secondary/50 p-2">
                  <span className="text-[10px] text-muted-foreground block">Shoulders</span>
                  <span className="font-semibold text-foreground">
                    {measurements.shoulderWidth ? `${measurements.shoulderWidth}${measurementUnit}` : "—"}
                  </span>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <span className="text-[10px] text-muted-foreground block">Waist</span>
                  <span className="font-semibold text-foreground">
                    {measurements.waist ? `${measurements.waist}${measurementUnit}` : "—"}
                  </span>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <span className="text-[10px] text-muted-foreground block">Hips</span>
                  <span className="font-semibold text-foreground">
                    {measurements.hips ? `${measurements.hips}${measurementUnit}` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Column: Detailed Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* SECTION 1: Base Photo Upload & Management */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Camera className="size-4 text-primary" />
                      <span>Virtual Fitting Base Photo</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your full-body front-facing reference model for virtual garment overlays
                    </p>
                  </div>

                  {photoUrl && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isDetectingPose}
                        onClick={handleAutoDetectFromPhoto}
                        className="text-xs h-7 px-2.5 gap-1.5 cursor-pointer"
                      >
                        {isDetectingPose ? (
                          <RefreshCw className="size-3 animate-spin text-primary" />
                        ) : (
                          <Sparkles className="size-3 text-amber-500" />
                        )}
                        <span>Scan Proportions</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPhotoUrl(null)}
                        className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2 cursor-pointer"
                      >
                        <X className="size-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {/* Upload / Preview Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : photoUrl
                        ? "border-border bg-secondary/20"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                    className="hidden"
                  />

                  {photoUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-5 w-full">
                      <img
                        src={photoUrl}
                        alt="User full body try-on preview"
                        className="h-48 w-36 rounded-lg object-cover object-top border border-border shadow-sm shrink-0 bg-background"
                      />
                      <div className="text-left space-y-2">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          <span>Persistent Try-On Base Active</span>
                        </div>
                        <p className="text-xs text-foreground font-medium">
                          Front-Facing Model Synchronized
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Whenever you open the Virtual Try Room, this base photo is automatically loaded, skipping manual re-uploads. Click or drop a file to replace it anytime.
                        </p>
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <Button
                            asChild
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs font-medium gap-1 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link to="/studio">
                              <Shirt className="size-3" />
                              <span>Test Fit in Studio</span>
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-medium gap-1 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleAutoDetectFromPhoto();
                            }}
                          >
                            <Sparkles className="size-3 text-amber-500" />
                            <span>Auto-Detect Shape</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                        <Camera className="size-6" />
                      </div>
                      <p className="text-xs font-medium text-foreground">
                        Click to upload your full-body photo or drag & drop
                      </p>
                      <p className="text-[11px] text-muted-foreground max-w-sm">
                        Ensure head-to-toe visibility with arms slightly away from sides. Photos stay strictly private and are saved to your browser session.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: Proportional Measurements Form */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Ruler className="size-4 text-primary" />
                      <span>Body Measurements & Sizing Proportions</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Precise measurements calibrated for the Virtual Try Room overlay
                    </p>
                  </div>

                  {/* Unit Toggle */}
                  <div className="inline-flex items-center rounded-lg border border-border bg-secondary/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleUnitToggle("in")}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                        measurementUnit === "in"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Inches (in)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitToggle("cm")}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                        measurementUnit === "cm"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Centimeters (cm)
                    </button>
                  </div>
                </div>

                {/* Measurements Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
                  {/* Height */}
                  <div className="space-y-1.5">
                    <Label htmlFor="meas-height" className="text-xs font-medium">
                      Total Height
                    </Label>
                    <Input
                      id="meas-height"
                      value={heightStr}
                      onChange={(e) => setHeightStr(e.target.value)}
                      placeholder={measurementUnit === "cm" ? "168 cm" : "5'6\" or 66 in"}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Shoulder Width */}
                  <div className="space-y-1.5">
                    <Label htmlFor="meas-shoulder" className="text-xs font-medium">
                      Shoulder Width ({measurementUnit})
                    </Label>
                    <Input
                      id="meas-shoulder"
                      type="number"
                      step="0.5"
                      value={measurements.shoulderWidth ?? ""}
                      onChange={(e) =>
                        setMeasurements((prev) => ({
                          ...prev,
                          shoulderWidth: e.target.value ? parseFloat(e.target.value) : null,
                        }))
                      }
                      placeholder={measurementUnit === "in" ? "16" : "41"}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Bust / Chest */}
                  <div className="space-y-1.5">
                    <Label htmlFor="meas-bust" className="text-xs font-medium">
                      Bust / Chest ({measurementUnit})
                    </Label>
                    <Input
                      id="meas-bust"
                      type="number"
                      step="0.5"
                      value={measurements.bustChest ?? ""}
                      onChange={(e) =>
                        setMeasurements((prev) => ({
                          ...prev,
                          bustChest: e.target.value ? parseFloat(e.target.value) : null,
                        }))
                      }
                      placeholder={measurementUnit === "in" ? "36" : "91"}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Waist */}
                  <div className="space-y-1.5">
                    <Label htmlFor="meas-waist" className="text-xs font-medium">
                      Natural Waist ({measurementUnit})
                    </Label>
                    <Input
                      id="meas-waist"
                      type="number"
                      step="0.5"
                      value={measurements.waist ?? ""}
                      onChange={(e) =>
                        setMeasurements((prev) => ({
                          ...prev,
                          waist: e.target.value ? parseFloat(e.target.value) : null,
                        }))
                      }
                      placeholder={measurementUnit === "in" ? "28" : "71"}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Hips */}
                  <div className="space-y-1.5">
                    <Label htmlFor="meas-hips" className="text-xs font-medium">
                      Hips ({measurementUnit})
                    </Label>
                    <Input
                      id="meas-hips"
                      type="number"
                      step="0.5"
                      value={measurements.hips ?? ""}
                      onChange={(e) =>
                        setMeasurements((prev) => ({
                          ...prev,
                          hips: e.target.value ? parseFloat(e.target.value) : null,
                        }))
                      }
                      placeholder={measurementUnit === "in" ? "38" : "97"}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Inseam */}
                  <div className="space-y-1.5">
                    <Label htmlFor="meas-inseam" className="text-xs font-medium">
                      Inseam / Leg Length ({measurementUnit})
                    </Label>
                    <Input
                      id="meas-inseam"
                      type="number"
                      step="0.5"
                      value={measurements.inseam ?? ""}
                      onChange={(e) =>
                        setMeasurements((prev) => ({
                          ...prev,
                          inseam: e.target.value ? parseFloat(e.target.value) : null,
                        }))
                      }
                      placeholder={measurementUnit === "in" ? "30" : "76"}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                {/* Dynamic Calculated Indicator */}
                <div className="rounded-lg border border-border/80 bg-secondary/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3 text-primary" />
                      <span>Proportional Ratio Analysis:</span>
                      <strong className="text-primary font-semibold">{calculatedSilhouette.suggestedShape}</strong>
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Shoulder/Hip Ratio: {calculatedSilhouette.shoulderToHipRatio} • Waist/Hip Ratio: {calculatedSilhouette.waistToHipRatio}
                    </p>
                  </div>

                  {bodyType !== calculatedSilhouette.suggestedShape && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBodyType(calculatedSilhouette.suggestedShape)}
                      className="h-7 text-xs font-medium gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <Check className="size-3" />
                      <span>Set Shape to {calculatedSilhouette.suggestedShape}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* SECTION 3: Body Shape Archetype Selection */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
                <div className="border-b border-border pb-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="size-4 text-primary" />
                    <span>Body Shape & Silhouette Type</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select your primary silhouette to guide garment draping and styling recommendations
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {BODY_SHAPES.map((shape) => {
                    const isSelected = bodyType === shape.id;
                    return (
                      <div
                        key={shape.id}
                        onClick={() => setBodyType(shape.id)}
                        className={cn(
                          "cursor-pointer rounded-xl border p-3.5 transition-all text-left space-y-1.5 relative",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                            : "border-border hover:border-border/80 hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-xs text-foreground">{shape.title}</h4>
                          {isSelected && (
                            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="size-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {shape.subtitle}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: Preferred Aesthetic Vibe & Modesty Settings */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
                <div className="border-b border-border pb-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Compass className="size-4 text-primary" />
                    <span>Styling Aesthetics & Modesty Preferences</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    These settings feed directly into the Gemini AI Stylist to generate outfits matching your lifestyle
                  </p>
                </div>

                {/* Modesty Settings */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Modesty & Fit Preference
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {MODESTY_OPTIONS.map((opt) => {
                      const isSelected = modestyPreference === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setModestyPreference(opt.id)}
                          className={cn(
                            "cursor-pointer rounded-lg border p-3 transition-all text-left space-y-1",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border hover:bg-muted/30",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{opt.label}</span>
                            {isSelected && <Check className="size-3 text-primary" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {opt.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Default Occasion & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-fullname" className="text-xs font-medium">
                      Display Name
                    </Label>
                    <Input
                      id="profile-fullname"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-default-occasion" className="text-xs font-medium">
                      Default Styling Occasion
                    </Label>
                    <select
                      id="profile-default-occasion"
                      value={defaultOccasion}
                      onChange={(e) => setDefaultOccasion(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {OCCASION_OPTIONS.map((occ) => (
                        <option key={occ} value={occ}>
                          {occ}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Style Aesthetics Tags */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Preferred Aesthetic Vibes (Select all that apply)
                  </Label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {STYLE_AESTHETICS.map((tag) => {
                      const active = selectedAesthetics.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleAesthetic(tag)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer border",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary/60 text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
                          )}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Body Type & Tailoring Notes Textarea */}
                <div className="space-y-2 pt-1">
                  <Label htmlFor="profile-bodynotes" className="text-xs font-medium">
                    Personal Silhouette Notes & Tailoring Specifications
                  </Label>
                  <Textarea
                    id="profile-bodynotes"
                    rows={3}
                    value={bodyTypeNotes}
                    onChange={(e) => setBodyTypeNotes(e.target.value)}
                    placeholder="e.g., Prefer A-line silhouettes, sensitive to tight necklines, prefer dupattas draped over shoulders, love palazzo trousers..."
                    className="text-xs resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    These notes provide additional custom constraints to the Google Gemini AI styling algorithm.
                  </p>
                </div>
              </div>

              {/* Form Submission Action Bar */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="size-3.5 text-primary" />
                  <span>Changes immediately sync to the Fitting Studio and AI Stylist.</span>
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="gap-2 text-xs font-medium cursor-pointer shadow-xs h-9 px-5 ml-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      <span>Save All Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
