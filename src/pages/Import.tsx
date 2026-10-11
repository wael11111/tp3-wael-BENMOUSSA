import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { navigate } from "@/router";
import { useAppStore } from "@/state/useStore";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/Progress";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { validateFile } from "@/lib/image";
import { formatBytes, pluralize } from "@/lib/utils";
import { MAX_FILES_PER_IMPORT } from "@/types";
import type { ImportReport } from "@/state/store";

interface QueuedFile {
  id: string;
  file: File;
  url: string;
}

export function Import() {
  const store = useAppStore();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, name: "" });
  const [report, setReport] = useState<ImportReport | null>(null);

  useEffect(() => {
    return () => {
      queue.forEach((item) => URL.revokeObjectURL(item.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files);
      const accepted: QueuedFile[] = [];
      const problems: { name: string; reason: string }[] = [];
      const room = MAX_FILES_PER_IMPORT - queue.length;

      incoming.forEach((file, index) => {
        if (index >= room) {
          problems.push({ name: file.name, reason: "Limite de l'import atteinte" });
          return;
        }
        const validation = validateFile(file);
        if (!validation.ok) {
          problems.push({ name: file.name, reason: validation.reason });
          return;
        }
        accepted.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          url: URL.createObjectURL(file),
        });
      });

      if (problems.length > 0) setRejected((current) => [...current, ...problems]);
      if (accepted.length > 0) {
        setQueue((current) => [...current, ...accepted]);
        setReport(null);
      }
    },
    [queue.length],
  );

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files);
  };

  const removeQueued = (id: string) => {
    setQueue((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  };

  const clearQueue = () => {
    queue.forEach((item) => URL.revokeObjectURL(item.url));
    setQueue([]);
  };

  const runImport = async () => {
    if (queue.length === 0 || importing) return;
    setImporting(true);
    setProgress({ done: 0, total: queue.length, name: "" });
    try {
      const result = await store.importFiles(
        queue.map((item) => item.file),
        (done, total, name) => setProgress({ done, total, name }),
      );
      setReport(result);
      clearQueue();
      setRejected((current) => [...current, ...result.rejected]);
      if (result.added > 0) {
        toast.push(
          `${pluralize(result.added, "image importée", "images importées")}${result.duplicates > 0 ? ` · ${result.duplicates} doublon(s) détecté(s)` : ""}`,
          "success",
        );
      } else {
        toast.push("Aucune image importée", "error");
      }
    } catch (error) {
      toast.push(
        error instanceof Error ? error.message : "L'import a échoué",
        "error",
      );
    } finally {
      setImporting(false);
      setProgress({ done: 0, total: 0, name: "" });
    }
  };

  const runDemo = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const result = await store.importDemo();
      setReport(result);
      if (result.added > 0) {
        toast.push("Démo chargée : 8 exemples dont un doublon et un quasi-doublon", "success");
      } else {
        toast.push(result.rejected[0]?.reason ?? "Démo déjà chargée", "info");
      }
    } finally {
      setImporting(false);
    }
  };

  const totalSize = useMemo(
    () => queue.reduce((sum, item) => sum + item.file.size, 0),
    [queue],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Étape 1"
        title="Importer vos images"
        description="Glissez vos fichiers ici ou parcourez votre ordinateur. Tout est validé et analysé localement, sans envoi vers un serveur."
        actions={
          <Button variant="secondary" onClick={runDemo} disabled={importing}>
            <Sparkles size={17} />
            Charger la démo
          </Button>
        }
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative rounded-3xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
          dragging ? "border-accent bg-accent-soft/60" : "border-line-strong bg-surface/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
          aria-label="Sélectionner des images"
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-deep text-ink-soft">
          <Upload size={24} />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
          Déposez vos images ici
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          JPEG, PNG et WebP · jusqu'à 25 Mo par fichier et {MAX_FILES_PER_IMPORT} fichiers par
          import.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button onClick={() => inputRef.current?.click()} disabled={importing}>
            <FileImage size={17} />
            Parcourir mes fichiers
          </Button>
          <Button variant="ghost" onClick={runDemo} disabled={importing}>
            Essayer avec des exemples
          </Button>
        </div>
      </div>

      {importing ? (
        <Card className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Importation en cours…</p>
              <p className="truncate text-xs text-muted">
                {progress.name || "Préparation"}
              </p>
            </div>
            <p className="shrink-0 text-sm tabular-nums text-muted">
              {progress.done}/{progress.total}
            </p>
          </div>
          <Progress
            className="mt-3"
            value={progress.done}
            max={Math.max(1, progress.total)}
            label="Progression de l'import"
          />
        </Card>
      ) : null}

      {queue.length > 0 ? (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                File d'import
              </h2>
              <p className="text-sm text-muted">
                {pluralize(queue.length, "image prête", "images prêtes")} · {formatBytes(totalSize)}
              </p>
            </div>
            <button
              type="button"
              onClick={clearQueue}
              className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Tout retirer
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {queue.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <div className="aspect-square">
                  <img
                    src={item.url}
                    alt={item.file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink">{item.file.name}</p>
                    <p className="text-[0.68rem] text-faint">{formatBytes(item.file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQueued(item.id)}
                    aria-label={`Retirer ${item.file.name}`}
                    className="rounded-full p-1.5 text-muted transition-colors hover:bg-cream-deep hover:text-accent"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={runImport} disabled={importing}>
              <Upload size={18} />
              Importer {queue.length} image{queue.length > 1 ? "s" : ""}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/sort")}>
              Aller au tri
            </Button>
          </div>
        </section>
      ) : null}

      {report && report.added > 0 ? (
        <Card className="mt-8 border-moss/40">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 text-moss" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-ink">
                {pluralize(report.added, "image importée", "images importées")}
              </p>
              {report.duplicates > 0 ? (
                <p className="text-sm text-muted">
                  {report.duplicates} doublon(s) exact(s) détecté(s) — signalés dans le tri.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => navigate("/sort")}>Commencer le tri</Button>
                <Button variant="secondary" onClick={() => inputRef.current?.click()}>
                  Importer d'autres images
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {rejected.length > 0 ? (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
              <AlertTriangle size={18} className="text-gold" />
              {pluralize(rejected.length, "fichier ignoré", "fichiers ignorés")}
            </h2>
            <button
              type="button"
              onClick={() => setRejected([])}
              className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Masquer
            </button>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/70">
            {rejected.slice(0, 12).map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="truncate font-medium text-ink-soft">{item.name}</span>
                <span className="shrink-0 text-xs text-muted">{item.reason}</span>
              </li>
            ))}
          </ul>
          {rejected.length > 12 ? (
            <p className="mt-2 text-xs text-faint">
              et {rejected.length - 12} autre(s)…
            </p>
          ) : null}
        </section>
      ) : null}

      {queue.length === 0 && !report && rejected.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<FileImage size={22} />}
          title="Aucune image sélectionnée"
          description="Ajoutez des captures d'écran, recettes ou documents pour démarrer. Vous pouvez aussi charger le jeu de démonstration."
          action={
            <Button variant="secondary" onClick={runDemo}>
              <Sparkles size={17} />
              Charger la démo
            </Button>
          }
        />
      ) : null}

      <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-faint">
        <Trash2 size={13} />
        Retirer une image de SnapSort ne supprime jamais le fichier original de votre ordinateur.
      </p>
    </div>
  );
}
