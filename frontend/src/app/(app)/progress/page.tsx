"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import { photos as photosApi } from "@/lib/api/endpoints";
import { qk, usePhotos } from "@/lib/api/hooks";
import { isoDate } from "@/lib/format";
import { useDayLabel } from "@/lib/i18n/useDayLabel";
import { Button, Card, EmptyState, Field, Input, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export default function ProgressPage() {
  const { t } = useTranslation();
  const dayLabel = useDayLabel();
  const qc = useQueryClient();
  const toast = useToast();
  const list = usePhotos();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [takenOn, setTakenOn] = useState(isoDate());
  const [weightKg, setWeightKg] = useState("");
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => photosApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.photos });
      toast(t("progress.photoRemoved"), "ok");
    },
  });

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
    setShowForm(true);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("taken_on", takenOn);
      if (weightKg) fd.append("weight_kg", weightKg);
      if (note) fd.append("note", note);
      await photosApi.upload(fd);
      qc.invalidateQueries({ queryKey: qk.photos });
      toast(t("progress.photoSaved"), "ok");
      setShowForm(false);
      setFile(null);
      setPreview(null);
      setWeightKg("");
      setNote("");
    } catch {
      toast(t("progress.uploadError"), "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="label">{t("progress.eyebrow")}</p>
          <h1 className="text-2xl font-bold tracking-tight">{t("progress.title")}</h1>
          <p className="mt-1 text-sm text-ink-faint">{t("progress.subtitle")}</p>
        </div>
        <Button onClick={() => fileRef.current?.click()}>
          <Plus className="h-4 w-4" /> {t("progress.addPhoto")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </header>

      {/* Upload form */}
      {showForm && preview && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row">
            <img src={preview} alt="Preview" className="h-48 w-full rounded-xl object-cover sm:w-48" />
            <div className="flex-1 space-y-3">
              <Field label={t("progress.takenOn")}>
                <Input type="date" value={takenOn} max={isoDate()} onChange={(e) => setTakenOn(e.target.value)} />
              </Field>
              <Field label={t("progress.weightOptional")}>
                <Input type="number" step="0.1" min={30} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="e.g. 82.5" />
              </Field>
              <Field label={t("progress.noteOptional")}>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("progress.notePlaceholder")} />
              </Field>
              <div className="flex gap-2">
                <Button loading={uploading} onClick={upload}>
                  {t("progress.savePhoto")}
                </Button>
                <Button variant="ghost" onClick={() => { setShowForm(false); setFile(null); setPreview(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Gallery */}
      {list.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : list.data && list.data.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.data.map((photo) => (
            <div key={photo.id} className="group relative">
              <button onClick={() => setLightbox(photo.url)} className="block w-full">
                <img
                  src={photo.url}
                  alt={dayLabel(photo.taken_on)}
                  className="aspect-square w-full rounded-xl object-cover transition-opacity group-hover:opacity-90"
                />
              </button>
              <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
                <p className="text-xs font-medium text-white">{dayLabel(photo.taken_on)}</p>
                {photo.weight_kg && (
                  <p className="nums text-xs text-white/80">{photo.weight_kg} kg</p>
                )}
              </div>
              <button
                onClick={() => { if (confirm(t("progress.deleteConfirm"))) remove.mutate(photo.id); }}
                className="absolute right-2 top-2 hidden rounded-lg bg-black/50 p-1.5 text-white group-hover:block hover:bg-danger/80"
                aria-label={t("common.delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Camera className="h-7 w-7" />}
            title={t("progress.emptyTitle")}
            hint={t("progress.emptyHint")}
            action={
              <Button onClick={() => fileRef.current?.click()}>
                <ImageIcon className="h-4 w-4" /> {t("progress.addFirstPhoto")}
              </Button>
            }
          />
        </Card>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Full size" className="max-h-full max-w-full rounded-xl object-contain" />
          <button
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/80"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
