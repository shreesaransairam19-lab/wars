"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/features/auth/useAuth";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { ChapterForm } from "@/components/admin/ChapterForm";
import { UploadPanel } from "@/components/admin/UploadPanel";
import { CoverUpload } from "@/components/admin/CoverUpload";
import { ExternalPdfLinkForm } from "@/components/admin/ExternalPdfLinkForm";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

interface Series {
  id: string;
  title: string;
  slug: string;
  content_type: string;
  cover_path?: string | null;
  status: string;
  chapters?: { count: number }[];
}

interface Chapter {
  id: string;
  title: string;
  slug: string;
  chapter_number: number;
  status: string;
  chapter_assets?: { id: string; asset_type: string; storage_path: string; external_url?: string | null; mime_type?: string }[];
}

export default function AdminContentPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Record<string, Chapter[]>>({});
  const [loading, setLoading] = useState(true);
  const [seriesError, setSeriesError] = useState("");

  const canManageChapters = roles.some((r) => ["owner", "editor"].includes(r));

  const fetchSeries = useCallback(async () => {
    try {
      const res = await fetch("/api/series?all=true");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Could not load series (HTTP ${res.status})`);
      if (!data || !Array.isArray(data.series)) throw new Error("The server returned an invalid series list");
      setSeriesList(data.series);
      setSeriesError("");
    } catch (error) {
      setSeriesError(error instanceof Error ? error.message : "The series list could not refresh.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (user && canManageChapters) {
        await fetchSeries();
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, canManageChapters, fetchSeries]);

  async function loadChapters(seriesId: string) {
    if (chapters[seriesId]) {
      setExpandedSeries(expandedSeries === seriesId ? null : seriesId);
      return;
    }

    try {
      const res = await fetch(`/api/chapters?series_id=${seriesId}`);
      const data = await res.json();
      setChapters((prev) => ({ ...prev, [seriesId]: data.chapters ?? [] }));
      setExpandedSeries(seriesId);
    } catch {
      // ignore
    }
  }

  async function refreshChapters(seriesId: string) {
    try {
      const res = await fetch(`/api/chapters?series_id=${seriesId}`);
      const data = await res.json();
      setChapters((prev) => ({ ...prev, [seriesId]: data.chapters ?? [] }));
    } catch {
      // Keep the current list visible if refreshing fails.
    }
  }

  async function removeAsset(chapterId: string, assetId: string) {
    if (!confirm("Remove this file from the chapter?")) return;
    const res = await fetch(`/api/chapters/${chapterId}/assets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: assetId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Could not remove file");
      return;
    }
    for (const series of seriesList) {
      if (chapters[series.id]?.some((chapter) => chapter.id === chapterId)) {
        await refreshChapters(series.id);
        break;
      }
    }
  }

  async function deleteSeries(id: string) {
    if (!confirm("Delete this series and all its chapters?")) return;
    const res = await fetch(`/api/series?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchSeries();
    }
  }

  async function deleteChapter(id: string) {
    if (!confirm("Delete this chapter and its assets?")) return;
    const res = await fetch(`/api/chapters?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setChapters((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter((c) => c.id !== id);
        }
        return next;
      });
    }
  }

  if (authLoading) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-5xl px-4 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-panel2" />
            <div className="h-40 rounded-xl bg-panel2" />
          </div>
        </main>
      </>
    );
  }

  if (!user || !canManageChapters) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in with an Owner or Editor account to add or remove chapters.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">
              Admin
            </span>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
              Content Management
            </h1>
            <p className="mt-1 text-sm text-muted">
              Manage series, chapters, and upload files.
            </p>
          </div>
          {roles.includes("owner") && (
            <Link href="/admin/roles" className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-muted hover:text-foreground">
              Promote Members
            </Link>
          )}
          {roles.some((role) => ["owner", "admin"].includes(role)) && (
            <Link href="/admin/frames" className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-muted hover:text-foreground">
              Frame payments
            </Link>
          )}
        </div>

        {/* Create series */}
        <div className="mt-6">
          <SeriesForm
            onCreated={(created) => {
              if (created) {
                const newSeries: Series = { ...created, chapters: [{ count: 0 }] };
                setSeriesList((current) => [newSeries, ...current.filter((item) => item.id !== newSeries.id)]);
                setChapters((current) => ({ ...current, [newSeries.id]: [] }));
              }
              void fetchSeries();
            }}
          />
        </div>

        {/* Series list */}
        <div className="mt-6">
          <h2 className="mb-3 font-heading text-sm font-semibold">
            Existing Series ({seriesList.length})
          </h2>

          {seriesError && (
            <p role="alert" className="mb-3 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-xs text-[#ffb2b2]">
              {seriesError}
            </p>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-panel2" />
              ))}
            </div>
          ) : seriesList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#3d3a46] px-4 py-8 text-center text-sm text-muted">
              No series yet. Create one above.
            </div>
          ) : (
            <div className="space-y-2">
              {seriesList.map((series) => (
                <div key={series.id} className="rounded-lg border border-line bg-panel">
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left"
                      onClick={() => loadChapters(series.id)}
                    >
                      {expandedSeries === series.id ? (
                        <ChevronDown className="h-4 w-4 text-muted" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted" />
                      )}
                      <div>
                        <p className="font-heading text-sm font-semibold">
                          {series.title}
                        </p>
                        <p className="text-[10px] text-muted">
                          {series.content_type === "manga" ? "Manga" : "Light Novel"}
                          {" · "}
                          {series.chapters?.[0]?.count ?? 0} chapters
                          {" · "}
                          <span
                            className={
                              series.status === "published"
                                ? "text-accent"
                                : "text-gold"
                            }
                          >
                            {series.status}
                          </span>
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteSeries(series.id)}
                      className="rounded-lg border border-[#704044] bg-[#332329] p-1.5 text-[#ffb2b2] transition-colors hover:bg-[#432a2d]"
                      aria-label={`Delete ${series.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Expanded: chapters + add form */}
                  {expandedSeries === series.id && (
                    <div className="border-t border-line px-4 py-3">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <CoverUpload
                          seriesId={series.id}
                          hasCover={Boolean(series.cover_path)}
                          onUploaded={fetchSeries}
                        />
                        <span className="text-[10px] text-muted">Front cover: JPG, PNG, WebP, or GIF (max 5 MB)</span>
                      </div>
                      <div className="mb-3">
                        <ChapterForm
                          seriesId={series.id}
                          nextChapterNumber={
                            (chapters[series.id]?.length ?? 0) + 1
                          }
                          onCreated={() => {
                            void refreshChapters(series.id);
                          }}
                        />
                      </div>

                      {chapters[series.id]?.length === 0 ? (
                        <p className="text-[10px] text-muted">No chapters yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {chapters[series.id]?.map((chapter) => (
                            <div
                              key={chapter.id}
                              className="rounded-lg bg-panel2 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-medium">
                                    CH {chapter.chapter_number}: {chapter.title}
                                  </p>
                                  <p className="text-[9px] text-muted">
                                    {chapter.chapter_assets?.length ?? 0} files
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {series.content_type === "light_novel" ? (
                                    <UploadPanel
                                      chapterId={chapter.id}
                                      assetType="novel"
                                      onPageUploaded={() => void refreshChapters(series.id)}
                                    />
                                  ) : (
                                    <>
                                      <UploadPanel
                                        chapterId={chapter.id}
                                        assetType="page"
                                        onPageUploaded={() => void refreshChapters(series.id)}
                                      />
                                      <UploadPanel
                                        chapterId={chapter.id}
                                        assetType="document"
                                        onPageUploaded={() => void refreshChapters(series.id)}
                                      />
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => deleteChapter(chapter.id)}
                                    className="rounded border border-[#704044] bg-[#332329] p-1 text-[#ffb2b2]"
                                    aria-label={`Delete ${chapter.title}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <ExternalPdfLinkForm
                                chapterId={chapter.id}
                                onAdded={() => void refreshChapters(series.id)}
                              />
                              {(chapter.chapter_assets ?? []).length > 0 && (
                                <ul className="mt-2 space-y-1 border-t border-line pt-2">
                                  {chapter.chapter_assets?.map((asset) => (
                                    <li key={asset.id} className="flex items-center justify-between gap-2 text-[10px]">
                                      <span className="truncate text-muted">
                                        {asset.external_url
                                          ? `External PDF · ${new URL(asset.external_url).hostname}`
                                          : `${asset.asset_type === "file" ? (asset.storage_path.toLowerCase().endsWith(".pdf") ? "PDF" : "EPUB") : "Page"} · ${asset.storage_path.split("/").at(-1)}`}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => removeAsset(chapter.id, asset.id)}
                                        className="rounded border border-[#704044] bg-[#332329] p-1 text-[#ffb2b2]"
                                        aria-label={`Remove ${asset.external_url ? "external PDF link" : asset.storage_path.split("/").at(-1)}`}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
