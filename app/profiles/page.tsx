"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Health Profiles</h1>
        <Link href="/" className="text-sm text-blue-600">
          Back home
        </Link>
      </div>

      <div className="space-y-2">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center justify-between border rounded p-3">
            <span className={p.is_active ? "font-semibold" : ""}>{p.label}</span>
            {p.is_active ? (
              <span className="text-xs text-green-700 bg-green-100 rounded px-2 py-1">Active</span>
            ) : (
              <button
                onClick={() => activate(p.id)}
                disabled={switching}
                className="text-sm text-blue-600 disabled:opacity-50"
              >
                Switch to this profile
              </button>
            )}
          </div>
        ))}
        {profiles.length === 0 && <p className="text-gray-500 text-sm">No profiles yet.</p>}
      </div>

      {showForm ? (
        <section>
          <h2 className="text-lg font-semibold mb-3">New profile</h2>
          <ProfileForm
            onCreated={() => {
              setShowForm(false);
              loadProfiles();
            }}
          />
        </section>
      ) : (
        <button onClick={() => setShowForm(true)} className="text-sm text-blue-600">
          + Add another profile
        </button>
      )}
    </main>
  );
}
