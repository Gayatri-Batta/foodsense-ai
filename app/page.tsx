"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileForm from "../components/ProfileForm";
import PendingConsumptionBanner from "../components/PendingConsumptionBanner";
import AssistantWidget from "../components/AssistantWidget";
import CameraCaptureModal from "../components/CameraCaptureModal";
import type { HealthProfile } from "../lib/types";

const FEATURES = [
  { icon: "📸", title: "Snap a photo", text: "Point your camera at any plate instead of logging food by hand." },
  { icon: "🎯", title: "Per-item scoring", text: "Every food gets its own color-coded risk score, not just a total." },
  { icon: "💬", title: "Ask follow-ups", text: "Chat about the scan grounded in your real results, not generic advice." },
];

export default function Home() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<HealthProfile[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data) => setProfiles(data.profiles ?? []));
  }, []);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const activeProfile = profiles?.find((p) => p.is_active) ?? null;

  function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function submitFile(file: File) {
    setUploading(true);
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const { width, height } = await getImageDimensions(file);
      const formData = new FormData();
      formData.append("image", file);
      formData.append("width", String(width));
      formData.append("height", String(height));

      const res = await fetch("/api/scans", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Scan failed");
      }
      const data = await res.json();
      router.push(`/scan/${data.scan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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

  if (profiles === null) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-24 text-center text-gray-400">
        Loading...
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
      {/* Hero — two-column: editorial text left, preview card right */}
      <section className="grid sm:grid-cols-2 gap-10 items-center animate-fade-in py-4">
        <div className="space-y-6">
          <p className="text-xs font-medium tracking-widest uppercase text-brand/70">
            Personalized food scanning
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl leading-[1.15] tracking-tight text-foreground">
            Know if your plate <em>actually</em> fits your health
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-sm">
            Snap a photo. Every item on the plate gets scored against your conditions.
          </p>
          {activeProfile ? (
            <button
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-2 bg-brand text-white rounded-full px-6 py-2.5 font-medium hover:bg-brand-dark transition-colors"
            >
              Scan a plate
            </button>
          ) : (
            <div className="flex items-center gap-5">
              <button
                onClick={() => {
                  document.getElementById("profile-setup")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 bg-brand text-white rounded-full px-6 py-2.5 font-medium hover:bg-brand-dark transition-colors"
              >
                Get started
              </button>
            </div>
          )}
        </div>

        {/* Decorative preview card */}
        <div className="hidden sm:block">
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-5 space-y-1">
            <p className="font-semibold text-sm text-foreground mb-3">Chicken carbonara</p>
            <div className="divide-y divide-gray-50">
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                  <span className="text-sm text-gray-700">Cream sauce</span>
                </div>
                <span className="text-sm font-medium text-red-500">Avoid</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-sm text-gray-700">Fettuccine</span>
                </div>
                <span className="text-sm font-medium text-amber-600">Limit</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-sm text-gray-700">Grilled chicken</span>
                </div>
                <span className="text-sm font-medium text-green-600">Good</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!activeProfile && (
        <section className="grid sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white/60 border border-black/5 p-5 text-center">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{f.text}</p>
            </div>
          ))}
        </section>
      )}

      {!activeProfile ? (
        <section id="profile-setup" className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 sm:p-8 animate-fade-in">
          <h2 className="text-xl font-semibold mb-1">Set up your health profile</h2>
          <p className="text-sm text-gray-500 mb-5">
            Pick conditions to watch for, like diabetes, cholesterol, or allergies, or add your own custom ones.
          </p>
          <ProfileForm onCreated={() => window.location.reload()} />
        </section>
      ) : (
        <section className="space-y-5 animate-fade-in">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-brand bg-brand-light" : "border-black/10 bg-white/70"
            }`}
          >
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
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
                <p className="text-sm text-gray-500">Detecting food items and scoring against your profile...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-4xl">🥗</div>
                <p className="text-gray-600">Drag a photo here, or</p>
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

          <PendingConsumptionBanner />
        </section>
      )}

      <AssistantWidget />
    </main>
  );
}
