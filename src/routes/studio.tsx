import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { ClothingLinkPanel } from "@/components/ClothingLinkPanel";
import { MeasurementsCard } from "@/components/MeasurementsCard";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PoseOverlay } from "@/components/PoseOverlay";
import { TryOnCanvas } from "@/components/TryOnCanvas";
import { Button } from "@/components/ui/button";
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
            onClick={() => status === "done" && setCurrentStep(3)}
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

        {photo ? (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-xs">
            <RefreshCw className="size-3.5" />
            Start over
          </Button>
        ) : (
          <div className="w-16" />
        )}
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
                <Button variant="outline" size="sm" onClick={tryAnotherPhoto} className="gap-1.5">
                  <RefreshCw className="size-3.5" />
                  Change photo
                </Button>
                {status === "done" ? (
                  <Button size="sm" onClick={() => setCurrentStep(3)} className="gap-1.5">
                    <span>Try on clothes</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>

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

            {/* Successful Detection State: Pose Overlay & Measurements */}
            {status === "done" && photo && measurements && original ? (
              <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
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
                    <Button onClick={() => setCurrentStep(3)} size="lg" className="gap-2 shrink-0">
                      <span>Next: Choose garment</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* ================= STEP 03: CLOTHING LINK & TRY-ON CANVAS ================= */}
        {currentStep === 3 ? (
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
                className="gap-1.5"
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
        ) : null}
      </div>
    </main>
  );
}
