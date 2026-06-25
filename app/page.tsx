"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileForm from "../components/ProfileForm";
import PendingConsumptionBanner from "../components/PendingConsumptionBanner";
import type { HealthProfile } from "../lib/types";

const FEATURES = [
  { icon: "📸", title: "Snap a photo", text: "Point your camera at any plate — no manual logging." },
  { icon: "🎯", title: "Per-item scoring", text: "Every food gets its own color-coded risk score, not just a total." },
  { icon: "💬", title: "Ask follow-ups", text: "Chat about the scan grounded in your real results, not generic advice." },
];

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<HealthProfile[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data) => setProfiles(data.profiles ?? []));
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
      <section className="text-center space-y-4 animate-fade-in">
        <span className="inline-block text-xs font-semibold tracking-wide uppercase text-brand bg-brand-light rounded-full px-3 py-1">
          AI-Powered &middot; Personalized &middot; Instant
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Know if your plate <span className="text-brand">actually</span> fits your health
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto text-lg">
          Upload a food photo, set your health conditions, and get a color-coded breakdown of every item — no guesswork.
        </p>
      </section>

      {!activeProfile && (
        <section className="grid sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-black/5 shadow-sm p-5 text-center">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{f.text}</p>
            </div>
          ))}
        </section>
      )}

      {!activeProfile ? (
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 sm:p-8 animate-fade-in">
          <h2 className="text-xl font-semibold mb-1">Set up your health profile</h2>
          <p className="text-sm text-gray-500 mb-5">
            Pick conditions to watch for — diabetes, cholesterol, allergies, or your own custom ones.
          </p>
          <ProfileForm onCreated={() => window.location.reload()} />
        </section>
      ) : (
        <section className="space-y-5 animate-fade-in">
          <PendingConsumptionBanner />

          <div className="flex items-center justify-between rounded-2xl bg-white border border-black/5 shadow-sm p-4 sm:p-5">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Active profile</p>
              <p className="font-semibold text-lg">{activeProfile.label}</p>
            </div>
            <a href="/profiles" className="text-sm font-medium text-brand hover:underline">
              Manage profiles →
            </a>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-brand bg-brand-light" : "border-gray-200 bg-white"
            }`}
          >
            <input
              ref={fileInputRef}
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
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-brand hover:bg-brand-dark text-white rounded-full px-6 py-2.5 font-medium transition-colors"
                >
                  Choose a photo
                </button>
              </div>
            )}
            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
          </div>
        </section>
      )}
    </main>
  );
}
