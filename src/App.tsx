import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Sparkles, Image as ImageIcon, Download, RefreshCw, Wand2, Eye, Paintbrush, Eraser } from 'lucide-react';
import { generateNailMask } from './utils/nailDetector';

const SAMPLE_PHOTO = "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=1000&auto=format&fit=crop";

const PRESET_PROMPTS = [
  "Y2K Silver Chrome with Star Gems",
  "Coquette Light Pink Bows & Pearls",
  "Minimalist Matte Black Lines",
  "Glazed Donut Sheer Gloss",
  "Aura Gradient Sunset Purple & Orange",
];

export default function App() {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [maskImage, setMaskImage] = useState<string | null>(null);
  const [isDetectingMask, setIsDetectingMask] = useState<boolean>(false);
  const [showMaskOverlay, setShowMaskOverlay] = useState<boolean>(false);
  const [isPaintMode, setIsPaintMode] = useState<boolean>(false);
  const [brushMode, setBrushMode] = useState<'paint' | 'erase'>('paint');

  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [designs, setDesigns] = useState<string[] | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Load image and compute initial AI mask
  useEffect(() => {
    if (!userImage) {
      setMaskImage(null);
      setIsPaintMode(false);
      return;
    }

    let isMounted = true;
    setIsDetectingMask(true);

    generateNailMask(userImage)
      .then(({ maskUrl }) => {
        if (isMounted) {
          setMaskImage(maskUrl);
          setIsDetectingMask(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsDetectingMask(false);
      });

    return () => { isMounted = false; };
  }, [userImage]);

  // Sync canvas with mask when entering paint mode
  useEffect(() => {
    if (isPaintMode && maskImage && canvasRef.current && userImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        const maskImg = new Image();
        maskImg.onload = () => {
          ctx.drawImage(maskImg, 0, 0);
        };
        maskImg.src = maskImage;
      };
      img.src = userImage;
    }
  }, [isPaintMode, maskImage, userImage]);

  // Manual Canvas Drawing Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const handleMouseUp = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      setMaskImage(canvasRef.current.toDataURL('image/png'));
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.fillStyle = brushMode === 'paint' ? '#FFFFFF' : '#000000';
    ctx.beginPath();
    ctx.arc(x, y, 18 * scaleX, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUserImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

const handleGenerate = async () => {
    if (!userImage || !prompt.trim() || !maskImage) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: userImage,
          mask: maskImage,
          prompt: prompt,
        }),
      });

      const data = await res.json();

      if (res.ok && data.images) {
        setDesigns(data.images);
      } else {
        alert(`Generation failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Client API Error:", err);
      alert("Failed to connect to generation service.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-neutral-800 antialiased">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-neutral-100 text-neutral-950 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight">nailedit</span>
          </div>
          <span className="text-xs uppercase tracking-wider text-neutral-500 font-mono">
            Interactive AI Masking Active
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-neutral-50">
            Nail Design, Superimposed.
          </h1>
          <p className="text-neutral-400 text-base">
            Upload your hand photo, view or brush-refine the AI nail mask, and generate custom nail art.
          </p>
        </div>

        {/* Input Box */}
        <section className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Left: Upload & Interactive Brush Canvas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                  1. Upload Hand Photo
                </label>
                {userImage && (
                  <button
                    onClick={() => setIsPaintMode(!isPaintMode)}
                    className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 font-mono underline"
                  >
                    <Paintbrush className="w-3.5 h-3.5 text-amber-400" />
                    {isPaintMode ? "Done Editing" : "Touch-up Mask"}
                  </button>
                )}
              </div>

              <div className="relative group min-h-[280px] border-2 border-dashed border-neutral-800 hover:border-neutral-600 rounded-xl flex flex-col items-center justify-center p-4 transition-all duration-200 bg-neutral-950/40 overflow-hidden">
                {userImage ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    
                    {/* Interactive Brush Canvas Mode */}
                    {isPaintMode ? (
                      <div className="relative flex flex-col items-center gap-2">
                        <div className="relative border border-amber-500/50 rounded-lg overflow-hidden cursor-crosshair">
                          <img 
                            src={userImage} 
                            alt="Background hand" 
                            className="max-h-60 rounded-lg opacity-40 object-contain"
                          />
                          <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseUp={handleMouseUp}
                            onMouseMove={draw}
                            className="absolute inset-0 w-full h-full object-contain opacity-75"
                          />
                        </div>
                        
                        {/* Brush Controls */}
                        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs">
                          <button
                            onClick={() => setBrushMode('paint')}
                            className={`flex items-center gap-1 px-2 py-1 rounded ${brushMode === 'paint' ? 'bg-neutral-100 text-neutral-950 font-medium' : 'text-neutral-400'}`}
                          >
                            <Paintbrush className="w-3 h-3" /> Paint White
                          </button>
                          <button
                            onClick={() => setBrushMode('erase')}
                            className={`flex items-center gap-1 px-2 py-1 rounded ${brushMode === 'erase' ? 'bg-neutral-100 text-neutral-950 font-medium' : 'text-neutral-400'}`}
                          >
                            <Eraser className="w-3 h-3" /> Erase
                          </button>
                          <button
                            onClick={() => setIsPaintMode(false)}
                            className="text-neutral-400 hover:text-white pl-2 border-l border-neutral-800"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Standard Photo/Mask Preview */
                      <>
                        <img 
                          src={showMaskOverlay && maskImage ? maskImage : userImage} 
                          alt="Hand or Nail Mask" 
                          className="max-h-60 rounded-lg object-contain shadow-lg transition-all duration-300"
                        />

                        {isDetectingMask && (
                          <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 rounded-lg text-xs text-neutral-300">
                            <RefreshCw className="w-5 h-5 animate-spin text-neutral-100" />
                            Detecting nails...
                          </div>
                        )}

                        <div className="absolute top-2 right-2 flex gap-2">
                          {maskImage && (
                            <button
                              onClick={() => setShowMaskOverlay(!showMaskOverlay)}
                              className="bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-md text-xs border border-neutral-700 backdrop-blur-md flex items-center gap-1.5 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {showMaskOverlay ? "Show Photo" : "View AI Mask"}
                            </button>
                          )}
                          <button
                            onClick={() => setUserImage(null)}
                            className="bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-md text-xs border border-neutral-700 backdrop-blur-md transition-all"
                          >
                            Change
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full space-y-3 py-8">
                    <div className="p-3 bg-neutral-900 rounded-full border border-neutral-800 text-neutral-400 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-neutral-300">Click to upload hand photo</p>
                      <p className="text-xs text-neutral-500">Auto-detects or manually paint nail mask</p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                    />
                  </label>
                )}
              </div>

              {!userImage && (
                <button
                  onClick={() => setUserImage(SAMPLE_PHOTO)}
                  className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1.5 transition-colors pt-1"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Try sample hand photo
                </button>
              )}
            </div>

            {/* Right: Prompt Input */}
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                2. Describe Your Vibe
              </label>
              
              <div className="space-y-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Milky white base with thin gold foil accents and almond shape..."
                  className="w-full h-32 bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 resize-none transition-colors"
                />

                <div className="space-y-2">
                  <span className="text-xs text-neutral-500">Quick Prompt Ideas:</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPrompt(p)}
                        className="text-xs px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-full transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-neutral-800/60 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={!userImage || !prompt.trim() || isGenerating || isDetectingMask}
              className="w-full sm:w-auto px-8 py-3.5 bg-neutral-100 hover:bg-white text-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating 3 Nail Designs...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate 3 Designs
                </>
              )}
            </button>
          </div>
        </section>

        {/* Results Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-light text-neutral-200">Suggested Designs</h2>
            {designs && (
              <span className="text-xs font-mono text-neutral-500">3 Variations Generated</span>
            )}
          </div>

          {designs ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {designs.map((src, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className="group relative bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-600 transition-all duration-300"
                >
                  <div className="aspect-square w-full overflow-hidden bg-neutral-950 relative">
                    <img 
                      src={src} 
                      alt={`Nail Design ${index + 1}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-mono border border-neutral-800 text-neutral-300">
                      Option 0{index + 1}
                    </div>
                  </div>
                  
                  <div className="p-4 flex items-center justify-between border-t border-neutral-800/60 bg-neutral-900/60">
                    <span className="text-xs text-neutral-400 truncate max-w-[200px]">
                      {prompt}
                    </span>
                    <a
                      href={src}
                      download={`nail-design-${index + 1}.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Download image"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center bg-neutral-950/30 text-neutral-500 space-y-2">
              <p className="text-sm">No designs generated yet.</p>
              <p className="text-xs text-neutral-600">
                Upload your hand photo, touch up the white mask if needed, and click "Generate".
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}