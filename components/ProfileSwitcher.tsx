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
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Active profile:</span>
      <select
        value={active?.id ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={switching}
        className="border rounded px-2 py-1 text-sm"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {switching && <span className="text-xs text-gray-500">Re-scoring...</span>}
    </div>
  );
}
