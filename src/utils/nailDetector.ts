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

/**
 * Scans radial pixel gradients around a fingertip anchor point
 * to detect the exact anatomical contour boundary between nail and skin.
 */
function traceNailContour(
  imgData: ImageData,
  centerX: number,
  centerY: number,
  baseRadiusX: number,
  baseRadiusY: number,
  angle: number,
  imgWidth: number,
  imgHeight: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const RAY_COUNT = 16;
  const pixels = imgData.data;

  // Function to safely fetch RGB at integer pixel coordinates
  const getPixelColor = (px: number, py: number) => {
    const x = Math.min(Math.max(Math.round(px), 0), imgWidth - 1);
    const y = Math.min(Math.max(Math.round(py), 0), imgHeight - 1);
    const idx = (y * imgWidth + x) * 4;
    return [pixels[idx], pixels[idx + 1], pixels[idx + 2]];
  };

  const centerColor = getPixelColor(centerX, centerY);

  for (let i = 0; i < RAY_COUNT; i++) {
    const rayAngle = (i / RAY_COUNT) * 2 * Math.PI;
    const cosA = Math.cos(rayAngle);
    const sinA = Math.sin(rayAngle);

    // Calculate baseline expected radius along rotated ellipse axis
    const cosRot = Math.cos(angle);
    const sinRot = Math.sin(angle);
    const localX = cosA * cosRot - sinA * sinRot;
    const localY = cosA * sinRot + sinA * cosRot;
    const expectedRadius = Math.hypot(localX * baseRadiusX, localY * baseRadiusY);

    const minSearchR = expectedRadius * 0.45;
    const maxSearchR = expectedRadius * 1.35;

    let maxGradient = 0;
    let bestRadius = expectedRadius;

    // Walk ray outward to find maximum color difference (skin transition)
    for (let r = minSearchR; r <= maxSearchR; r += 1.5) {
      const px = centerX + localX * r;
      const py = centerY + localY * r;

      const currColor = getPixelColor(px, py);
      const prevColor = getPixelColor(centerX + localX * (r - 2), centerY + localY * (r - 2));

      // Color difference delta
      const deltaE = Math.hypot(
        currColor[0] - prevColor[0],
        currColor[1] - prevColor[1],
        currColor[2] - prevColor[2]
      );

      // Contrast against center nail anchor color
      const centerDelta = Math.hypot(
        currColor[0] - centerColor[0],
        currColor[1] - centerColor[1],
        currColor[2] - centerColor[2]
      );

      const combinedScore = deltaE * 0.6 + centerDelta * 0.4;

      if (combinedScore > maxGradient) {
        maxGradient = combinedScore;
        bestRadius = r;
      }
    }

    points.push({
      x: centerX + localX * bestRadius,
      y: centerY + localY * bestRadius,
    });
  }

  return points;
}

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

    // Draw source image to offscreen canvas to sample pixel data
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext("2d")!;
    sourceCtx.drawImage(img, 0, 0);
    const imgData = sourceCtx.getImageData(0, 0, width, height);

    const detectionResult = landmarker.detect(sourceCanvas);

    // Prepare black binary mask canvas
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = width;
    maskCanvas.height = height;
    const ctx = maskCanvas.getContext("2d")!;

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

          const baseRx = Math.max(len * 0.38, 10);
          const baseRy = Math.max(len * 0.26, 8);

          const nailCenterX = tipX + dx * 0.08;
          const nailCenterY = tipY + dy * 0.08;

          // Run localized edge tracing to find exact nail contour boundary points
          const contourPoints = traceNailContour(
            imgData,
            nailCenterX,
            nailCenterY,
            baseRx,
            baseRy,
            angle + Math.PI / 2,
            width,
            height
          );

          // Render smooth organic contour polygon mask
          if (contourPoints.length > 0) {
            ctx.beginPath();
            ctx.moveTo(contourPoints[0].x, contourPoints[0].y);

            for (let i = 0; i < contourPoints.length; i++) {
              const pCurrent = contourPoints[i];
              const pNext = contourPoints[(i + 1) % contourPoints.length];
              const midX = (pCurrent.x + pNext.x) / 2;
              const midY = (pCurrent.y + pNext.y) / 2;
              ctx.quadraticCurveTo(pCurrent.x, pCurrent.y, midX, midY);
            }

            ctx.closePath();
            ctx.fill();
          }
        }
      }

      return { maskUrl: maskCanvas.toDataURL("image/png"), handDetected: true };
    }

    return { maskUrl: maskCanvas.toDataURL("image/png"), handDetected: false };
  } catch (err) {
    console.error("Mask generation failed:", err);
    const emptyCanvas = document.createElement("canvas");
    emptyCanvas.width = 600;
    emptyCanvas.height = 800;
    const ctx = emptyCanvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 600, 800);
    return { maskUrl: emptyCanvas.toDataURL("image/png"), handDetected: false };
  }
}