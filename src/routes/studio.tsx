import { createFileRoute, Link } from "@tanstack/react-router";
import { AtelierOraLogo } from "@/components/AtelierOraLogo";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Layers,
  Loader2,
  Lock,
  LogIn,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  Shirt,
  Sparkles,
  User,
  UserPlus,
  Wand2,
} from "lucide-react";

import { ClothingLinkPanel } from "@/components/ClothingLinkPanel";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { HeightCalibrationCard } from "@/components/HeightCalibrationCard";
import { lowConfidenceLabels, MeasurementsCard } from "@/components/MeasurementsCard";
import { PhotoGuidance, PhotoUploader } from "@/components/PhotoUploader";
import { PoseOverlay } from "@/components/PoseOverlay";
import { GarmentTypePicker, TryOnButton, TryOnPhotoFrame } from "@/components/AiTryOnPanel";
import { useAiTryOn } from "@/hooks/use-ai-try-on";
import { useBackgroundPause } from "@/hooks/use-background-pause";
import { FRAME_LABEL, IMAGE_FRAME } from "@/lib/frame-styles";
import { ColorStudioPanel } from "@/components/colors/ColorStudioPanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile } from "@/lib/wardrobe-service";
import { apiUpdateUserProfile } from "@/lib/user.functions";
import type { UserProfile } from "@/types/wardrobe";
import { toast } from "sonner";
import {
  createDefaultPoseResult,
  type DetectedKeypoint,
  type Measurements,
  type PoseGuide,
  type SkeletonLine,
} from "@/lib/pose-types";
import type { ProductPreview } from "@/lib/product.functions";
import { resolveMeasurements, type ManualMeasurements } from "@/lib/body-measurements";
import {
  extractColorPaletteFromImage,
  FALLBACK_MOOD_BOARD_PALETTE,
  type ExtractedColor,
  type GarmentColorTheme,
} from "@/lib/color-palette";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Try-on studio — Atelier Ora" },
      {
        name: "description",
        content:
          "Upload a full-body photo, get approximate body proportions read in your browser, then layer a garment from any shop link onto your photo.",
      },
      { property: "og:title", content: "Try-on studio — Atelier Ora" },
      {
        property: "og:description",
        content:
          "Measure your proportions in-browser and manually try on clothes from any shop link on a drag-and-drop canvas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

type WorkflowStep = 1 | 2 | 3;

function Studio() {
  const { user, openLogin, openSignUp, loginAsGuest } = useAuth();
  // The studio opens to any session, guests included ("Continue as guest" unlocks it);
  // the auth context's stricter isAuthenticated (no guests) still gates the AI Stylist/closet
  const hasStudioAccess = Boolean(user);

  const [photo, setPhoto] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
  const [status, setStatus] = useState<"idle" | "measuring" | "done" | "failed">("idle");
  const [analysisPhase, setAnalysisPhase] = useState("Reading your photo...");
  const [poseError, setPoseError] = useState<string | null>(null);
  const [original, setOriginal] = useState<Measurements | null>(null);
  const [measurements, setMeasurements] = useState<Measurements | null>(null);
  const [guide, setGuide] = useState<PoseGuide | null>(null);
  const [keypoints, setKeypoints] = useState<DetectedKeypoint[]>([]);
  const [skeletonLines, setSkeletonLines] = useState<SkeletonLine[]>([]);
  const [product, setProduct] = useState<ProductPreview | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);

  // Height calibration, cleaned photo & manual overrides
  const [heightCm, setHeightCm] = useState<number | null>(null);
  /** The image pose landmarks were detected on (background-cleaned when available) */
  const [analysisPhoto, setAnalysisPhoto] = useState<string | null>(null);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [manual, setManual] = useState<ManualMeasurements>({});
  const [manualEnabled, setManualEnabled] = useState(false);

  const resolved = useMemo(
    () => resolveMeasurements(measurements?.calibrated, manualEnabled ? manual : {}),
    [manual, manualEnabled, measurements?.calibrated],
  );

  // Dynamic Color Wheel & Garment Atelier State
  const [extractedPalette, setExtractedPalette] = useState<ExtractedColor[]>(
    FALLBACK_MOOD_BOARD_PALETTE,
  );
  const [baseColorHex, setBaseColorHex] = useState<string>("#1b3b36");
  const [garmentTheme, setGarmentTheme] = useState<GarmentColorTheme>({
    mainBody: "#1b3b36",
    trims: "#c48b48",
    buttons: "#1c1815",
    stitching: "#e5ded4",
  });
  const [customGarmentDataUrl, setCustomGarmentDataUrl] = useState<string | null>(null);
  const [showColorStudio, setShowColorStudio] = useState<boolean>(true);

  // Phase 4: Automatically load saved base photo and measurement proportions from user profile
  useEffect(() => {
    const activeUserId = user?.id || "guest_user";
    const userProf = getUserProfile(activeUserId);
    setProfile(userProf);

    const basePhoto = userProf.bodyPhotoUrl || userProf.user_photo_url;
    if (basePhoto && !photo) {
      setPhoto(basePhoto);

      // Auto-extract dynamic color wheel palette from profile photo
      void extractColorPaletteFromImage(basePhoto).then((palette) => {
        if (palette && palette.length > 0) {
          setExtractedPalette(palette);
          if (palette[0]) {
            setBaseColorHex(palette[0].hex);
            setGarmentTheme((curr) => ({
              ...curr,
              mainBody: palette[0]!.hex,
              trims: palette[1]?.hex || curr.trims,
              buttons: palette[palette.length - 1]?.hex || curr.buttons,
              stitching: palette[2]?.hex || curr.stitching,
            }));
          }
        }
      });

      // Auto-initialize pose measurements directly
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const fallback = createDefaultPoseResult(img);
        if (userProf.bodyType === "Hourglass") fallback.measurements.bodyType = "Hourglass";
        else if (userProf.bodyType === "Inverted Triangle")
          fallback.measurements.bodyType = "Inverted triangle";
        else if (userProf.bodyType === "Pear") fallback.measurements.bodyType = "Triangle";
        else if (userProf.bodyType === "Rectangle") fallback.measurements.bodyType = "Rectangle";

        setOriginal(fallback.measurements);
        setMeasurements(fallback.measurements);
        setAnalysisPhoto(basePhoto);
        setBackgroundRemoved(false);
        setGuide(fallback.guide);
        setKeypoints(fallback.keypoints);
        setSkeletonLines(fallback.skeletonLines);
        setStatus("done");
        // Automatically bypass Step 1 and Step 2 directly into Step 3 (Fitting Room)
        setCurrentStep(3);
      };
      img.src = basePhoto;
    }
  }, [user?.id]);

  // What gets tried on: the chosen item, or the Color Studio's custom colourway
  const tryOnGarment = useMemo<ProductPreview | null>(
    () =>
      product ??
      (customGarmentDataUrl
        ? {
            title: "Custom colorway garment",
            siteName: "Color Studio",
            sourceUrl: "",
            imageDataUrl: customGarmentDataUrl,
          }
        : null),
    [product, customGarmentDataUrl],
  );
  const tryOn = useAiTryOn(photo ?? "", tryOnGarment);
  // Keep the GPU free for pose detection and try-on
  useBackgroundPause(status === "measuring" || tryOn.busy);

  const handleSaveMeasurementsToProfile = async () => {
    if (!measurements) return;
    setIsSyncingProfile(true);
    try {
      const activeUserId = user?.id || "guest_user";
      const round = (value: { cm: number } | null) => (value ? Math.round(value.cm) : null);
      const height = round(resolved.height);
      await apiUpdateUserProfile(activeUserId, {
        bodyPhotoUrl: photo,
        user_photo_url: photo,
        bodyType: measurements.bodyType,
        ...(height ? { heightCm: height, height: `${height} cm`, heightUnit: "cm" as const } : {}),
        ...(resolved.shoulderWidth
          ? {
              measurements: {
                unit: "cm" as const,
                shoulderWidth: round(resolved.shoulderWidth),
                bustChest: round(resolved.bustCircumference),
                waist: round(resolved.waistCircumference),
                hips: round(resolved.hipCircumference),
                inseam: round(resolved.legLength),
                torsoLength: round(resolved.torsoLength),
              },
            }
          : {}),
      });
    } catch {
      toast.error("Failed to sync measurements to profile.");
    } finally {
      setIsSyncingProfile(false);
    }
  };

  const measure = useCallback(async (dataUrl: string, userHeightCm: number) => {
    setStatus("measuring");
    setPoseError(null);

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () =>
          reject(new Error("Couldn't read that photo. Please try a different file."));
        element.src = src;
      });

    try {
      setAnalysisPhase("Removing background & framing your photo...");
      const { cleanupBodyPhoto } = await import("@/lib/image-cleanup");
      const cleaned = await cleanupBodyPhoto(dataUrl);

      setAnalysisPhase("Detecting body landmarks...");
      const { estimateBody } = await import("@/lib/pose");
      let source = cleaned.dataUrl;
      let usedCleanup = cleaned.backgroundRemoved;
      let result;
      try {
        result = await estimateBody(await loadImage(cleaned.dataUrl), {
          heightCm: userHeightCm,
          silhouette: cleaned.silhouette,
        });
      } catch (cleanedError) {
        if (!cleaned.backgroundRemoved) throw cleanedError;
        // Cleanup can occasionally clip a limb — retry on the untouched photo
        source = dataUrl;
        usedCleanup = false;
        result = await estimateBody(await loadImage(dataUrl), { heightCm: userHeightCm });
      }

      setAnalysisPhase("Converting to centimeters...");
      setAnalysisPhoto(source);
      setBackgroundRemoved(usedCleanup);
      setMeasurements(result.measurements);
      setOriginal(result.measurements);
      setGuide(result.guide);
      setKeypoints(result.keypoints);
      setSkeletonLines(result.skeletonLines);
      setStatus("done");
    } catch (cause) {
      setPoseError(
        cause instanceof Error
          ? cause.message
          : "We couldn't clearly detect your full body. Please upload a front-facing photo where your head, shoulders, hips, knees and feet are visible.",
      );
      setStatus("failed");
    }
  }, []);

  const handleUseManualPlacement = () => {
    if (!photo) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const fallback = createDefaultPoseResult(img);
      setOriginal(fallback.measurements);
      setMeasurements(fallback.measurements);
      setAnalysisPhoto(photo);
      setBackgroundRemoved(false);
      setGuide(fallback.guide);
      setKeypoints(fallback.keypoints);
      setSkeletonLines(fallback.skeletonLines);
      setStatus("done");
      setPoseError(null);
      setCurrentStep(3);
    };
    img.src = photo;
  };

  const handlePhotoSelect = (dataUrl: string) => {
    setPhoto(dataUrl);
    setPoseError(null);
    // Automatically extract dynamic color wheel palette from uploaded photo
    void extractColorPaletteFromImage(dataUrl).then((palette) => {
      if (palette && palette.length > 0) {
        setExtractedPalette(palette);
        if (palette[0]) {
          setBaseColorHex(palette[0].hex);
          setGarmentTheme((curr) => ({
            ...curr,
            mainBody: palette[0]!.hex,
            trims: palette[1]?.hex || curr.trims,
            buttons: palette[palette.length - 1]?.hex || curr.buttons,
            stitching: palette[2]?.hex || curr.stitching,
          }));
        }
      }
    });
  };

  const handleProductSelect = (newProduct: ProductPreview | null) => {
    setProduct(newProduct);
    if (newProduct?.imageDataUrl) {
      void extractColorPaletteFromImage(newProduct.imageDataUrl).then((palette) => {
        if (palette && palette.length > 0) {
          setExtractedPalette(palette);
          if (palette[0]) {
            setBaseColorHex(palette[0].hex);
            setGarmentTheme((curr) => ({
              ...curr,
              mainBody: palette[0]!.hex,
              trims: palette[1]?.hex || curr.trims,
              buttons: palette[palette.length - 1]?.hex || curr.buttons,
              stitching: palette[2]?.hex || curr.stitching,
            }));
          }
        }
      });
    }
  };

  // Step 2 opens on the height prompt; analysis starts once height is confirmed
  const handleStartAnalysis = () => {
    if (!photo) return;
    setStatus("idle");
    setCurrentStep(2);
  };

  const handleHeightConfirmed = (cm: number) => {
    if (!photo) return;
    setHeightCm(cm);
    void measure(photo, cm);
  };

  const handleProceedToFittingRoom = () => {
    setCurrentStep(3);
  };

  const reset = () => {
    setPhoto(null);
    setCurrentStep(1);
    setStatus("idle");
    setMeasurements(null);
    setOriginal(null);
    setGuide(null);
    setKeypoints([]);
    setSkeletonLines([]);
    setPoseError(null);
    setProduct(null);
    setAnalysisPhoto(null);
    setBackgroundRemoved(false);
  };

  const openGateSignUp = () =>
    openSignUp(undefined, "Sign up with 2-step verification to view your measurements.");

  const tryAnotherPhoto = () => {
    setPoseError(null);
    setStatus("idle");
    setCurrentStep(1);
  };

  const stepTabs = (
    // Desktop: a vertical index at the top of the side column. Phones: one scrolling row.
    <div className="flex items-center justify-between gap-4 border-b border-border min-[900px]:flex-col min-[900px]:items-start min-[900px]:gap-3 min-[900px]:border-b-0">
      <nav
        aria-label="Try-on steps"
        className="-mb-px flex min-w-0 gap-x-6 overflow-x-auto min-[900px]:mb-0 min-[900px]:flex-col min-[900px]:gap-y-1 min-[900px]:overflow-visible"
      >
        {(
          [
            { step: 1, label: "Upload Photo", enabled: true, go: () => setCurrentStep(1) },
            {
              step: 2,
              label: "Pose & Proportions",
              enabled: Boolean(photo),
              go: () => photo && setCurrentStep(2),
            },
            {
              step: 3,
              label: "Garment & Fit",
              enabled: status === "done",
              go: () => status === "done" && handleProceedToFittingRoom(),
            },
          ] as const
        ).map(({ step, label, enabled, go }) => (
          <button
            key={step}
            type="button"
            onClick={go}
            disabled={!enabled}
            aria-current={currentStep === step ? "step" : undefined}
            className={cn(
              "relative shrink-0 whitespace-nowrap border-b py-3 text-left text-[11px] font-medium uppercase tracking-[0.2em] transition-colors min-[900px]:border-b-0 min-[900px]:border-l min-[900px]:py-1.5 min-[900px]:pl-3",
              currentStep === step
                ? "border-gold text-foreground"
                : enabled
                  ? "glow border-transparent text-muted-foreground hover:text-foreground"
                  : "cursor-not-allowed border-transparent text-muted-foreground/70",
            )}
          >
            {String(step).padStart(2, "0")} {label}
          </button>
        ))}
      </nav>
      {photo ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="shrink-0 gap-1.5 min-[900px]:-ml-3"
        >
          <RefreshCw className="size-3.5" />
          Start over
        </Button>
      ) : null}
    </div>
  );

  const locked = !hasStudioAccess;

  return (
    <main className="page-gutter w-full overflow-x-clip pt-6 pb-6">
      {/* ================= STEP 01: PHOTO UPLOAD & VALIDATION ================= */}
      {currentStep === 1 ? (
        <EditorialLayout
          tabs={stepTabs}
          panel={
            <div className={PANEL_HEIGHT}>
              <PhotoUploader
                photoUrl={photo}
                onPhoto={handlePhotoSelect}
                onRemove={reset}
                onContinue={handleStartAnalysis}
                busy={status === "measuring"}
              />
            </div>
          }
          aside={
            <div className="space-y-10 min-[900px]:pt-[6vh]">
              <div>
                <p className="eyebrow">Step 01 — Your photo</p>
                <h1 className={PAGE_TITLE}>The fitting room</h1>
                <p className={cn(BODY_TEXT, "mt-4 max-w-md")}>
                  Upload a front-facing photo with your full body in frame. Everything stays in this
                  browser tab — no photos are uploaded to any server.
                </p>
                {/* Quick load saved profile photo if available */}
                {(() => {
                  const profile = getUserProfile(user?.id || "guest_user");
                  if (profile.user_photo_url && photo !== profile.user_photo_url) {
                    return (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePhotoSelect(profile.user_photo_url!)}
                        className="mt-5 gap-1.5 text-xs font-medium cursor-pointer"
                      >
                        <Camera className="size-3.5 text-gold-ink" />
                        <span>Use Saved Profile Photo</span>
                      </Button>
                    );
                  }
                  return null;
                })()}
              </div>

              <PhotoGuidance />

              {/* Dynamic Color Palette Extraction from Photo */}
              {photo && extractedPalette.length > 0 && (
                <div className="space-y-3 animate-in fade-in">
                  <p className="eyebrow">Palette from your photo</p>
                  <div className="flex items-center gap-1.5">
                    {extractedPalette.slice(0, 6).map((col, idx) => (
                      <div
                        key={idx}
                        className="size-6 rounded-md border border-black/10"
                        style={{ backgroundColor: col.hex }}
                        title={`${col.name} (${col.hex})`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {extractedPalette.length} tones, ready for the garment's main body, trims,
                    buttons and stitching in the fitting room.
                  </p>
                </div>
              )}
            </div>
          }
        />
      ) : null}

      {/* ================= STEP 02: REAL POSE DETECTION & MEASUREMENTS ================= */}
      {currentStep === 2 ? (
        <EditorialLayout
          tabs={stepTabs}
          panel={
            <div className={cn(PANEL_HEIGHT, "relative overflow-hidden rounded-md")}>
              {/* Height calibration prompt (runs before any analysis) */}
              {status === "idle" && photo ? (
                <div className="flex size-full items-center justify-center overflow-y-auto rounded-md border border-border p-4">
                  <HeightCalibrationCard initialCm={heightCm} onSubmit={handleHeightConfirmed} />
                </div>
              ) : null}

              {/* Analysis Loading State */}
              {status === "measuring" ? (
                <div className="flex size-full flex-col items-center justify-center space-y-4 rounded-md border border-border p-8 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
                    <Loader2 className="size-7 animate-spin text-accent-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-display">{analysisPhase}</h3>
                    <p className="max-w-md text-sm text-muted-foreground">
                      Cleaning the background, then running TensorFlow MoveNet on your device and
                      scaling everything to your {heightCm ? `${Math.round(heightCm)} cm` : ""}{" "}
                      height.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5 text-accent-foreground" />
                    <span>Processing locally in your browser</span>
                  </div>
                </div>
              ) : null}

              {/* Failed Pose Detection State */}
              {status === "failed" ? (
                <div className="flex size-full flex-col justify-center space-y-4 overflow-y-auto rounded-md border border-destructive/40 p-8">
                  <p className="eyebrow text-destructive">Detection error</p>
                  <h2 className="text-2xl font-display">
                    We couldn't clearly detect your full body
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {poseError ||
                      "Please upload a front-facing photo where your head, shoulders, hips, knees and feet are clearly visible against an uncluttered background."}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <Button
                      onClick={handleUseManualPlacement}
                      size="default"
                      className="gap-2 border border-gold bg-transparent text-gold-ink hover:bg-gold/10 cursor-pointer"
                    >
                      <ArrowRight className="size-4" />
                      Skip to Fitting Room (Manual Garment Placement)
                    </Button>
                    <Button
                      onClick={() =>
                        photo && (heightCm ? void measure(photo, heightCm) : setStatus("idle"))
                      }
                      variant="outline"
                      className="gap-2 cursor-pointer"
                    >
                      <RefreshCw className="size-4" />
                      Retry detection
                    </Button>
                    <Button
                      onClick={tryAnotherPhoto}
                      variant="ghost"
                      size="default"
                      className="gap-2 cursor-pointer"
                    >
                      Try another photo
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Successful Detection State: pose overlay, with the auth gate over it */}
              {status === "done" && photo && measurements && original ? (
                <>
                  <div
                    className={cn(
                      "size-full transition-all duration-300",
                      locked && "pointer-events-none select-none opacity-40 blur-sm",
                    )}
                  >
                    <PoseOverlay
                      photoUrl={analysisPhoto ?? photo}
                      keypoints={keypoints}
                      skeletonLines={skeletonLines}
                      confidence={measurements.confidence}
                      detectedCount={measurements.detectedLandmarksCount}
                      totalCount={measurements.totalLandmarksCount}
                      lowConfidenceMeasurements={lowConfidenceLabels(resolved)}
                      backgroundRemoved={backgroundRemoved}
                    />
                  </div>
                  {locked ? (
                    <div
                      id="measurements-lock-overlay"
                      className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 p-4 sm:p-6"
                    >
                      <div className="w-full max-w-[520px] surface border-gold/40 bg-card/95 px-5 py-5 sm:px-10 sm:py-8 text-center shadow-2xl">
                        <div className="mx-auto flex size-12 sm:size-14 items-center justify-center rounded-full border border-gold/60 text-gold-ink ring-4 ring-primary/15 animate-in zoom-in duration-300">
                          <Lock className="size-6" />
                        </div>
                        <p className="eyebrow mt-4">Gate Enforced</p>
                        <h3 className="mt-2 text-2xl sm:text-3xl font-display">
                          Measurements Locked
                        </h3>
                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                          Your proportions are ready. Sign up or log in to reveal your measurements
                          and unlock the fitting room.
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground/80">
                          Body proportion analysis runs on your device.
                        </p>
                        <div className="mt-5 sm:mt-7 flex flex-col items-center gap-2.5 sm:gap-3">
                          <div className="flex w-full flex-col gap-2 sm:gap-3 md:w-auto md:flex-row">
                            <Button
                              type="button"
                              onClick={openGateSignUp}
                              className="w-full md:w-auto gap-2"
                            >
                              <UserPlus className="size-4" />
                              Sign up (2-step)
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                openLogin(
                                  undefined,
                                  "Log in to view your body measurements and proceed with the fitting room.",
                                )
                              }
                              className="w-full md:w-auto gap-2"
                            >
                              <LogIn className="size-4" />
                              Log in
                            </Button>
                          </div>
                          <button
                            type="button"
                            onClick={loginAsGuest}
                            className="cursor-pointer text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-gold-ink"
                          >
                            Continue as guest
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          }
          aside={
            <div className="space-y-10">
              <div>
                <p className="eyebrow">Step 02 — Pose analysis</p>
                <h1 className={PAGE_TITLE}>Body landmarks & proportions</h1>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={tryAnotherPhoto}
                    className="gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="size-3.5" />
                    Change photo
                  </Button>
                  {status === "done" ? (
                    <Button
                      size="sm"
                      onClick={hasStudioAccess ? handleProceedToFittingRoom : openGateSignUp}
                      title={hasStudioAccess ? undefined : "Sign up or log in to try on clothes"}
                      className="gap-1.5 cursor-pointer"
                    >
                      {locked && <Lock className="size-3.5" />}
                      <span>Try on clothes</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>

              {status === "done" && photo && measurements && original ? (
                <div
                  aria-hidden={locked || undefined}
                  className={cn(
                    "space-y-10 transition-all duration-300",
                    locked && "pointer-events-none select-none opacity-40 blur-sm",
                  )}
                >
                  <MeasurementsCard
                    measurements={measurements}
                    resolved={resolved}
                    manual={manual}
                    manualEnabled={manualEnabled}
                    onManualChange={setManual}
                    onManualEnabledChange={setManualEnabled}
                    onRecalibrate={() => setStatus("idle")}
                  />

                  {/* Phase 4: Save Calibrated Proportions to User Profile */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Keep these calibrated body dimensions synced:
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSyncingProfile}
                      onClick={handleSaveMeasurementsToProfile}
                      className="h-8 gap-1.5 text-xs cursor-pointer border-primary/30 text-gold-ink hover:bg-primary/10"
                    >
                      {isSyncingProfile ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <Save className="size-3" />
                      )}
                      <span>Save to Profile</span>
                    </Button>
                  </div>

                  <div className="space-y-4 border-t border-border pt-8">
                    <div>
                      <h4 className="font-display text-lg">Ready to try on garments?</h4>
                      <p className={cn(BODY_TEXT, "mt-1")}>
                        Paste a clothing link or upload a garment to see how it layers over your
                        proportions.
                      </p>
                    </div>
                    <Button onClick={handleProceedToFittingRoom} className="gap-2 cursor-pointer">
                      {locked && <Lock className="size-4" />}
                      <span>Next: Choose garment</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          }
        />
      ) : null}

      {/* ================= STEP 03: CLOTHING LINK & TRY-ON CANVAS ================= */}
      {currentStep === 3 && locked ? (
        <EditorialLayout
          tabs={stepTabs}
          panel={
            <div
              className={cn(
                PANEL_HEIGHT,
                "flex items-center justify-center rounded-md border border-border p-4",
              )}
            >
              <div
                id="step3-auth-gate-card"
                className="surface max-w-md space-y-4 border-gold/40 bg-card/95 p-8 text-center"
              >
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-gold/60 text-gold-ink">
                  <Lock className="size-6" />
                </div>
                <h2 className="text-2xl font-display">Fitting Room Locked</h2>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  You must be logged in with a verified account to layer garments and use the
                  interactive fitting room canvas.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() =>
                      openSignUp(
                        undefined,
                        "Sign up with 2-step verification to use the fitting room.",
                      )
                    }
                    className="cursor-pointer"
                  >
                    <UserPlus className="size-4" />
                    Sign up (2-step)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openLogin(undefined, "Log in to use the fitting room.")}
                    className="cursor-pointer"
                  >
                    <LogIn className="size-4" />
                    Log in
                  </Button>
                </div>
              </div>
            </div>
          }
          aside={
            <div>
              <p className="eyebrow">Step 03 — Virtual fitting</p>
              <h1 className={PAGE_TITLE}>Layer your garment</h1>
            </div>
          }
        />
      ) : null}

      {currentStep === 3 && !locked ? (
        <div className="pb-10">
          <EditorialLayout
            wide
            tabs={stepTabs}
            panel={
              // Your photo | garment: two tall panels side by side
              <div className="grid grid-cols-1 gap-8 min-[900px]:grid-cols-2 min-[900px]:gap-[clamp(16px,2vw,32px)]">
                <TryOnPhotoFrame tryOn={tryOn} />

                <div className="min-w-0 space-y-3">
                  <div className="flex min-h-8 items-center justify-between gap-3">
                    <p className={FRAME_LABEL}>Garment</p>
                    {tryOnGarment?.siteName ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {tryOnGarment.siteName}
                      </p>
                    ) : null}
                  </div>
                  <div data-frame="garment" className={cn(IMAGE_FRAME, "bg-foreground/10")}>
                    {tryOnGarment ? (
                      <img
                        src={tryOnGarment.imageDataUrl}
                        alt={tryOnGarment.title}
                        className="absolute inset-0 size-full object-contain p-3"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                        <Shirt className="size-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Paste a product link, upload a photo or pick from your closet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            }
            aside={
              <div className="space-y-10">
                <div>
                  <p className="eyebrow">Step 03 — Virtual fitting</p>
                  <h1 className={PAGE_TITLE}>Layer your garment</h1>
                  <div className="mt-6 flex flex-wrap items-start gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                      className="gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="size-3.5" />
                      Back
                    </Button>
                    <TryOnButton tryOn={tryOn} className="items-start" />
                  </div>
                </div>

                {tryOnGarment ? (
                  <div className="min-w-0">
                    <p className="eyebrow">Garment</p>
                    <p className="mt-2 truncate text-sm font-medium text-foreground">
                      {tryOnGarment.title}
                    </p>
                    {tryOnGarment.sourceUrl ? (
                      <a
                        href={tryOnGarment.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-xs text-muted-foreground underline-offset-4 hover:underline"
                      >
                        {tryOnGarment.sourceUrl}
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <ClothingLinkPanel preview={product} onPreview={handleProductSelect} />
                {tryOnGarment ? <GarmentTypePicker tryOn={tryOn} /> : null}
              </div>
            }
          />

          <div className="mt-16 space-y-8">
            {/* Phase 4: Base Model Status Banner */}
            {profile?.bodyPhotoUrl && (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="font-medium text-foreground">
                      Profile Base Model Active ({profile.bodyType || "Hourglass"} •{" "}
                      {profile.height || "168 cm"})
                    </span>
                    <span className="text-muted-foreground hidden sm:inline ml-1.5">
                      • Proportions and pose landmarks auto-loaded
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Calibrate Pose
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-medium cursor-pointer"
                  >
                    <Link to="/profile">Profile Settings</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Dynamic Color Wheel, Harmonies & Garment Atelier Studio */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md border border-gold/60 bg-transparent text-gold-ink">
                    <Palette className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-semibold">
                        Bespoke Garment Palette & Color Studio
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-gold-ink">
                        Dynamic Wheel
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Customize Main Body, Trims, Buttons, and Stitching with dynamic complementary,
                      triadic, and analogous harmonies.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowColorStudio(!showColorStudio)}
                    className="text-xs gap-1.5 cursor-pointer border-primary/30 text-gold-ink hover:bg-primary/10"
                  >
                    <Palette className="size-3.5" />
                    <span>{showColorStudio ? "Hide Atelier Studio" : "Open Color Studio"}</span>
                  </Button>
                </div>
              </div>

              {showColorStudio && (
                <ColorStudioPanel
                  userPhotoUrl={photo}
                  garmentPhotoUrl={product?.imageDataUrl}
                  garmentTitle={product?.title || "Bespoke Silhouette"}
                  theme={garmentTheme}
                  onThemeChange={setGarmentTheme}
                  extractedPalette={extractedPalette}
                  onPaletteExtracted={setExtractedPalette}
                  baseColorHex={baseColorHex}
                  onBaseColorChange={setBaseColorHex}
                  onCustomGarmentGenerated={setCustomGarmentDataUrl}
                  onApplyAndClose={() => {
                    if (!product && customGarmentDataUrl) {
                      setProduct({
                        title: "Bespoke Tailored Garment",
                        siteName: "Color Atelier",
                        sourceUrl: "",
                        imageDataUrl: customGarmentDataUrl,
                      });
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

/** The main image/upload panel: ~70% of a phone screen; on desktop, header to near the bottom */
const PANEL_HEIGHT = "h-[70svh] min-[900px]:h-[calc(100svh-64px-48px)]";
const PAGE_TITLE = "mt-3 font-display text-3xl leading-[1.1] xl:text-[2.6rem]";
const BODY_TEXT = "text-[13px] leading-relaxed text-muted-foreground";

/**
 * Editorial, full-bleed step layout on a 12-column grid: a large panel on the left (7 columns,
 * or 8 for `wide`) that stays in view, and a narrow, unboxed text column on the right after a
 * spare gap column. On phones it stacks: step tabs, panel, then text.
 */
function EditorialLayout({
  tabs,
  panel,
  aside,
  wide = false,
}: {
  tabs: React.ReactNode;
  panel: React.ReactNode;
  aside: React.ReactNode;
  wide?: boolean;
}) {
  const side = wide
    ? "min-[900px]:col-span-3 min-[900px]:col-start-10"
    : "min-[900px]:col-span-4 min-[900px]:col-start-9";
  return (
    <div className="grid grid-cols-1 gap-y-8 min-[900px]:grid-cols-12 min-[900px]:grid-rows-[auto_1fr] min-[900px]:gap-x-[clamp(16px,2vw,32px)] min-[900px]:gap-y-10">
      <div className={cn("min-w-0 min-[900px]:row-start-1", side)}>{tabs}</div>
      <div
        className={cn(
          "min-w-0 min-[900px]:sticky min-[900px]:top-[88px] min-[900px]:col-start-1 min-[900px]:row-span-2 min-[900px]:row-start-1 min-[900px]:self-start",
          wide ? "min-[900px]:col-span-8" : "min-[900px]:col-span-7",
        )}
      >
        {panel}
      </div>
      <div className={cn("min-w-0 min-[900px]:row-start-2", side)}>{aside}</div>
    </div>
  );
}
