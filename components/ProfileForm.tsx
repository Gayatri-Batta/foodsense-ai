"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConditionCatalogItem, ProfileConditionSelection, Severity } from "../lib/types";

const RULE_KEYS = [
  { value: "glycemic_sensitivity", label: "Glycemic sensitivity" },
  { value: "cholesterol_sensitivity", label: "Cholesterol sensitivity" },
  { value: "sodium_sensitivity", label: "Sodium sensitivity" },
  { value: "allergen_avoid", label: "Allergen to avoid" },
  { value: "vegan_avoid", label: "Vegan" },
  { value: "vegetarian_avoid", label: "Vegetarian" },
  { value: "keto_avoid", label: "Keto" },
];

const SEVERITIES: Severity[] = ["mild", "moderate", "severe"];

interface SelectedPreset {
  code: string;
  severity: Severity;
}

interface CustomCondition {
  customLabel: string;
  ruleKey: string;
  allergenTag: string;
  severity: Severity;
}

export default function ProfileForm({ onCreated }: { onCreated: (profileId: string) => void }) {
  const [catalog, setCatalog] = useState<ConditionCatalogItem[]>([]);
  const [label, setLabel] = useState("My Profile");
  const [selectedPresets, setSelectedPresets] = useState<Record<string, SelectedPreset>>({});
  const [customConditions, setCustomConditions] = useState<CustomCondition[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/conditions")
      .then((r) => r.json())
      .then((data) => setCatalog(data.conditions ?? []));
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, ConditionCatalogItem[]> = {};
    for (const c of catalog) {
      groups[c.category] = groups[c.category] ?? [];
      groups[c.category].push(c);
    }
    return groups;
  }, [catalog]);

  function togglePreset(code: string) {
    setSelectedPresets((prev) => {
      const next = { ...prev };
      if (next[code]) {
        delete next[code];
      } else {
        next[code] = { code, severity: "moderate" };
      }
      return next;
    });
  }

  function setPresetSeverity(code: string, severity: Severity) {
    setSelectedPresets((prev) => ({ ...prev, [code]: { ...prev[code], severity } }));
  }

  function addCustomCondition() {
    setCustomConditions((prev) => [
      ...prev,
      { customLabel: "", ruleKey: "allergen_avoid", allergenTag: "", severity: "moderate" },
    ]);
  }

  function updateCustomCondition(index: number, patch: Partial<CustomCondition>) {
    setCustomConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeCustomCondition(index: number) {
    setCustomConditions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const conditions: ProfileConditionSelection[] = [
      ...Object.values(selectedPresets).map((p) => {
        const catalogItem = catalog.find((c) => c.code === p.code);
        return {
          conditionCode: p.code,
          ruleKey: catalogItem?.rule_key ?? "allergen_avoid",
          severity: p.severity,
        };
      }),
      ...customConditions
        .filter((c) => c.customLabel.trim())
        .map((c) => ({
          customLabel: c.customLabel,
          ruleKey: c.ruleKey,
          allergenTag: c.ruleKey === "allergen_avoid" ? c.allergenTag : undefined,
          severity: c.severity,
        })),
    ];

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, conditions }),
      });
      if (!res.ok) throw new Error("Failed to create profile");
      const data = await res.json();
      onCreated(data.profile.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium mb-1">Profile name</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded border px-3 py-2"
          required
        />
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <fieldset key={category} className="border rounded p-4">
          <legend className="text-sm font-semibold capitalize px-1">{category}</legend>
          <div className="space-y-2 mt-2">
            {items.map((item) => {
              const selected = item.code ? selectedPresets[item.code] : undefined;
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(selected)}
                    onChange={() => item.code && togglePreset(item.code)}
                  />
                  <span className="flex-1">{item.label}</span>
                  {selected && (
                    <select
                      value={selected.severity}
                      onChange={(e) => item.code && setPresetSeverity(item.code, e.target.value as Severity)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <fieldset className="border rounded p-4">
        <legend className="text-sm font-semibold px-1">Custom conditions</legend>
        <div className="space-y-3 mt-2">
          {customConditions.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 border-b pb-2">
              <input
                placeholder="Condition name"
                value={c.customLabel}
                onChange={(e) => updateCustomCondition(i, { customLabel: e.target.value })}
                className="border rounded px-2 py-1 flex-1 min-w-[140px]"
              />
              <select
                value={c.ruleKey}
                onChange={(e) => updateCustomCondition(i, { ruleKey: e.target.value })}
                className="border rounded px-2 py-1"
              >
                {RULE_KEYS.map((rk) => (
                  <option key={rk.value} value={rk.value}>
                    {rk.label}
                  </option>
                ))}
              </select>
              {c.ruleKey === "allergen_avoid" && (
                <input
                  placeholder="allergen tag e.g. sesame"
                  value={c.allergenTag}
                  onChange={(e) => updateCustomCondition(i, { allergenTag: e.target.value })}
                  className="border rounded px-2 py-1"
                />
              )}
              <select
                value={c.severity}
                onChange={(e) => updateCustomCondition(i, { severity: e.target.value as Severity })}
                className="border rounded px-2 py-1"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => removeCustomCondition(i)} className="text-red-600 text-sm">
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={addCustomCondition} className="text-sm text-blue-600">
            + Add custom condition
          </button>
        </div>
      </fieldset>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create profile"}
      </button>
    </form>
  );
}
