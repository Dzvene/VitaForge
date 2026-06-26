"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { admin, ApiError, type LegalContent, type LegalSection } from "@/lib/api";
import { Badge, Button, Card, Input, Spinner } from "@/components/primitives";

const DOC_LABELS: Record<string, string> = {
  impressum: "Imprint",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  cookies: "Cookies",
};
const DOC_ORDER = ["impressum", "privacy", "terms", "cookies"];
const LOCALE_ORDER = ["en", "ru", "de"];

export default function LegalPage() {
  const [docs, setDocs] = useState<LegalContent[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<{ doc: string; locale: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = () => {
    setDocs(null);
    setError(false);
    admin.legal().then(setDocs).catch(() => setError(true));
  };
  useEffect(load, []);

  const flash = (m: string) => {
    setNote(m);
    setTimeout(() => setNote(null), 2500);
  };

  const current = useMemo(
    () => docs?.find((d) => d.doc === editing?.doc && d.locale === editing?.locale) ?? null,
    [docs, editing],
  );

  if (editing && current) {
    return (
      <Editor
        key={`${editing.doc}/${editing.locale}`}
        item={current}
        onBack={() => setEditing(null)}
        onSaved={(updated) => {
          setDocs((prev) =>
            prev?.map((d) => (d.doc === updated.doc && d.locale === updated.locale ? updated : d)) ?? null,
          );
          flash("Saved");
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Content</p>
          <h1 className="text-2xl font-semibold tracking-tight">Legal pages</h1>
        </div>
        {note && <p className="text-sm text-ink-muted">{note}</p>}
      </header>

      <p className="text-sm text-ink-muted">
        Edit the public Impressum, Privacy, Terms and Cookies pages per language. A{" "}
        <span className="text-brand-400">customized</span> badge means it overrides the bundled
        default — anything still showing placeholders like{" "}
        <code className="rounded bg-surface-3 px-1">[Operator legal name]</code> needs your real
        details before launch.
      </p>

      {error ? (
        <Card>
          <p className="text-sm text-danger">Couldn&apos;t load legal pages.</p>
        </Card>
      ) : !docs ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="space-y-4">
          {DOC_ORDER.map((doc) => (
            <Card key={doc}>
              <h2 className="mb-3 text-base font-semibold">{DOC_LABELS[doc] ?? doc}</h2>
              <div className="flex flex-wrap gap-2">
                {LOCALE_ORDER.map((locale) => {
                  const item = docs.find((d) => d.doc === doc && d.locale === locale);
                  if (!item) return null;
                  return (
                    <button
                      key={locale}
                      onClick={() => setEditing({ doc, locale })}
                      className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm transition-colors hover:border-line-strong hover:bg-surface-3"
                    >
                      <span className="font-medium uppercase">{locale}</span>
                      {item.customized ? (
                        <Badge tone="brand">customized</Badge>
                      ) : (
                        <Badge tone="neutral">default</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({
  item,
  onBack,
  onSaved,
}: {
  item: LegalContent;
  onBack: () => void;
  onSaved: (c: LegalContent) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [updated, setUpdated] = useState(item.updated);
  const [intro, setIntro] = useState(item.intro ?? "");
  const [sections, setSections] = useState<LegalSection[]>(
    item.sections.map((s) => ({ heading: s.heading, body: [...s.body] })),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mutateSection = (i: number, patch: Partial<LegalSection>) =>
    setSections((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const mutateBody = (si: number, bi: number, value: string) =>
    setSections((prev) =>
      prev.map((s, j) =>
        j === si ? { ...s, body: s.body.map((b, k) => (k === bi ? value : b)) } : s,
      ),
    );

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const cleaned = sections
        .map((s) => ({ heading: s.heading.trim(), body: s.body.map((b) => b.trim()).filter(Boolean) }))
        .filter((s) => s.heading);
      const saved = await admin.saveLegal(item.doc, item.locale, {
        title: title.trim(),
        intro: intro.trim() || null,
        updated: updated.trim(),
        sections: cleaned,
      });
      onSaved(saved);
    } catch (e) {
      setErr(e instanceof ApiError ? e.detail : "Save failed");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to list
      </button>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">
            {DOC_LABELS[item.doc] ?? item.doc} · <span className="uppercase">{item.locale}</span>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Edit page</h1>
        </div>
        {item.customized ? <Badge tone="brand">customized</Badge> : <Badge tone="neutral">default</Badge>}
      </header>

      <Card className="space-y-4">
        <L label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </L>
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <L label="Intro (optional)">
            <textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </L>
          <L label="Last updated (YYYY-MM-DD)">
            <Input value={updated} onChange={(e) => setUpdated(e.target.value)} placeholder="2026-07-01" />
          </L>
        </div>
      </Card>

      <div className="space-y-4">
        {sections.map((s, si) => (
          <Card key={si} className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={s.heading}
                onChange={(e) => mutateSection(si, { heading: e.target.value })}
                placeholder="Section heading"
                className="font-medium"
              />
              <button
                onClick={() => setSections((p) => p.filter((_, j) => j !== si))}
                aria-label="Remove section"
                className="rounded-lg p-2 text-ink-faint hover:bg-surface-3 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {s.body.map((b, bi) => (
                <div key={bi} className="flex items-start gap-2">
                  <textarea
                    value={b}
                    onChange={(e) => mutateBody(si, bi, e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <button
                    onClick={() => mutateSection(si, { body: s.body.filter((_, k) => k !== bi) })}
                    aria-label="Remove paragraph"
                    className="mt-1 rounded-lg p-2 text-ink-faint hover:bg-surface-3 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => mutateSection(si, { body: [...s.body, ""] })}
              >
                <Plus className="h-3.5 w-3.5" /> Add paragraph
              </Button>
            </div>
          </Card>
        ))}
        <Button
          variant="secondary"
          onClick={() => setSections((p) => [...p, { heading: "", body: [""] }])}
        >
          <Plus className="h-4 w-4" /> Add section
        </Button>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={!title.trim() || !updated.trim()}>
            Save page
          </Button>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
