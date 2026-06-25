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

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  metabolic: { icon: "🩸", label: "Metabolic" },
  cardiac: { icon: "❤️", label: "Cardiac" },
  allergen: { icon: "🥜", label: "Allergens" },
  lifestyle: { icon: "🌱", label: "Lifestyle" },
};

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
    <form onSubmit={handleSubmit} className="space-y-7">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Profile name</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          required
        />
      </div>

      {Object.entries(grouped).map(([category, items]) => {
        const meta = CATEGORY_META[category] ?? { icon: "🏷️", label: category };
        return (
          <div key={category}>
            <p className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
              <span>{meta.icon}</span> {meta.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => {
                const selected = item.code ? selectedPresets[item.code] : undefined;
                return (
                  <div key={item.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => item.code && togglePreset(item.code)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
                        selected
                          ? "bg-brand text-white border-brand"
                          : "bg-white text-gray-600 border-gray-200 hover:border-brand/40"
                      }`}
                    >
                      {item.label}
                    </button>
                    {selected && (
                      <select
                        value={selected.severity}
                        onChange={(e) => item.code && setPresetSeverity(item.code, e.target.value as Severity)}
                        className="ml-1.5 border border-gray-200 rounded-full px-2 py-1 text-xs text-gray-600 bg-white"
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
          </div>
        );
      })}

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
          <span>✏️</span> Custom conditions
        </p>
        <div className="space-y-2.5">
          {customConditions.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-xl p-2.5">
              <input
                placeholder="Condition name"
                value={c.customLabel}
                onChange={(e) => updateCustomCondition(i, { customLabel: e.target.value })}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 flex-1 min-w-[140px] text-sm bg-white"
              />
              <select
                value={c.ruleKey}
                onChange={(e) => updateCustomCondition(i, { ruleKey: e.target.value })}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
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
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                />
              )}
              <select
                value={c.severity}
                onChange={(e) => updateCustomCondition(i, { severity: e.target.value as Severity })}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeCustomCondition(i)}
                className="text-red-500 text-sm font-medium px-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addCustomCondition} className="text-sm font-medium text-brand">
            + Add custom condition
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-brand hover:bg-brand-dark text-white rounded-full px-6 py-2.5 font-medium transition-colors disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create profile"}
      </button>
    </form>
  );
}
