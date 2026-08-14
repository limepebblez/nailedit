/**
 * Converts a Black & White mask into a true Alpha Transparency mask.
 * Black pixels (#000000) -> Alpha 0 (Transparent)
 * White pixels (#FFFFFF) -> Alpha 255 (Opaque)
 */
function createAlphaMask(maskImg: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(maskImg, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Red channel value (0 = black, 255 = white)
    const brightness = data[i]; 
    // Set Alpha channel equal to brightness
    data[i + 3] = brightness; 
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Superimposes custom nail art textures directly onto the user's fingernails.
 */
export async function generateSuperimposedNails(
  userImgUrl: string,
  maskImgUrl: string,
  prompt: string
): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve) => {
    img.onload = resolve;
    img.src = userImgUrl;
  });

  const mask = new Image();
  mask.crossOrigin = "anonymous";
  await new Promise((resolve) => {
    mask.onload = resolve;
    mask.src = maskImgUrl;
  });

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Convert the B&W mask to a transparent cutout canvas
  const alphaMaskCanvas = createAlphaMask(mask, width, height);

  const lowerPrompt = prompt.toLowerCase();
  const presets = [
    getPreset(lowerPrompt, 0),
    getPreset(lowerPrompt, 1),
    getPreset(lowerPrompt, 2),
  ];

  const results: string[] = [];

  for (const preset of presets) {
    // Main composite canvas
    const mainCanvas = document.createElement("canvas");
    mainCanvas.width = width;
    mainCanvas.height = height;
    const ctx = mainCanvas.getContext("2d")!;

    // 1. Draw original hand photo as base layer
    ctx.drawImage(img, 0, 0, width, height);

    // 2. Build isolated nail polish texture
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = width;
    textureCanvas.height = height;
    const tCtx = textureCanvas.getContext("2d")!;

    // Draw pattern / gradient
    preset.drawTexture(tCtx, width, height);

    // Clip texture strictly to the white nail shapes using alpha mask
    tCtx.globalCompositeOperation = "destination-in";
    tCtx.drawImage(alphaMaskCanvas, 0, 0, width, height);

    // 3. Composite design directly onto user's fingernails
    ctx.globalCompositeOperation = "source-over"; // Cover existing nail polish
    ctx.globalAlpha = 0.92;
    ctx.drawImage(textureCanvas, 0, 0, width, height);

    // 4. Add realistic 3D gel gloss sheen highlight over nails
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.4;

    const sheenCanvas = document.createElement("canvas");
    sheenCanvas.width = width;
    sheenCanvas.height = height;
    const sCtx = sheenCanvas.getContext("2d")!;

    const sheenGrad = sCtx.createLinearGradient(0, 0, width, height);
    sheenGrad.addColorStop(0, "rgba(255,255,255,0.9)");
    sheenGrad.addColorStop(0.4, "rgba(255,255,255,0.0)");
    sheenGrad.addColorStop(1, "rgba(255,255,255,0.7)");
    sCtx.fillStyle = sheenGrad;
    sCtx.fillRect(0, 0, width, height);

    sCtx.globalCompositeOperation = "destination-in";
    sCtx.drawImage(alphaMaskCanvas, 0, 0, width, height);

    ctx.drawImage(sheenCanvas, 0, 0, width, height);

    results.push(mainCanvas.toDataURL("image/png"));
  }

  return results;
}

function getPreset(prompt: string, variationIndex: number) {
  if (prompt.includes("chrome") || prompt.includes("silver") || prompt.includes("star")) {
    return {
      drawTexture: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        if (variationIndex === 0) {
          grad.addColorStop(0, "#E0E0E0"); grad.addColorStop(0.5, "#FFFFFF"); grad.addColorStop(1, "#8E8E8E");
        } else if (variationIndex === 1) {
          grad.addColorStop(0, "#FFD700"); grad.addColorStop(0.5, "#FFF8DC"); grad.addColorStop(1, "#B8860B");
        } else {
          grad.addColorStop(0, "#C0C0C0"); grad.addColorStop(0.5, "#4B0082"); grad.addColorStop(1, "#E6E6FA");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    };
  }

  if (prompt.includes("pink") || prompt.includes("bow") || prompt.includes("coquette") || prompt.includes("pearl")) {
    return {
      drawTexture: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        if (variationIndex === 0) {
          grad.addColorStop(0, "#FFD1DC"); grad.addColorStop(1, "#FFB6C1");
        } else if (variationIndex === 1) {
          grad.addColorStop(0, "#FFF0F5"); grad.addColorStop(1, "#E6E6FA");
        } else {
          grad.addColorStop(0, "#FF1493"); grad.addColorStop(1, "#FFC0CB");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    };
  }

  if (prompt.includes("black") || prompt.includes("dark") || prompt.includes("matte")) {
    return {
      drawTexture: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.fillStyle = variationIndex === 0 ? "#111111" : variationIndex === 1 ? "#1A1A2E" : "#2B1B17";
        ctx.fillRect(0, 0, w, h);
      }
    };
  }

  // Aura Gradient / Glazed Sunset default preset
  return {
    drawTexture: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const grad = ctx.createRadialGradient(w/2, h/2, 20, w/2, h/2, w/2);
      if (variationIndex === 0) {
        grad.addColorStop(0, "#FF7E5F"); grad.addColorStop(1, "#FEB47B"); // Sunset Orange
      } else if (variationIndex === 1) {
        grad.addColorStop(0, "#8A2BE2"); grad.addColorStop(1, "#FF69B4"); // Aura Purple
      } else {
        grad.addColorStop(0, "#00F2FE"); grad.addColorStop(1, "#4FACFE"); // Cyan Sheen
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  };
}