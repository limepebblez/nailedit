import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let handLandmarker: HandLandmarker | null = null;

// Initialize MediaPipe HandLandmarker WASM instance
export async function initHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    numHands: 2,
  });

  return handLandmarker;
}

// Key fingertip and DIP joint landmark pairs for each finger
const FINGER_PAIRS = [
  { tip: 4, dip: 3 },   // Thumb
  { tip: 8, dip: 7 },   // Index
  { tip: 12, dip: 11 }, // Middle
  { tip: 16, dip: 15 }, // Ring
  { tip: 20, dip: 19 }, // Pinky
];

/**
 * Takes a source image URL, detects hands, and generates a binary black & white mask Data URL.
 */
export async function generateNailMask(imageSrc: string): Promise<{ maskUrl: string; handDetected: boolean }> {
  const landmarker = await initHandLandmarker();

  // Create an HTMLImageElement to pass to MediaPipe
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageSrc;
  });

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Run hand detection
  const detectionResult = landmarker.detect(img);

  // Prepare offscreen canvas for rendering the binary mask
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not create canvas context");

  // Fill background with black (#000000)
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  if (!detectionResult.landmarks || detectionResult.landmarks.length === 0) {
    // If no hand detected, return full black mask
    return { maskUrl: canvas.toDataURL("image/png"), handDetected: false };
  }

  // Set fill color to white (#FFFFFF) for nail regions
  ctx.fillStyle = "#FFFFFF";

  for (const hand of detectionResult.landmarks) {
    for (const { tip, dip } of FINGER_PAIRS) {
      const tipPoint = hand[tip];
      const dipPoint = hand[dip];

      // Convert normalized (0-1) coordinates to canvas pixel space
      const tipX = tipPoint.x * width;
      const tipY = tipPoint.y * height;
      const dipX = dipPoint.x * width;
      const dipY = dipPoint.y * height;

      // Calculate distance (finger width scale) and angle
      const dx = tipX - dipX;
      const dy = tipY - dipY;
      const fingerLength = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Estimate nail size relative to fingertip segment
      const nailRadiusX = fingerLength * 0.45;
      const nailRadiusY = fingerLength * 0.35;

      // Position nail slightly offset toward the tip
      const nailCenterX = tipX + (dx * 0.1);
      const nailCenterY = tipY + (dy * 0.1);

      // Draw oval mask for the fingernail
      ctx.beginPath();
      ctx.ellipse(nailCenterX, nailCenterY, nailRadiusX, nailRadiusY, angle + Math.PI / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  return {
    maskUrl: canvas.toDataURL("image/png"),
    handDetected: true,
  };
}