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
    // Lives in the navbar now, rendered once at the layout level — pages that
    // care about a switch (e.g. the scan view re-scoring its items) listen
    // for this instead of getting a direct callback prop.
    window.dispatchEvent(new CustomEvent("profile-switched", { detail: profileId }));
  }

  const active = profiles.find((p) => p.is_active);

  if (profiles.length === 0) return null;

  const initial = (active?.label ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
      <span className="w-5 h-5 rounded-full bg-brand text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
        {initial}
      </span>
      <select
        value={active?.id ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={switching}
        aria-label="Active health profile"
        className="border-none bg-transparent text-xs font-medium text-gray-600 focus:outline-none max-w-[8rem] truncate"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {switching && (
        <span className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin shrink-0" />
      )}
    </div>
  );
}
