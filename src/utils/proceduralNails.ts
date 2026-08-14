/**
 * Converts a Black & White mask into a true Alpha Transparency mask.
 * Black pixels (#000000) -> Alpha 0 (Transparent)
 * White pixels (#FFFFFF) -> Alpha 255 (Solid Opaque)
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
    // High contrast threshold to ensure solid opaque white center
    data[i + 3] = brightness > 30 ? 255 : 0; 
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Superimposes custom nail art textures directly onto the user's fingernails
 * with a 100% opaque base coat to block original nail polish.
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

  // Convert B&W mask to sharp transparent cutout
  const alphaMaskCanvas = createAlphaMask(mask, width, height);

  const lowerPrompt = prompt.toLowerCase();
  const presets = [
    getPreset(lowerPrompt, 0),
    getPreset(lowerPrompt, 1),
    getPreset(lowerPrompt, 2),
  ];

  const results: string[] = [];

  for (const preset of presets) {
    const mainCanvas = document.createElement("canvas");
    mainCanvas.width = width;
    mainCanvas.height = height;
    const ctx = mainCanvas.getContext("2d")!;

    // 1. Draw base photo
    ctx.drawImage(img, 0, 0, width, height);

    // 2. OPAQUE PRIMER BASE COAT (Erases original dark nail color 100%)
    const primerCanvas = document.createElement("canvas");
    primerCanvas.width = width;
    primerCanvas.height = height;
    const pCtx = primerCanvas.getContext("2d")!;
    pCtx.fillStyle = "#FFFFFF";
    pCtx.fillRect(0, 0, width, height);
    pCtx.globalCompositeOperation = "destination-in";
    pCtx.drawImage(alphaMaskCanvas, 0, 0, width, height);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;
    ctx.drawImage(primerCanvas, 0, 0, width, height);

    // 3. COLOR / DESIGN LAYER (100% Opaque)
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = width;
    textureCanvas.height = height;
    const tCtx = textureCanvas.getContext("2d")!;

    preset.drawTexture(tCtx, width, height);

    tCtx.globalCompositeOperation = "destination-in";
    tCtx.drawImage(alphaMaskCanvas, 0, 0, width, height);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0; // Fully opaque, zero bleed-through!
    ctx.drawImage(textureCanvas, 0, 0, width, height);

    // 4. REALISTIC 3D GEL GLOSS SPECULAR HIGHLIGHT
    const glossCanvas = document.createElement("canvas");
    glossCanvas.width = width;
    glossCanvas.height = height;
    const gCtx = glossCanvas.getContext("2d")!;

    // Curated 3D light reflection gradient
    const glossGrad = gCtx.createLinearGradient(0, 0, width * 0.7, height);
    glossGrad.addColorStop(0, "rgba(255, 255, 255, 0.65)");
    glossGrad.addColorStop(0.25, "rgba(255, 255, 255, 0.0)");
    glossGrad.addColorStop(0.7, "rgba(0, 0, 0, 0.25)"); // Subtle edge shadow for 3D depth
    glossGrad.addColorStop(1, "rgba(255, 255, 255, 0.4)");

    gCtx.fillStyle = glossGrad;
    gCtx.fillRect(0, 0, width, height);

    gCtx.globalCompositeOperation = "destination-in";
    gCtx.drawImage(alphaMaskCanvas, 0, 0, width, height);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.85;
    ctx.drawImage(glossCanvas, 0, 0, width, height);

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
          grad.addColorStop(0, "#D0D0D0"); grad.addColorStop(0.5, "#FFFFFF"); grad.addColorStop(1, "#707070");
        } else if (variationIndex === 1) {
          grad.addColorStop(0, "#FFD700"); grad.addColorStop(0.5, "#FFF8DC"); grad.addColorStop(1, "#996515");
        } else {
          grad.addColorStop(0, "#E6E6FA"); grad.addColorStop(0.5, "#4B0082"); grad.addColorStop(1, "#2E0854");
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
          grad.addColorStop(0, "#FFC0CB"); grad.addColorStop(1, "#FF69B4");
        } else if (variationIndex === 1) {
          grad.addColorStop(0, "#FFF0F5"); grad.addColorStop(1, "#D8BFD8");
        } else {
          grad.addColorStop(0, "#FF1493"); grad.addColorStop(1, "#FFB6C1");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    };
  }

  if (prompt.includes("black") || prompt.includes("dark") || prompt.includes("matte")) {
    return {
      drawTexture: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.fillStyle = variationIndex === 0 ? "#121212" : variationIndex === 1 ? "#1A1A2E" : "#2C1D11";
        ctx.fillRect(0, 0, w, h);
      }
    };
  }

  // Aura Gradient / Sunset default
  return {
    drawTexture: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const grad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, w/2);
      if (variationIndex === 0) {
        grad.addColorStop(0, "#FF5E36"); grad.addColorStop(0.6, "#FFAE33"); grad.addColorStop(1, "#FF3366");
      } else if (variationIndex === 1) {
        grad.addColorStop(0, "#A100FF"); grad.addColorStop(0.6, "#7100E2"); grad.addColorStop(1, "#FF007A");
      } else {
        grad.addColorStop(0, "#00E5FF"); grad.addColorStop(0.6, "#0088FF"); grad.addColorStop(1, "#7000FF");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  };
}