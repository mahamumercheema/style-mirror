# Style Mirror

Build a web app called "Virtual Try Room" — a simple virtual clothing try-on tool.

CORE USER FLOW:

1. User uploads a full-body photo of themselves (drag-and-drop or file picker)

2. Estimate rough body proportions from the photo using a free, client-side library (e.g. MediaPipe Pose or TensorFlow.js body-pix / pose-detection, both free and run in-browser) — show estimated measurements (height ratio, shoulder width, body type) in a summary card, clearly labeled as approximate

3. User pastes a URL of a clothing item

4. Fetch the product's image and title using free metadata extraction (Open Graph tags via a simple fetch/parse function — no paid scraping API)

5. Instead of AI-generating a realistic composite (which needs paid models), overlay the clothing image on top of the user's photo using canvas-based positioning — let the user drag, resize, and adjust opacity/placement of the clothing image over their photo to "try it on" manually, aligned to their estimated shoulder/torso landmarks as a starting guide

6. Show the final result with a download button

KEY SCREENS:

- Landing page with a "Try it now" CTA

- Upload screen (photo + guidelines: front-facing, plain background)

- Measurements card (auto-estimated, editable by the user if it looks off)

- Clothing link input + fetched preview

- Try-on canvas screen: user's photo as background, clothing image as a draggable/resizable/rotatable layer on top

- Download/share result

TECHNICAL NOTES — KEEP THIS FREE-TIER FRIENDLY:

- No paid AI image generation APIs. Use MediaPipe/TensorFlow.js (free, client-side) for pose detection only

- Use HTML5 Canvas or Fabric.js (free, open-source) for the drag/resize/overlay try-on step instead of AI compositing

- Fetch clothing metadata via a simple serverless function using fetch + HTML parsing for og:image/og:title — no third-party scraping service

- Store photos in browser session/local state only — no persistent storage or database needed for MVP

- Fully client-side where possible to minimize backend/API usage

DESIGN:

- Clean, minimal, fashion-app aesthetic — neutral palette, large imagery, whitespace

- Simple loading states for pose detection and image fetch

Build the upload + measurement estimation flow first. Once that works, add the clothing link fetch and canvas try-on overlay as the next step.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/71347c98-fdb7-4ece-a9c7-a0df832136ed).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
