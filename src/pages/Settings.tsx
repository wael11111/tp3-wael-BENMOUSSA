import { useEffect, useState } from "react";
import {
  Database,
  Download,
  HardDrive,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { MAX_SESSION_SIZE, SESSION_SIZE_OPTIONS } from "@/types";
import { useAppState, useAppStore } from "@/state/useStore";
import { getStats } from "@/state/selectors";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { formatBytes, pluralize } from "@/lib/utils";
import { cn } from "@/lib/cn";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3.5">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "h-6 w-11 rounded-full transition-colors",
            checked ? "bg-accent" : "bg-line-strong",
          )}
        />
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </span>
    </label>
  );
}

export function Settings() {
  const state = useAppState();
  const store = useAppStore();
  const toast = useToast();
  const [customSize, setCustomSize] = useState(String(state.settings.sessionSize));
  const [resetOpen, setResetOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    setCustomSize(String(state.settings.sessionSize));
  }, [state.settings.sessionSize]);

  const stats = getStats(state.photos, state.history);
  const usage = state.storage;

  const exportData = async () => {
    try {
      const json = await store.exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `snapsort-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.push("Export téléchargé (métadonnées, sans les images)", "success");
    } catch {
      toast.push("L'export a échoué", "error");
    }
  };

  const applyCustomSize = () => {
    const value = Number.parseInt(customSize, 10);
    if (Number.isNaN(value) || value < 1) {
      toast.push("Entrez un nombre valide", "error");
      return;
    }
    const clamped = Math.min(value, MAX_SESSION_SIZE);
    void store.updateSettings({ sessionSize: clamped });
    toast.push(`Session réglée sur ${clamped} images`, "success");
  };

  const hasDemo = state.photos.some((photo) => photo.source === "demo");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Réglages"
        title="Paramètres"
        description="Configurez vos sessions, l'analyse locale, et gardez la main sur vos données."
      />

      <Card>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <SlidersHorizontal size={18} className="text-muted" />
          Sessions de tri
        </h2>
        <p className="mt-1 text-sm text-muted">
          Nombre d'images proposées par session. Idéal : un lot court et régulier.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SESSION_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => void store.updateSettings({ sessionSize: size })}
              className={cn(
                "h-11 min-w-[64px] rounded-2xl border px-4 text-sm font-semibold transition-colors",
                state.settings.sessionSize === size
                  ? "border-accent bg-accent text-white"
                  : "border-line-strong bg-surface text-ink-soft hover:bg-cream-deep",
              )}
            >
              {size}
            </button>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={MAX_SESSION_SIZE}
              value={customSize}
              onChange={(event) => setCustomSize(event.target.value)}
              aria-label="Nombre personnalisé"
              className="h-11 w-24 rounded-2xl border border-line-strong bg-surface px-3 text-sm outline-none focus:border-accent"
            />
            <Button variant="secondary" onClick={applyCustomSize}>
              Appliquer
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-faint">Maximum {MAX_SESSION_SIZE} par session.</p>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <Sparkles size={18} className="text-muted" />
          Analyse locale
        </h2>
        <div className="mt-2 divide-y divide-line">
          <Toggle
            checked={state.settings.ocrEnabled}
            onChange={(value) => void store.updateSettings({ ocrEnabled: value })}
            label="Reconnaissance de texte (OCR)"
            description="Lit le texte des images à la demande. Le moteur se charge uniquement quand vous l'utilisez."
          />
          <Toggle
            checked={state.settings.suggestionsEnabled}
            onChange={(value) => void store.updateSettings({ suggestionsEnabled: value })}
            label="Suggestions de classement"
            description="Propose une collection d'après la catégorie détectée et les doublons."
          />
          <Toggle
            checked={state.settings.autoAnalyze}
            onChange={(value) => void store.updateSettings({ autoAnalyze: value })}
            label="Analyse à l'import"
            description="Prépare la catégorie dès l'import (le nom et les dimensions servent de signaux)."
          />
        </div>
        <label className="mt-4 block">
          <span className="eyebrow">Langue de l'OCR</span>
          <select
            value={state.settings.language}
            onChange={(event) =>
              void store.updateSettings({ language: event.target.value as "fra" | "eng" })
            }
            className="mt-2 w-full max-w-xs rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="fra">Français</option>
            <option value="eng">Anglais</option>
          </select>
        </label>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <ShieldCheck size={18} className="text-moss" />
          Confidentialité
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
          <p>
            Vos images restent dans votre navigateur, stockées dans une base locale (IndexedDB).
            Aucune image personnelle n'est envoyée à un serveur. Il n'y a pas de compte, pas de
            traceur, pas de clé API.
          </p>
          <p>
            L'OCR s'exécute également en local, dans le navigateur. Lors du premier lancement, le
            moteur de reconnaissance peut télécharger ses fichiers de langue depuis un CDN : cela
            nécessite une connexion, puis ils sont mis en cache. Le jeu de démonstration, lui,
            fonctionne hors ligne.
          </p>
          <p>
            <strong className="text-ink-soft">Limites du stockage local :</strong> le navigateur
            peut vider ce stockage (mode navigation privée, nettoyage automatique) et impose un
            quota. SnapSort surveille ce quota et vous prévient quand il approche de la limite.
            Pensez à exporter vos métadonnées régulièrement.
          </p>
          <p>
            Supprimer une image dans SnapSort ne supprime <strong>jamais</strong> le fichier
            original de votre ordinateur : cela retire seulement la référence locale.
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <HardDrive size={18} className="text-muted" />
          Stockage
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="font-display text-2xl font-semibold text-ink">
              {usage ? formatBytes(usage.usage) : "—"}
            </p>
            <p className="text-xs text-muted">Espace utilisé</p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-ink">
              {usage ? formatBytes(usage.quota) : "—"}
            </p>
            <p className="text-xs text-muted">Quota estimé</p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-ink">{stats.total}</p>
            <p className="text-xs text-muted">Images stockées</p>
          </div>
        </div>
        {!usage ? (
          <p className="mt-3 text-xs text-faint">
            L'estimation de l'espace n'est pas disponible dans ce navigateur.
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <Database size={18} className="text-muted" />
          Vos données
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportData}>
            <Download size={16} />
            Exporter (JSON)
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              localStorage.removeItem("snapsort.onboarded");
              toast.push("L'accueil guidé réapparaîtra au prochain chargement", "info");
            }}
          >
            <RefreshCw size={16} />
            Revoir l'accueil guidé
          </Button>
          {hasDemo ? (
            <Button variant="secondary" onClick={() => setDemoOpen(true)}>
              <RotateCcw size={16} />
              Réinitialiser la démo
            </Button>
          ) : null}
          <Button variant="danger" onClick={() => setResetOpen(true)}>
            <RotateCcw size={16} />
            Tout réinitialiser
          </Button>
        </div>
        <p className="mt-3 text-xs text-faint">
          L'export contient les métadonnées, catégories, texte OCR et décisions — pas les fichiers
          image.
        </p>
      </Card>

      <ConfirmDialog
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        onConfirm={async () => {
          const removed = await store.resetDemo();
          toast.push(
            removed > 0
              ? `${pluralize(removed, "exemple supprimé", "exemples supprimés")}`
              : "Aucun exemple à supprimer",
            "info",
          );
        }}
        title="Réinitialiser la démonstration ?"
        description="Les images d'exemple seront retirées. Vos propres images importées ne sont pas touchées."
        confirmLabel="Réinitialiser la démo"
      />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={async () => {
          await store.resetAll(false);
          toast.push("Toutes les données locales ont été effacées", "success");
        }}
        title="Tout réinitialiser ?"
        description="Images, collections, décisions et historique seront définitivement supprimés de ce navigateur. Les fichiers originaux sur votre ordinateur ne sont pas affectés."
        confirmLabel="Effacer définitivement"
        destructive
      />
    </div>
  );
}
