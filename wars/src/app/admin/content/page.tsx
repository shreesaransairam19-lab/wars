"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/features/auth/useAuth";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { ChapterForm } from "@/components/admin/ChapterForm";
import { UploadPanel } from "@/components/admin/UploadPanel";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

interface Series {
  id: string;
  title: string;
  slug: string;
  content_type: string;
  status: string;
  chapters?: { count: number }[];
}

interface Chapter {
  id: string;
  title: string;
  slug: string;
  chapter_number: number;
  status: string;
  chapter_assets?: { count: number }[];
}

export default function AdminContentPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Record<string, Chapter[]>>({});
  const [loading, setLoading] = useState(true);

  const isStaff = roles.some((r) => ["owner", "admin", "editor"].includes(r));

  const fetchSeries = useCallback(async () => {
    try {
      const res = await fetch("/api/series?all=true");
      const data = await res.json();
      setSeriesList(data.series ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (user && isStaff) {
        try {
          const res = await fetch("/api/series?all=true");
          const data = await res.json();
          if (!cancelled) {
            setSeriesList(data.series ?? []);
            setLoading(false);
          }
        } catch {
          if (!cancelled) setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, isStaff]);

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

  if (!user || !isStaff) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted">
            You need editor or admin permissions to manage content.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">
          Admin
        </span>
        <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
          Content Management
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage series, chapters, and upload files.
        </p>

        {/* Create series */}
        <div className="mt-6">
          <SeriesForm onCreated={fetchSeries} />
        </div>

        {/* Series list */}
        <div className="mt-6">
          <h2 className="mb-3 font-heading text-sm font-semibold">
            Existing Series ({seriesList.length})
          </h2>

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
                      <div className="mb-3">
                        <ChapterForm
                          seriesId={series.id}
                          nextChapterNumber={
                            (chapters[series.id]?.length ?? 0) + 1
                          }
                          onCreated={() => {
                            delete chapters[series.id];
                            loadChapters(series.id);
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
                              className="flex items-center justify-between rounded-lg bg-panel2 px-3 py-2"
                            >
                              <div>
                                <p className="text-xs font-medium">
                                  CH {chapter.chapter_number}: {chapter.title}
                                </p>
                                <p className="text-[9px] text-muted">
                                  {chapter.chapter_assets?.[0]?.count ?? 0} assets
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {series.content_type === "light_novel" ? (
                                  <UploadPanel
                                    chapterId={chapter.id}
                                    assetType="novel"
                                  />
                                ) : (
                                  <UploadPanel
                                    chapterId={chapter.id}
                                    assetType="page"
                                  />
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
