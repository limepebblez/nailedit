import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let handLandmarker: HandLandmarker | null = null;

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
    minHandDetectionConfidence: 0.15,
    minHandPresenceConfidence: 0.15,
  });

  return handLandmarker;
}

const FINGER_PAIRS = [
  { tip: 4, dip: 3 },   // Thumb
  { tip: 8, dip: 7 },   // Index
  { tip: 12, dip: 11 }, // Middle
  { tip: 16, dip: 15 }, // Ring
  { tip: 20, dip: 19 }, // Pinky
];

export async function generateNailMask(imageSrc: string): Promise<{ maskUrl: string; handDetected: boolean }> {
  try {
    const landmarker = await initHandLandmarker();

    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageSrc;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext("2d")!;
    sourceCtx.drawImage(img, 0, 0);

    const detectionResult = landmarker.detect(sourceCanvas);

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = width;
    maskCanvas.height = height;
    const ctx = maskCanvas.getContext("2d")!;

    // Black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const hasLandmarks = detectionResult.landmarks && detectionResult.landmarks.length > 0;

    if (hasLandmarks) {
      ctx.fillStyle = "#FFFFFF";

      for (const hand of detectionResult.landmarks) {
        for (const { tip, dip } of FINGER_PAIRS) {
          const tipP = hand[tip];
          const dipP = hand[dip];

          const tipX = tipP.x * width;
          const tipY = tipP.y * height;
          const dipX = dipP.x * width;
          const dipY = dipP.y * height;

          const dx = tipX - dipX;
          const dy = tipY - dipY;
          const len = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);

          // TIGHT ANATOMICAL SIZING (stems within nail bed borders)
          const rx = Math.max(len * 0.22, 6);
          const ry = Math.max(len * 0.14, 4);

          const nailCenterX = tipX + (dx * 0.08);
          const nailCenterY = tipY + (dy * 0.08);

          ctx.beginPath();
          ctx.ellipse(nailCenterX, nailCenterY, rx, ry, angle + Math.PI / 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      return { maskUrl: maskCanvas.toDataURL("image/png"), handDetected: true };
    }

    return { maskUrl: maskCanvas.toDataURL("image/png"), handDetected: false };
  } catch (err) {
    console.error("Mask error:", err);
    const emptyCanvas = document.createElement("canvas");
    emptyCanvas.width = 600;
    emptyCanvas.height = 800;
    const ctx = emptyCanvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 600, 800);
    return { maskUrl: emptyCanvas.toDataURL("image/png"), handDetected: false };
  }
}