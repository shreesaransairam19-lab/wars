"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

export function StarRating({ seriesId }: { seriesId: string }) {
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchRatings() {
      const res = await fetch(`/api/ratings?series_id=${seriesId}`);
      if (!res.ok) return;
      const json = await res.json();
      if (cancelled) return;
      setAverage(json.average);
      setCount(json.count);
      setMine(json.my_rating ?? 0);
    }
    void fetchRatings();
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  async function rate(value: number) {
    setBusy(true);
    const res = await fetch("/api/ratings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ series_id: seriesId, rating: value }),
    });
    if (res.ok) {
      setMine(value);
      const refresh = await fetch(`/api/ratings?series_id=${seriesId}`);
      if (refresh.ok) {
        const json = await refresh.json();
        setAverage(json.average);
        setCount(json.count);
      }
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5" role="group" aria-label="Rate this series">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            onClick={() => rate(n)}
            className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
            aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              className={`h-4 w-4 ${
                n <= (mine || Math.round(average))
                  ? "fill-[#f2c96b] text-[#f2c96b]"
                  : "text-[#5b5668]"
              }`}
            />
          </button>
        ))}
      </div>
      <span className="text-[11px] text-muted">
        {average > 0 ? `${average} (${count})` : "No ratings yet"}
        {mine > 0 && " · you rated"}
      </span>
    </div>
  );
}
