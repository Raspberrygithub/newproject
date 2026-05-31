"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

interface Stats {
  total: number;
  due: number;
  newCards: number;
  learning: number;
  review: number;
  reviewedToday: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>("/api/stats").then(setStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Memory</h1>
        <p className="text-muted">Spaced repetition, voice capture, and Claude.</p>
      </header>

      <Link
        href="/review"
        className="card-surface block bg-gradient-to-br from-accentDim to-surface p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted">Due now</div>
            <div className="text-5xl font-bold text-accent">{stats?.due ?? "—"}</div>
          </div>
          <div className="btn bg-accent text-lg">Start review →</div>
        </div>
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="New" value={stats?.newCards} />
        <Stat label="Learning" value={stats?.learning} />
        <Stat label="Review" value={stats?.review} />
        <Stat label="Total cards" value={stats?.total} />
        <Stat label="Done today" value={stats?.reviewedToday} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/voice" className="card-surface flex flex-col items-center gap-1 p-5">
          <span className="text-3xl">🎙️</span>
          <span className="font-semibold">Voice add</span>
          <span className="text-center text-xs text-muted">Talk through cards</span>
        </Link>
        <Link href="/add" className="card-surface flex flex-col items-center gap-1 p-5">
          <span className="text-3xl">✨</span>
          <span className="font-semibold">Add with AI</span>
          <span className="text-center text-xs text-muted">Claude writes the back</span>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="card-surface p-4 text-center">
      <div className="text-2xl font-bold">{value ?? "—"}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
