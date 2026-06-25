"use client";

import { useEffect, useState } from "react";
import ProfileForm from "../../components/ProfileForm";
import type { HealthProfile } from "../../lib/types";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<HealthProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function loadProfiles() {
    const res = await fetch("/api/profiles");
    const data = await res.json();
    setProfiles(data.profiles ?? []);
  }

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data) => setProfiles(data.profiles ?? []));
  }, []);

  async function activate(profileId: string) {
    setSwitching(true);
    await fetch(`/api/profiles/${profileId}/activate`, { method: "POST" });
    await loadProfiles();
    setSwitching(false);
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Health Profiles</h1>
        <p className="text-gray-500 mt-1">Switch profiles to see scores update instantly on any open scan.</p>
      </div>

      <div className="space-y-2.5">
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded-2xl border p-4 transition-colors ${
              p.is_active ? "border-brand/30 bg-brand-light" : "border-black/5 bg-white"
            }`}
          >
            <span className="font-medium">{p.label}</span>
            {p.is_active ? (
              <span className="text-xs font-semibold text-brand bg-white rounded-full px-3 py-1 border border-brand/20">
                ✓ Active
              </span>
            ) : (
              <button
                onClick={() => activate(p.id)}
                disabled={switching}
                className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
              >
                Switch to this profile
              </button>
            )}
          </div>
        ))}
        {profiles.length === 0 && (
          <p className="text-gray-400 text-sm bg-white border border-black/5 rounded-2xl p-6 text-center">
            No profiles yet — create your first one below.
          </p>
        )}
      </div>

      {showForm ? (
        <section className="bg-white rounded-2xl border border-black/5 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">New profile</h2>
          <ProfileForm
            onCreated={() => {
              setShowForm(false);
              loadProfiles();
            }}
          />
        </section>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm font-medium text-brand border border-brand/30 rounded-full px-4 py-2 hover:bg-brand-light transition-colors"
        >
          + Add another profile
        </button>
      )}
    </main>
  );
}
