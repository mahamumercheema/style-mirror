import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

import { ClothingLinkPanel } from "@/components/ClothingLinkPanel";
import { MeasurementsCard } from "@/components/MeasurementsCard";
import { PhotoUploader } from "@/components/PhotoUploader";
import { TryOnCanvas } from "@/components/TryOnCanvas";
import { Button } from "@/components/ui/button";
import { estimateBody, type Measurements, type PoseGuide } from "@/lib/pose";
import type { ProductPreview } from "@/lib/product.functions";

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

function Studio() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "measuring" | "done" | "failed">("idle");
  const [poseError, setPoseError] = useState<string | null>(null);
  const [original, setOriginal] = useState<Measurements | null>(null);
  const [measurements, setMeasurements] = useState<Measurements | null>(null);
  const [guide, setGuide] = useState<PoseGuide | null>(null);
  const [product, setProduct] = useState<ProductPreview | null>(null);

  const measure = useCallback(async (dataUrl: string) => {
    setStatus("measuring");
    setPoseError(null);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Couldn't load that photo."));
        element.src = dataUrl;
      });
      const result = await estimateBody(image);
      setMeasurements(result.measurements);
      setOriginal(result.measurements);
      setGuide(result.guide);
      setStatus("done");
    } catch (cause) {
      setPoseError(cause instanceof Error ? cause.message : "Body detection failed on this photo.");
      setStatus("failed");
    }
  }, []);

  useEffect(() => {
    if (photo) void measure(photo);
  }, [photo, measure]);

  const reset = () => {
    setPhoto(null);
    setStatus("idle");
    setMeasurements(null);
    setOriginal(null);
    setGuide(null);
    setPoseError(null);
    setProduct(null);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:py-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" />
          Virtual Try Room
        </Link>
        {photo ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RefreshCw className="size-3.5" />
            Start over
          </Button>
        ) : null}
      </header>

      <div className="mt-10 space-y-8">
        {!photo ? (
          <>
            <div>
              <p className="eyebrow">Step 01 — Your photo</p>
              <h1 className="mt-2 text-4xl md:text-5xl">The fitting room</h1>
            </div>
            <PhotoUploader onPhoto={setPhoto} />
          </>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-[18rem_1fr] md:items-start">
              <div className="surface overflow-hidden">
                <img src={photo} alt="Your uploaded photo" className="w-full object-cover" />
              </div>

              <div className="space-y-6">
                {status === "measuring" ? (
                  <section className="surface flex items-center gap-4 p-6">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    <div>
                      <p className="font-medium">Reading your proportions…</p>
                      <p className="text-sm text-muted-foreground">
                        Loading the pose model in your browser. First run takes a few seconds.
                      </p>
                    </div>
                  </section>
                ) : null}

                {status === "failed" ? (
                  <section className="surface p-6">
                    <p className="eyebrow">Step 02 — Body read</p>
                    <h2 className="mt-1 text-2xl">We couldn't read this photo</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{poseError}</p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" onClick={() => photo && void measure(photo)}>
                        <RefreshCw className="size-4" />
                        Try again
                      </Button>
                      <Button variant="ghost" onClick={reset}>
                        Use another photo
                      </Button>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      You can still continue below and place the garment by hand.
                    </p>
                  </section>
                ) : null}

                {measurements && original ? (
                  <MeasurementsCard
                    measurements={measurements}
                    original={original}
                    onChange={setMeasurements}
                  />
                ) : null}

                {status !== "measuring" ? (
                  <ClothingLinkPanel preview={product} onPreview={setProduct} />
                ) : null}
              </div>
            </div>

            {product ? (
              <TryOnCanvas
                photoDataUrl={photo}
                garmentDataUrl={product.imageDataUrl}
                garmentTitle={product.title}
                guide={guide}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
