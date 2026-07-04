"use client";

import { useEffect, useRef, useState } from "react";
import CameraCaptureModal from "../../components/CameraCaptureModal";
import type { RecipeSuggestion } from "../../lib/types";

interface FridgeScanResult {
  ingredients: string[];
  recipes: RecipeSuggestion[];
}

export default function FridgePage() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<FridgeScanResult | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  async function submitFile(file: File) {
    setUploading(true);
    setError(null);
    setResult(null);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/fridge/scan", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Fridge scan failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) submitFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) submitFile(file);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-foreground">What&apos;s in your fridge?</h1>
        <p className="text-gray-500 mt-1">
          Snap a photo of your fridge or pantry and get recipe ideas built around what you already have, filtered
          for your active health profile. Nothing here is saved.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-brand bg-brand-light" : "border-black/10 bg-white/70"
        }`}
      >
        {/* Camera input — mobile only, triggers native camera */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        {/* Gallery input — no capture so browser always shows the file picker */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        {previewUrl && uploading ? (
          <div className="space-y-4">
            <div className="relative w-40 h-40 mx-auto rounded-xl overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-70" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Looking through your fridge and thinking up recipes...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl">🧊</div>
            <p className="text-gray-600">Drag a fridge photo here, or</p>
            <button
              onClick={() => setPickerOpen(true)}
              className="bg-brand hover:bg-brand-dark text-white rounded-full px-6 py-2.5 font-medium transition-colors"
            >
              Add a photo
            </button>
          </div>
        )}
        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
      </div>

      {/* Photo source picker — same pattern as the plate scan */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
          onClick={() => setPickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-2">
              <button
                onClick={() => {
                  setPickerOpen(false);
                  if (isTouchDevice) {
                    cameraInputRef.current?.click();
                  } else {
                    setCameraModalOpen(true);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-lg shrink-0">
                  📷
                </span>
                <span className="font-medium text-gray-800">Take Photo</span>
              </button>
              <button
                onClick={() => {
                  setPickerOpen(false);
                  galleryInputRef.current?.click();
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-lg shrink-0">
                  🖼️
                </span>
                <span className="font-medium text-gray-800">Choose from Library</span>
              </button>
            </div>
            <button
              onClick={() => setPickerOpen(false)}
              className="w-full border-t border-gray-100 py-3.5 font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {cameraModalOpen && (
        <CameraCaptureModal
          onCapture={(file) => {
            setCameraModalOpen(false);
            submitFile(file);
          }}
          onClose={() => setCameraModalOpen(false)}
        />
      )}

      {result && result.ingredients.length === 0 && (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-gray-500">
          Couldn&apos;t confidently identify any ingredients in that photo. Try a clearer, well-lit shot.
        </div>
      )}

      {result && result.ingredients.length > 0 && (
        <>
          <div className="rounded-2xl border border-black/5 bg-white p-5">
            <h2 className="font-semibold mb-2.5">Detected in your fridge</h2>
            <div className="flex flex-wrap gap-2">
              {result.ingredients.map((label) => (
                <span key={label} className="text-sm font-medium text-gray-700 bg-gray-100 rounded-full px-3 py-1.5 capitalize">
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {result.recipes.map((recipe, i) => (
              <RecipeCard key={i} recipe={recipe} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function RecipeCard({ recipe }: { recipe: RecipeSuggestion }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 space-y-3">
      <div>
        <h3 className="font-semibold text-lg">{recipe.title}</h3>
        <p className="text-sm text-gray-600 mt-0.5">{recipe.description}</p>
      </div>

      {recipe.caution && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 flex gap-2">
          <span className="text-base shrink-0">⚠️</span>
          <p className="text-sm text-amber-800">{recipe.caution}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {recipe.usesFromFridge.length > 0 && (
          <p className="text-gray-600">
            <span className="font-medium text-gray-700">From your fridge:</span> {recipe.usesFromFridge.join(", ")}
          </p>
        )}
      </div>
      {recipe.otherIngredientsNeeded.length > 0 && (
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-700">You&apos;ll also need:</span> {recipe.otherIngredientsNeeded.join(", ")}
        </p>
      )}

      <button
        onClick={() => setExpanded((e) => !e)}
        className="text-sm font-medium text-brand hover:underline"
      >
        {expanded ? "Hide steps" : "Show steps"}
      </button>

      {expanded && (
        <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside pt-1 border-t border-gray-100">
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
