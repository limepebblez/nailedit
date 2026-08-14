import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let handLandmarker: HandLandmarker | null = null;

// Initialize MediaPipe HandLandmarker with robust CPU/GPU fallback
export async function initHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  try {
    // Try CPU delegate first for 100% cross-browser reliability
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      numHands: 2,
      minHandDetectionConfidence: 0.2, // Lower threshold for close-up/stylized photos
      minHandPresenceConfidence: 0.2,
    });
  } catch (err) {
    console.warn("MediaPipe CPU initialization failed, attempting fallback:", err);
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      },
      runningMode: "IMAGE",
      numHands: 2,
    });
  }

  return handLandmarker;
}

const FINGER_PAIRS = [
  { tip: 4, dip: 3 },   // Thumb
  { tip: 8, dip: 7 },   // Index
  { tip: 12, dip: 11 }, // Middle
  { tip: 16, dip: 15 }, // Ring
  { tip: 20, dip: 19 }, // Pinky
];

/**
 * Loads image safely handling CORS and asynchronous decoding.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        if ('decode' in img) await img.decode();
      } catch (e) {
        console.warn("Decode warning:", e);
      }
      resolve(img);
    };
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Takes a source image URL, detects hands, and generates a binary black & white mask Data URL.
 */
export async function generateNailMask(imageSrc: string): Promise<{ maskUrl: string; handDetected: boolean }> {
  try {
    const landmarker = await initHandLandmarker();
    const img = await loadImage(imageSrc);

    const width = img.naturalWidth || img.width || 800;
    const height = img.naturalHeight || img.height || 800;

    // Run hand detection
    const detectionResult = landmarker.detect(img);

    // Prepare offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Could not create canvas context");

    // Fill background with black (#000000)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const hasLandmarks = detectionResult.landmarks && detectionResult.landmarks.length > 0;

    if (hasLandmarks) {
      // Set fill color to white (#FFFFFF) for detected nail regions
      ctx.fillStyle = "#FFFFFF";

      for (const hand of detectionResult.landmarks) {
        for (const { tip, dip } of FINGER_PAIRS) {
          const tipPoint = hand[tip];
          const dipPoint = hand[dip];

          const tipX = tipPoint.x * width;
          const tipY = tipPoint.y * height;
          const dipX = dipPoint.x * width;
          const dipY = dipPoint.y * height;

          const dx = tipX - dipX;
          const dy = tipY - dipY;
          const fingerLength = Math.hypot(dx, dy) || 40;
          const angle = Math.atan2(dy, dx);

          // Size relative to finger segment
          const nailRadiusX = Math.max(fingerLength * 0.4, 12);
          const nailRadiusY = Math.max(fingerLength * 0.28, 8);

          const nailCenterX = tipX + (dx * 0.05);
          const nailCenterY = tipY + (dy * 0.05);

          ctx.beginPath();
          ctx.ellipse(nailCenterX, nailCenterY, nailRadiusX, nailRadiusY, angle + Math.PI / 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      return { maskUrl: canvas.toDataURL("image/png"), handDetected: true };
    }

    // Fallback Mask Generation if no specific hand landmarks found
    // Draws clean default nail mask ovals near top center so mask is never pitch black
    ctx.fillStyle = "#FFFFFF";
    const centerX = width / 2;
    const startY = height * 0.35;
    const fingerSpacing = width * 0.08;

    [-1.8, -0.9, 0, 0.9, 1.8].forEach((offset, idx) => {
      const rx = width * 0.028;
      const ry = height * 0.045;
      const x = centerX + offset * fingerSpacing;
      const y = startY + Math.abs(offset) * 8 - (idx === 2 ? 10 : 0);
      
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
      ctx.fill();
    });

    return { maskUrl: canvas.toDataURL("image/png"), handDetected: false };
  } catch (err) {
    console.error("Mask generation failed:", err);
    // Create basic emergency canvas mask
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 500, 500);
    return { maskUrl: canvas.toDataURL("image/png"), handDetected: false };
  }
}