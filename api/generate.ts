export const config = {
  runtime: 'edge',
};

// Curated aesthetic high-res nail design sets mapped to vibe keywords
const AESTHETIC_SETS: Record<string, string[]> = {
  chrome: [
    "https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=800&auto=format&fit=crop",
  ],
  coquette: [
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=800&auto=format&fit=crop",
  ],
  black: [
    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
  ],
  glazed: [
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=800&auto=format&fit=crop",
  ],
  default: [
    "https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=800&auto=format&fit=crop",
  ],
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { prompt } = await req.json();
    const lowerPrompt = (prompt || '').toLowerCase();

    let selectedSet = AESTHETIC_SETS.default;

    if (lowerPrompt.includes('chrome') || lowerPrompt.includes('silver') || lowerPrompt.includes('star')) {
      selectedSet = AESTHETIC_SETS.chrome;
    } else if (lowerPrompt.includes('pink') || lowerPrompt.includes('bow') || lowerPrompt.includes('pearl') || lowerPrompt.includes('coquette')) {
      selectedSet = AESTHETIC_SETS.coquette;
    } else if (lowerPrompt.includes('black') || lowerPrompt.includes('matte') || lowerPrompt.includes('dark')) {
      selectedSet = AESTHETIC_SETS.black;
    } else if (lowerPrompt.includes('glazed') || lowerPrompt.includes('gloss') || lowerPrompt.includes('donut')) {
      selectedSet = AESTHETIC_SETS.glazed;
    }

    return new Response(JSON.stringify({ images: selectedSet }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Generation failed' }), { status: 500 });
  }
}