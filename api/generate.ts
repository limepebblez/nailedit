export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { image, mask, prompt } = await req.json();

    if (!image || !mask || !prompt) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return new Response(JSON.stringify({ error: 'FAL_KEY is not configured on server' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call Fal.ai Fast SDXL Inpainting API endpoint
    const response = await fetch('https://fal.run/fal-ai/fast-sdxl/inpainting', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `high quality detailed manicured nails, ${prompt}, realistic hand photography, 8k aesthetic`,
        negative_prompt: "blurry, distorted fingers, extra nails, ugly, deformed, text, watermark",
        image_url: image,
        mask_url: mask,
        num_images: 3,
        strength: 0.85,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Fal.ai API Error:", errText);
      return new Response(JSON.stringify({ error: 'Failed to generate image from AI provider' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const imageUrls = data.images.map((img: { url: string }) => img.url);

    return new Response(JSON.stringify({ images: imageUrls }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Serverless route error:", error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}