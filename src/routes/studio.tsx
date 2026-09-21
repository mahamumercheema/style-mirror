import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Lock,
  LogIn,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";

import { ClothingLinkPanel } from "@/components/ClothingLinkPanel";
import { HeaderAuthButtons } from "@/components/HeaderAuthButtons";
import { MeasurementsCard } from "@/components/MeasurementsCard";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PoseOverlay } from "@/components/PoseOverlay";
import { TryOnCanvas } from "@/components/TryOnCanvas";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  estimateBody,
  type DetectedKeypoint,
  type Measurements,
  type PoseGuide,
  type SkeletonLine,
} from "@/lib/pose";
import type { ProductPreview } from "@/lib/product.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Try-on studio — Virtual Try Room" },
      {
        name: "description",
        content:
          "Upload a full-body photo, get approximate body proportions read in your browser, then layer a garment from any shop link onto your photo.",
      },
      { property: "og:title", content: "Try-on studio — Virtual Try Room" },
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

export function Studio() {
  const { isAuthenticated, user, openLogin, openSignUp } = useAuth();

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

  const measure = useCallback(async (dataUrl: string) => {
    setStatus("measuring");
    setPoseError(null);
    setAnalysisPhase("Reading your photo...");

    // Staged progress feedback for real browser inference
    const phaseTimeout1 = setTimeout(() => {
      setAnalysisPhase("Detecting body position...");
    }, 650);

    const phaseTimeout2 = setTimeout(() => {
      setAnalysisPhase("Checking pose landmarks...");
    }, 1400);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () =>
          reject(new Error("Couldn't read that photo. Please try a different file."));
        element.src = dataUrl;
      });

      const result = await estimateBody(image);

      clearTimeout(phaseTimeout1);
      clearTimeout(phaseTimeout2);

      setMeasurements(result.measurements);
      setOriginal(result.measurements);
      setGuide(result.guide);
      setKeypoints(result.keypoints);
      setSkeletonLines(result.skeletonLines);
      setStatus("done");
    } catch (cause) {
      clearTimeout(phaseTimeout1);
      clearTimeout(phaseTimeout2);
      setPoseError(
        cause instanceof Error
          ? cause.message
          : "We couldn't clearly detect your full body. Please upload a front-facing photo where your head, shoulders, hips, knees and feet are visible.",
      );
      setStatus("failed");
    }
  }, []);

  const handlePhotoSelect = (dataUrl: string) => {
    setPhoto(dataUrl);
    setPoseError(null);
    // User stays on step 1 with preview until they review and click continue
  };

  const handleStartAnalysis = () => {
    if (!photo) return;
    setCurrentStep(2);
    void measure(photo);

    // Auth Gate: As analysis begins, prompt for authentication if not signed in
    if (!isAuthenticated) {
      openLogin(
        undefined,
        "Authentication Required: Log in or sign up with 2-step verification to view your measurements and enter the fitting room.",
      );
    }
  };

  const handleProceedToFittingRoom = () => {
    if (!isAuthenticated) {
      openLogin(
        undefined,
        "Authentication Required: Please log in or sign up with 2-step verification to access the fitting room.",
      );
      return;
    }
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
  };

  const tryAnotherPhoto = () => {
    setPoseError(null);
    setStatus("idle");
    setCurrentStep(1);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:py-16">
      {/* Navigation Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Virtual Try Room
        </Link>

        {/* Step Indicator Breadcrumbs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-colors",
              currentStep === 1
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <span>01</span>
            <span>Upload Photo</span>
          </button>

          <ChevronRight className="size-3 text-muted-foreground/40" />

          <button
            type="button"
            onClick={() => photo && setCurrentStep(2)}
            disabled={!photo}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-colors",
              currentStep === 2
                ? "bg-primary text-primary-foreground"
                : photo
                  ? "text-muted-foreground hover:bg-muted"
                  : "text-muted-foreground/40 cursor-not-allowed",
            )}
          >
            <span>02</span>
            <span>Pose & Proportions</span>
          </button>

          <ChevronRight className="size-3 text-muted-foreground/40" />

          <button
            type="button"
            onClick={() => status === "done" && handleProceedToFittingRoom()}
            disabled={status !== "done"}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-colors",
              currentStep === 3
                ? "bg-primary text-primary-foreground"
                : status === "done"
                  ? "text-muted-foreground hover:bg-muted"
                  : "text-muted-foreground/40 cursor-not-allowed",
            )}
          >
            <span>03</span>
            <span>Garment & Fit</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {photo && (
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-xs">
              <RefreshCw className="size-3.5" />
              Start over
            </Button>
          )}
          <div className="h-4 w-px bg-border hidden sm:block" />
          <HeaderAuthButtons />
        </div>
      </header>

      {/* Main Workflow Container */}
      <div className="mt-8 space-y-8">
        {/* ================= STEP 01: PHOTO UPLOAD & VALIDATION ================= */}
        {currentStep === 1 ? (
          <section className="space-y-6">
            <div>
              <p className="eyebrow">Step 01 — Your photo</p>
              <h1 className="mt-2 text-4xl md:text-5xl font-display">The fitting room</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                Upload a front-facing photo with your full body in frame. Everything stays in this
                browser tab — no photos are uploaded to any server.
              </p>
            </div>

            <PhotoUploader
              photoUrl={photo}
              onPhoto={handlePhotoSelect}
              onRemove={reset}
              onContinue={handleStartAnalysis}
              busy={status === "measuring"}
            />
          </section>
        ) : null}

        {/* ================= STEP 02: REAL POSE DETECTION & MEASUREMENTS ================= */}
        {currentStep === 2 ? (
          <section className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Step 02 — Pose analysis</p>
                <h1 className="mt-1 text-3xl md:text-4xl font-display">
                  Body landmarks & proportions
                </h1>
              </div>
              <div className="flex items-center gap-2">
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
                    onClick={handleProceedToFittingRoom}
                    className="gap-1.5 cursor-pointer"
                  >
                    {!isAuthenticated && <Lock className="size-3.5" />}
                    <span>Try on clothes</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Auth Gate Notification Banner for Step 2 */}
            {!isAuthenticated ? (
              <div
                id="step2-auth-gate-banner"
                className="surface p-4 sm:p-5 border-accent/40 bg-accent/10 rounded-xl space-y-3 shadow-[var(--shadow-lift)]"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
                        <Lock className="size-3" />
                      </span>
                      <span className="eyebrow text-accent-foreground">Authentication Gate</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-display font-medium">
                      Authentication Required to View Measurements
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Body proportion analysis runs on your device. Log in or sign up with 2-step
                      verification to reveal measurements and unlock the fitting room.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openLogin(
                          undefined,
                          "Authentication Required: Log in to view your body measurements.",
                        )
                      }
                      className="gap-1.5 flex-1 sm:flex-initial text-xs cursor-pointer"
                    >
                      <LogIn className="size-3.5" />
                      Log In
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() =>
                        openSignUp(
                          undefined,
                          "Authentication Required: Sign up with 2-step verification to view measurements.",
                        )
                      }
                      className="gap-1.5 flex-1 sm:flex-initial text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                    >
                      <UserPlus className="size-3.5" />
                      Sign Up (2-Step)
                    </Button>
                  </div>
                </div>
              </div>
            ) : user ? (
              <div
                id="authenticated-user-badge"
                className="flex items-center justify-between gap-2 text-xs text-emerald-600 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>
                    Authenticated as <strong className="font-semibold">{user.email}</strong> —
                    Measurements unlocked
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
            ) : null}

            {/* Analysis Loading State */}
            {status === "measuring" ? (
              <div className="surface flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
                  <Loader2 className="size-7 animate-spin text-accent-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-display">{analysisPhase}</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Running TensorFlow MoveNet on your device. Detecting joint coordinates and
                    proportions.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <Sparkles className="size-3.5 text-accent-foreground" />
                  <span>Processing locally in your browser</span>
                </div>
              </div>
            ) : null}

            {/* Failed Pose Detection State */}
            {status === "failed" ? (
              <div className="surface p-8 space-y-4 border-destructive/40">
                <p className="eyebrow text-destructive">Detection error</p>
                <h2 className="text-2xl font-display">We couldn't clearly detect your full body</h2>
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  {poseError ||
                    "Please upload a front-facing photo where your head, shoulders, hips, knees and feet are clearly visible against an uncluttered background."}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <Button
                    onClick={() => photo && void measure(photo)}
                    variant="outline"
                    className="gap-2"
                  >
                    <RefreshCw className="size-4" />
                    Retry detection
                  </Button>
                  <Button onClick={tryAnotherPhoto} size="default" className="gap-2">
                    Try another photo
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Successful Detection State: Pose Overlay & Measurements (with Auth Gate Protection) */}
            {status === "done" && photo && measurements && original ? (
              <div className="relative">
                {/* Visual Lock Overlay if user is not authenticated */}
                {!isAuthenticated && (
                  <div
                    id="measurements-lock-overlay"
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-background/85 backdrop-blur-md rounded-xl border border-border/80 shadow-xl my-auto"
                  >
                    <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground mb-3 shadow-lg ring-4 ring-primary/15 animate-in zoom-in duration-300">
                      <Lock className="size-6" />
                    </div>
                    <span className="eyebrow text-muted-foreground mb-1">Gate Enforced</span>
                    <h3 className="text-2xl sm:text-3xl font-display">Measurements Locked</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-2 mb-5 leading-relaxed">
                      Your body proportions have been analyzed and locked. Log in or complete 2-step
                      sign up to view your exact measurements, confidence metrics, and proceed to
                      the fitting room.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        type="button"
                        size="default"
                        onClick={() =>
                          openLogin(
                            undefined,
                            "Log in to view your body measurements and proceed with the fitting room.",
                          )
                        }
                        className="gap-2 cursor-pointer shadow-sm"
                      >
                        <LogIn className="size-4" />
                        Log In to Unlock
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        onClick={() =>
                          openSignUp(
                            undefined,
                            "Sign up with 2-step verification to view your measurements.",
                          )
                        }
                        className="gap-2 cursor-pointer"
                      >
                        <UserPlus className="size-4" />
                        Sign Up (2-Step Flow)
                      </Button>
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    "grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start transition-all duration-300",
                    !isAuthenticated && "filter blur-sm pointer-events-none select-none opacity-40",
                  )}
                >
                  {/* Pose Landmark Canvas Overlay */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="eyebrow">Detected joints & skeleton</p>
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="size-3.5" />
                        Landmarks verified
                      </span>
                    </div>
                    <PoseOverlay
                      photoUrl={photo}
                      keypoints={keypoints}
                      skeletonLines={skeletonLines}
                      confidence={measurements.confidence}
                      detectedCount={measurements.detectedLandmarksCount}
                      totalCount={measurements.totalLandmarksCount}
                    />
                  </div>

                  {/* Body Proportions Card */}
                  <div className="space-y-6">
                    <MeasurementsCard
                      measurements={measurements}
                      original={original}
                      onChange={setMeasurements}
                    />

                    <div className="surface p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h4 className="font-display text-lg">Ready to try on garments?</h4>
                        <p className="text-xs text-muted-foreground">
                          Paste a clothing link or upload a garment to see how it layers over your
                          proportions.
                        </p>
                      </div>
                      <Button
                        onClick={handleProceedToFittingRoom}
                        size="lg"
                        className="gap-2 shrink-0 cursor-pointer"
                      >
                        {!isAuthenticated && <Lock className="size-4" />}
                        <span>Next: Choose garment</span>
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* ================= STEP 03: CLOTHING LINK & TRY-ON CANVAS ================= */}
        {currentStep === 3 ? (
          !isAuthenticated ? (
            <div
              id="step3-auth-gate-card"
              className="surface p-8 text-center space-y-4 max-w-md mx-auto my-12 border-accent/40 bg-accent/5 rounded-xl shadow-[var(--shadow-lift)]"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground mx-auto shadow-md">
                <Lock className="size-6" />
              </div>
              <h2 className="text-2xl font-display">Fitting Room Locked</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You must be logged in with a verified account to layer garments and use the
                interactive fitting room canvas.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => openLogin(undefined, "Log in to use the fitting room.")}
                  className="cursor-pointer"
                >
                  <LogIn className="size-4 mr-1.5" />
                  Log In
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    openSignUp(
                      undefined,
                      "Sign up with 2-step verification to use the fitting room.",
                    )
                  }
                  className="cursor-pointer"
                >
                  <UserPlus className="size-4 mr-1.5" />
                  Sign Up (2-Step)
                </Button>
              </div>
            </div>
          ) : (
            <section className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Step 03 — Virtual fitting</p>
                  <h1 className="mt-1 text-3xl md:text-4xl font-display">Layer your garment</h1>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                  className="gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to proportions
                </Button>
              </div>

              <ClothingLinkPanel preview={product} onPreview={setProduct} />

              {photo && product ? (
                <TryOnCanvas
                  photoDataUrl={photo}
                  garmentDataUrl={product.imageDataUrl}
                  garmentTitle={product.title}
                  guide={guide}
                />
              ) : null}
            </section>
          )
        ) : null}
      </div>
    </main>
  );
}
