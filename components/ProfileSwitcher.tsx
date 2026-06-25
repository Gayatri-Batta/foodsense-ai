"use client";

import { useEffect, useState } from "react";
import type { HealthProfile } from "../lib/types";

interface Props {
  onSwitched?: (profileId: string) => void;
}

export default function ProfileSwitcher({ onSwitched }: Props) {
  const [profiles, setProfiles] = useState<HealthProfile[]>([]);
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

  async function handleChange(profileId: string) {
    setSwitching(true);
    await fetch(`/api/profiles/${profileId}/activate`, { method: "POST" });
    await loadProfiles();
    setSwitching(false);
    onSwitched?.(profileId);
  }

  const active = profiles.find((p) => p.is_active);

  if (profiles.length === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-white border border-black/5 rounded-full pl-3 pr-1.5 py-1.5 shadow-sm">
      <span className="text-xs text-gray-400 hidden sm:inline">Profile</span>
      <select
        value={active?.id ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={switching}
        className="border-none bg-transparent text-sm font-medium focus:outline-none"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {switching && (
        <span className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin mr-1" />
      )}
    </div>
  );
}
