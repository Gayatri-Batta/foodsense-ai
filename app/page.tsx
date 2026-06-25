"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProfileForm from "../components/ProfileForm";
import type { HealthProfile } from "../lib/types";

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<HealthProfile[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

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

  if (profiles === null) {
    return <main className="p-8">Loading...</main>;
  }

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold">AI-Powered Food Health Analyzer</h1>
        <p className="text-gray-600 mt-1">
          Upload a food photo and see a personalized health risk score for every item on the plate.
        </p>
      </header>

      {!activeProfile ? (
        <section>
          <h2 className="text-lg font-semibold mb-3">First, set up your health profile</h2>
          <ProfileForm onCreated={() => window.location.reload()} />
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between border rounded p-4">
            <div>
              <p className="text-sm text-gray-500">Active profile</p>
              <p className="font-semibold">{activeProfile.label}</p>
            </div>
            <Link href="/profiles" className="text-sm text-blue-600">
              Manage profiles
            </Link>
          </div>

          <div className="border-2 border-dashed rounded p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-black text-white rounded px-5 py-2.5 disabled:opacity-50"
            >
              {uploading ? "Analyzing..." : "Upload a food photo"}
            </button>
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          </div>
        </section>
      )}
    </main>
  );
}
