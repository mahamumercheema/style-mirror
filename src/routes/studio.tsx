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
  User,
  UserPlus,
  Wand2,
} from "lucide-react";

import {
  EMPTY_GARMENT_UPLOADS,
  GarmentUploadCards,
  type GarmentUploads,
} from "@/components/GarmentUploadCards";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { HeightCalibrationCard } from "@/components/HeightCalibrationCard";
import { lowConfidenceLabels, MeasurementsCard } from "@/components/MeasurementsCard";
import { PhotoGuidance, PhotoUploader } from "@/components/PhotoUploader";
import { PoseOverlay } from "@/components/PoseOverlay";
import { GarmentCardsTryOnButton, TryOnPhotoFrame } from "@/components/AiTryOnPanel";
import { useGarmentCardsTryOn } from "@/hooks/use-garment-cards-try-on";
import { useBackgroundPause } from "@/hooks/use-background-pause";
import { FRAME_LABEL, IMAGE_FRAME } from "@/lib/frame-styles";
import { ColorStudioPanel } from "@/components/colors/ColorStudioPanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { GuestLockScreenPreview } from "@/components/GuestLockScreenPreview";
import { getUserProfile } from "@/lib/wardrobe-service";
import { apiGetUserProfile, apiUpdateUserProfile } from "@/lib/user.functions";
import type { UserProfile, WardrobeItemWithDetails } from "@/types/wardrobe";
import { toast } from "sonner";
import {
  createDefaultPoseResult,
  type DetectedKeypoint,
  type Measurements,
  type PoseGuide,
  type SkeletonLine,
} from "@/lib/pose-types";
import { resolveMeasurements, type ManualMeasurements } from "@/lib/body-measurements";
import {
  itemImage,
  linkDomain,
  OUTFIT_SLOT_LABELS,
  OUTFIT_SLOTS,
  type OutfitPayload,
  type OutfitSlot,
} from "@/lib/outfit";
import {
  extractColorPaletteFromImage,
  FALLBACK_MOOD_BOARD_PALETTE,
  type ExtractedColor,
  type GarmentColorTheme,
} from "@/lib/color-palette";
import { cn } from "@/lib/utils";

function parentTypeToSlot(parentType: string | null | undefined): OutfitSlot {
  if (parentType === "Bottoms") return "pants";
  if (parentType === "Outerwear") return "jacket";
  return "top";
}

function StudioRouteWrapper() {
  // Publicly accessible fitting studio ("Try It Now")
  return <Studio />;
}

export const Route = createFileRoute("/studio")({
  validateSearch: (search: Record<string, unknown>) => ({
    garmentId: typeof search.garmentId === "string" ? search.garmentId : undefined,
  }),
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
  component: StudioRouteWrapper,
});

type WorkflowStep = 1 | 2 | 3;

function Studio() {
  const { garmentId } = Route.useSearch();
  const { user, isAuthenticated, isGuest, openLogin, openSignUp, loginAsGuest } = useAuth();
  const hasStudioAccess = isAuthenticated || isGuest;
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
  /** "Add garments" cards: { top, pants, jacket, sweater }, each a photo, a link or null */
  const [garments, setGarments] = useState<GarmentUploads>(EMPTY_GARMENT_UPLOADS);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [preloadedGarment, setPreloadedGarment] = useState<{
    slot: OutfitSlot;
    title: string;
    imageUrl: string;
  } | null>(null);

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
  const [showColorStudio, setShowColorStudio] = useState<boolean>(true);

  // Each step opens at the top of the page, not at the previous step's scroll position
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentStep]);

  // Phase 4: Automatically load saved base photo and measurement proportions from user profile
  useEffect(() => {
    const activeUserId = user?.id || "guest_user";
    const loadAndApplyProfile = async () => {
      const userProf =
        user?.id && user.id !== "guest_user"
          ? await apiGetUserProfile(user.id)
          : getUserProfile(activeUserId);
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
    };
    void loadAndApplyProfile();
  }, [user?.id, photo]);

  // Pre-load a garment when arriving from "Try on in Studio" in My Closet
  useEffect(() => {
    if (!garmentId || !user?.id || user.id === "guest_user") return;
    const token =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("vtr_auth_token") ?? user.id)
        : user.id;
    fetch("/api/wardrobe", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data: { items?: WardrobeItemWithDetails[] }) => {
        const item = data.items?.find((i) => i.id === garmentId);
        if (!item) return; // deleted or wrong ID — fall back to empty garment cards
        const slot = parentTypeToSlot(item.category?.parent_type);
        setGarments((prev) => ({ ...prev, [slot]: item.image_url }));
        setPreloadedGarment({
          slot,
          title: item.title || "Garment",
          imageUrl: item.thumbnail_url || item.image_url,
        });
      })
      .catch(() => { /* graceful fallback: garment cards stay empty */ });
  }, [garmentId, user?.id]);

  // Try it on sends the photo plus every filled "Add garments" card
  const cardsTryOn = useGarmentCardsTryOn(photo ?? "", garments);
  // Keep the GPU free for pose detection and try-on
  useBackgroundPause(status === "measuring" || cardsTryOn.busy);

  const handleSaveMeasurementsToProfile = async () => {
    if (!measurements) return;
    if (!user || user.id === "guest_user") {
      openSignUp(undefined, "Create an account to save your measurements to your profile.");
      return;
    }
    setIsSyncingProfile(true);
    try {
      const round = (value: { cm: number } | null) => (value ? Math.round(value.cm) : null);
      const height = round(resolved.height);
      await apiUpdateUserProfile(user.id, {
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
      toast.success("Measurements saved to your profile.");
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

  const scrollToGarmentCards = () =>
    document.getElementById("add-garments")?.scrollIntoView({ behavior: "smooth", block: "start" });

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
                ? "border-cobalt-border text-foreground"
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
                        <Camera className="size-3.5 text-cobalt-text" />
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
                  <div className="pt-2 text-xs text-muted-foreground">
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
                      className="gap-2 border border-cobalt-border bg-transparent text-cobalt-text hover:bg-cobalt-tint cursor-pointer"
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
                      <div className="w-full max-w-[520px] surface border-cobalt-border bg-card/95 px-5 py-5 sm:px-10 sm:py-8 text-center shadow-2xl">
                        <div className="mx-auto flex size-12 sm:size-14 items-center justify-center rounded-full border border-cobalt-border text-cobalt-text ring-4 ring-primary/15 animate-in zoom-in duration-300">
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
                            className="cursor-pointer text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-cobalt-text"
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
                <div className="mt-6 space-y-2">
                  {status === "done" ? (
                    <Button
                      size="default"
                      onClick={hasStudioAccess ? handleProceedToFittingRoom : openGateSignUp}
                      title={hasStudioAccess ? undefined : "Sign up or log in to try on clothes"}
                      className="w-full gap-2 cursor-pointer"
                    >
                      {locked && <Lock className="size-4" />}
                      <span>Try on clothes</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={tryAnotherPhoto}
                    className="w-full gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="size-3.5" />
                    Change photo
                  </Button>
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
                    onSaveToProfile={handleSaveMeasurementsToProfile}
                    isSyncingProfile={isSyncingProfile}
                  />

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
                className="surface max-w-md space-y-4 border-cobalt-border bg-card/95 p-8 text-center"
              >
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-cobalt-border text-cobalt-text">
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
                <TryOnPhotoFrame tryOn={cardsTryOn} />
                <OutfitFrame outfit={cardsTryOn.payload} />
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
                    <GarmentCardsTryOnButton
                      cards={cardsTryOn}
                      onEdit={scrollToGarmentCards}
                      className="min-w-0 flex-1 basis-full"
                    />
                  </div>
                </div>

                <div id="add-garments" className="scroll-mt-24 space-y-4">
                  {preloadedGarment ? (
                    <div className="flex items-center gap-3 rounded-md border border-cobalt-border bg-cobalt-tint/20 p-3">
                      <img
                        src={preloadedGarment.imageUrl}
                        alt={preloadedGarment.title}
                        className="size-14 shrink-0 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{preloadedGarment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {OUTFIT_SLOT_LABELS[preloadedGarment.slot]} · from your closet
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 cursor-pointer"
                        onClick={() => {
                          setGarments((prev) => ({
                            ...prev,
                            [preloadedGarment.slot]: null,
                          }));
                          setPreloadedGarment(null);
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : null}
                  <GarmentUploadCards garments={garments} onChange={setGarments} />
                </div>
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
                  <div className="flex size-10 items-center justify-center rounded-md border border-cobalt-border bg-transparent text-cobalt-text">
                    <Palette className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-semibold">
                        Bespoke Garment Palette & Color Studio
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-cobalt-text">
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
                    className="text-xs gap-1.5 cursor-pointer border-primary/30 text-cobalt-text hover:bg-primary/10"
                  >
                    <Palette className="size-3.5" />
                    <span>{showColorStudio ? "Hide Atelier Studio" : "Open Color Studio"}</span>
                  </Button>
                </div>
              </div>

              {showColorStudio && (
                <ColorStudioPanel
                  userPhotoUrl={photo}
                  theme={garmentTheme}
                  onThemeChange={setGarmentTheme}
                  extractedPalette={extractedPalette}
                  onPaletteExtracted={setExtractedPalette}
                  baseColorHex={baseColorHex}
                  onBaseColorChange={setBaseColorHex}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

/** Garment column while building a look: the chosen pieces, each labelled */
function OutfitFrame({ outfit }: { outfit: OutfitPayload }) {
  const pieces = OUTFIT_SLOTS.filter((slot) => outfit[slot]);
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <p className={FRAME_LABEL}>Your look</p>
        <p className="text-[11px] text-muted-foreground">
          {pieces.length} of {OUTFIT_SLOTS.length} pieces
        </p>
      </div>
      <div data-frame="garment" className={cn(IMAGE_FRAME, "bg-foreground/10")}>
        {pieces.length > 0 ? (
          <div className="absolute inset-0 grid auto-rows-fr grid-cols-2 gap-px overflow-y-auto bg-border">
            {pieces.map((slot) => {
              const item = outfit[slot]!;
              const image = itemImage(item);
              return (
                <figure key={slot} className="relative min-h-0 bg-secondary">
                  {image ? (
                    <img
                      src={image}
                      alt={OUTFIT_SLOT_LABELS[slot]}
                      className="absolute inset-0 size-full object-contain p-3 pt-8"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-3">
                      <span className="max-w-full truncate rounded-full border border-border px-3 py-1 text-xs text-foreground">
                        {linkDomain(item.src)}
                      </span>
                    </div>
                  )}
                  <figcaption className="absolute top-2.5 left-3 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {OUTFIT_SLOT_LABELS[slot]}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Shirt className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Add a top, pants, jacket or sweater to build your look.
            </p>
          </div>
        )}
      </div>
    </div>
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
