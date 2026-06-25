"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DailyNutritionResponse } from "../../lib/types";

const MICRONUTRIENT_LABELS: Record<string, { label: string; unit: string }> = {
  potassium_mg: { label: "Potassium", unit: "mg" },
  vitamin_c_mg: { label: "Vitamin C", unit: "mg" },
  calcium_mg: { label: "Calcium", unit: "mg" },
  iron_mg: { label: "Iron", unit: "mg" },
};

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export default function DashboardPage() {
  const [date, setDate] = useState(todayUtc());
  const [data, setData] = useState<DailyNutritionResponse | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/nutrition/daily?date=${date}`)
      .then((r) => r.json())
      .then((d) => setData(d));
  }, [date]);

  const isToday = date === todayUtc();

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Nutrition</h1>
        <p className="text-gray-500 mt-1">
          Calories, macros, and micronutrients from items you&apos;ve confirmed eating that day.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white px-4 py-3">
        <button
          onClick={() => setDate((d) => shiftDate(d, -1))}
          className="text-sm font-medium text-gray-500 hover:text-brand transition-colors px-2"
        >
          &larr; Prev
        </button>
        <span className="font-semibold">{formatDateLabel(date)}</span>
        <button
          onClick={() => setDate((d) => shiftDate(d, 1))}
          disabled={isToday}
          className="text-sm font-medium text-gray-500 hover:text-brand transition-colors px-2 disabled:opacity-30 disabled:hover:text-gray-500"
        >
          Next &rarr;
        </button>
      </div>

      {data === null && <p className="text-gray-400 text-sm">Loading...</p>}

      {data && data.items.length === 0 && (
        <div className="rounded-2xl border border-black/5 bg-white p-10 text-center space-y-3">
          <div className="text-3xl">📊</div>
          <p className="text-gray-500">No confirmed meals on this day yet.</p>
          <p className="text-sm text-gray-400">Scan a meal, then mark each item as eaten or skipped.</p>
          <Link href="/" className="inline-block text-sm font-medium text-brand hover:underline">
            Scan a meal →
          </Link>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Calories" value={round(data.totals.caloriesKcal)} unit="kcal" highlight />
            <StatCard label="Carbs" value={round(data.totals.carbsG)} unit="g" />
            <StatCard label="Protein" value={round(data.totals.proteinG)} unit="g" />
            <StatCard label="Fat" value={round(data.totals.fatG)} unit="g" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Fiber" value={round(data.totals.fiberG)} unit="g" small />
            <StatCard label="Sugar" value={round(data.totals.sugarG)} unit="g" small />
            <StatCard label="Sodium" value={round(data.totals.sodiumMg)} unit="mg" small />
            <StatCard label="Cholesterol" value={round(data.totals.cholesterolMg)} unit="mg" small />
          </div>

          {Object.keys(data.micronutrients).length > 0 && (
            <div className="rounded-2xl border border-black/5 bg-white p-5">
              <h2 className="font-semibold mb-3">Micronutrients</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {Object.entries(data.micronutrients).map(([key, value]) => {
                  const meta = MICRONUTRIENT_LABELS[key] ?? { label: key, unit: "" };
                  return (
                    <div key={key} className="flex items-baseline justify-between rounded-xl bg-gray-50 px-3 py-2">
                      <span className="text-gray-500">{meta.label}</span>
                      <span className="font-medium">
                        {round(value)}
                        {meta.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-black/5 bg-white p-5 space-y-2">
            <h2 className="font-semibold mb-1">Contributing items</h2>
            {data.items.map((item, i) => (
              <Link
                key={`${item.scanId}-${i}`}
                href={`/scan/${item.scanId}`}
                className="flex items-center justify-between text-sm py-1.5 border-t border-black/5 first:border-t-0 hover:text-brand transition-colors"
              >
                <span className="text-gray-700">{item.canonicalName ?? item.detectedLabel}</span>
                <span className="text-gray-400">{item.caloriesKcal != null ? `${round(item.caloriesKcal)} kcal` : "—"}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  unit,
  highlight,
  small,
}: {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-black/5 p-4 ${highlight ? "bg-brand text-white" : "bg-white"}`}
    >
      <p className={`text-xs font-medium ${highlight ? "text-white/70" : "text-gray-400"}`}>{label}</p>
      <p className={small ? "text-lg font-semibold mt-0.5" : "text-2xl font-bold mt-0.5"}>
        {value}
        <span className="text-sm font-normal ml-1">{unit}</span>
      </p>
    </div>
  );
}
