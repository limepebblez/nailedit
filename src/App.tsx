import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Sparkles, Image as ImageIcon, Download, RefreshCw, Wand2, Eye, CheckCircle2 } from 'lucide-react';
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
  const [handDetected, setHandDetected] = useState<boolean | null>(null);

  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [designs, setDesigns] = useState<string[] | null>(null);

  // Auto-detect hand & generate nail mask whenever image changes
  useEffect(() => {
    if (!userImage) {
      setMaskImage(null);
      setHandDetected(null);
      return;
    }

    let isMounted = true;
    setIsDetectingMask(true);

    generateNailMask(userImage)
      .then(({ maskUrl, handDetected }) => {
        if (isMounted) {
          setMaskImage(maskUrl);
          setHandDetected(handDetected);
          setIsDetectingMask(false);
        }
      })
      .catch((err) => {
        console.error("Mask generation error:", err);
        if (isMounted) setIsDetectingMask(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUserImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    if (!userImage || !prompt.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
      setDesigns([
        "https://images.unsplash.com/photo-1632345031435-8727f6897d53?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=800&auto=format&fit=crop",
      ]);
      setIsGenerating(false);
    }, 2000);
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
            AI Hand & Nail Detection Active
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
            Upload a photo of your hand, let client-side AI detect your nails, and describe your custom vibe.
          </p>
        </div>

        {/* Input Box */}
        <section className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Left: Upload & Detection Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                  1. Upload Hand Photo
                </label>
                {handDetected && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Nails Isolated
                  </span>
                )}
              </div>

              <div className="relative group min-h-[260px] border-2 border-dashed border-neutral-800 hover:border-neutral-600 rounded-xl flex flex-col items-center justify-center p-4 transition-all duration-200 bg-neutral-950/40 overflow-hidden">
                {userImage ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                      src={showMaskOverlay && maskImage ? maskImage : userImage} 
                      alt="Hand or Nail Mask" 
                      className="max-h-60 rounded-lg object-contain shadow-lg transition-all duration-300"
                    />

                    {/* Mask Loading Indicator */}
                    {isDetectingMask && (
                      <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 rounded-lg text-xs text-neutral-300">
                        <RefreshCw className="w-5 h-5 animate-spin text-neutral-100" />
                        Scanning hand landmarks...
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
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full space-y-3 py-8">
                    <div className="p-3 bg-neutral-900 rounded-full border border-neutral-800 text-neutral-400 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-neutral-300">Click to upload hand photo</p>
                      <p className="text-xs text-neutral-500">Auto-detects fingernails automatically</p>
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
                  Try sample photo with AI auto-detection
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
                Upload your hand photo to auto-generate the nail mask, then click "Generate".
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}