/**
 * Takes the user's original hand image and the white nail mask,
 * and composites custom polish finishes directly onto their actual nails.
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

  // Determine color themes based on user prompt
  const lowerPrompt = prompt.toLowerCase();
  
  const presets = [
    getPreset(lowerPrompt, 0),
    getPreset(lowerPrompt, 1),
    getPreset(lowerPrompt, 2),
  ];

  const results: string[] = [];

  for (const preset of presets) {
    // Base canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // 1. Draw user's original hand photo
    ctx.drawImage(img, 0, 0, width, height);

    // 2. Create offscreen design texture canvas
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = width;
    textureCanvas.height = height;
    const tCtx = textureCanvas.getContext("2d")!;

    // Draw gradient/pattern texture
    preset.drawTexture(tCtx, width, height);

    // Clip texture strictly to the white nail mask area
    tCtx.globalCompositeOperation = "destination-in";
    tCtx.drawImage(mask, 0, 0, width, height);

    // 3. Blend design onto user's hand
    ctx.globalCompositeOperation = preset.blendMode as GlobalCompositeOperation;
    ctx.globalAlpha = preset.opacity;
    ctx.drawImage(textureCanvas, 0, 0, width, height);

    // 4. Add glossy gel sheen highlight over the nails
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.35;
    
    const sheenCanvas = document.createElement("canvas");
    sheenCanvas.width = width;
    sheenCanvas.height = height;
    const sCtx = sheenCanvas.getContext("2d")!;
    
    const sheenGrad = sCtx.createLinearGradient(0, 0, width, height);
    sheenGrad.addColorStop(0, "rgba(255,255,255,0.8)");
    sheenGrad.addColorStop(0.5, "rgba(255,255,255,0.0)");
    sheenGrad.addColorStop(1, "rgba(255,255,255,0.6)");
    sCtx.fillStyle = sheenGrad;
    sCtx.fillRect(0, 0, width, height);

    sCtx.globalCompositeOperation = "destination-in";
    sCtx.drawImage(mask, 0, 0, width, height);

    ctx.drawImage(sheenCanvas, 0, 0, width, height);

    results.push(canvas.toDataURL("image/png"));
  }

  return results;
}

function getPreset(prompt: string, variationIndex: number) {
  if (prompt.includes("chrome") || prompt.includes("silver") || prompt.includes("star")) {
    return {
      blendMode: "hard-light",
      opacity: 0.85,
      drawTexture: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        if (variationIndex === 0) {
          grad.addColorStop(0, "#E0E0E0"); grad.addColorStop(0.5, "#FFFFFF"); grad.addColorStop(1, "#9E9E9E");
        } else if (variationIndex === 1) {
          grad.addColorStop(0, "#D4AF37"); grad.addColorStop(0.5, "#FFF8DC"); grad.addColorStop(1, "#AA7C11");
        } else {
          grad.addColorStop(0, "#C0C0C0"); grad.addColorStop(0.5, "#333333"); grad.addColorStop(1, "#E6E6FA");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    };
  }

  if (prompt.includes("pink") || prompt.includes("bow") || prompt.includes("coquette") || prompt.includes("pearl")) {
    return {
      blendMode: "overlay",
      opacity: 0.9,
      drawTexture: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const grad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, w/2);
        if (variationIndex === 0) {
          grad.addColorStop(0, "#FFD1DC"); grad.addColorStop(1, "#FFB6C1");
        } else if (variationIndex === 1) {
          grad.addColorStop(0, "#FFF0F5"); grad.addColorStop(1, "#E6E6FA");
        } else {
          grad.addColorStop(0, "#FF69B4"); grad.addColorStop(1, "#FFC0CB");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    };
  }

  if (prompt.includes("black") || prompt.includes("dark") || prompt.includes("matte")) {
    return {
      blendMode: "multiply",
      opacity: 0.95,
      drawTexture: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.fillStyle = variationIndex === 0 ? "#111111" : variationIndex === 1 ? "#1A1A2E" : "#2B1B17";
        ctx.fillRect(0, 0, w, h);
      }
    };
  }

  // Default Glazed / Sheer Gloss preset
  return {
    blendMode: "hard-light",
    opacity: 0.8,
    drawTexture: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      if (variationIndex === 0) {
        grad.addColorStop(0, "#FFF8DC"); grad.addColorStop(1, "#FFE4E1");
      } else if (variationIndex === 1) {
        grad.addColorStop(0, "#E0FFFF"); grad.addColorStop(1, "#F08080");
      } else {
        grad.addColorStop(0, "#F5FEFD"); grad.addColorStop(1, "#E6E6FA");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  };
}