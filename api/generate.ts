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
      return new Response(JSON.stringify({ error: 'Missing image, mask, or prompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure FAL_KEY is loaded and cleaned up
    const rawFalKey = process.env.FAL_KEY;
    const falKey = rawFalKey ? rawFalKey.trim().replace(/^["']|["']$/g, '') : null;

    if (!falKey) {
      return new Response(JSON.stringify({ error: 'FAL_KEY is missing in Vercel environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call Fal.ai Fast SDXL Inpainting Endpoint
    const response = await fetch('https://fal.run/fal-ai/fast-sdxl/inpainting', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `manicured fingernails with ${prompt}, highly detailed, realistic nail polish, photorealistic, 8k photo`,
        negative_prompt: "blurry, distorted fingers, extra fingers, deformed hands, bad quality, text",
        image_url: image,
        mask_url: mask,
        num_images: 3,
        strength: 0.8,
      }),
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const detailedError = responseData?.detail || responseData?.message || response.statusText || 'Fal API call failed';
      console.error("Fal.ai detail error:", detailedError);
      return new Response(JSON.stringify({ error: `Fal.ai Error (${response.status}): ${JSON.stringify(detailedError)}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const imageUrls = responseData?.images?.map((img: { url: string }) => img.url) || [];

    return new Response(JSON.stringify({ images: imageUrls }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Serverless route error:", error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}