import { useMemo, useState } from "react";
import {
  BookOpen,
  Copy,
  Image as ImageIcon,
  Loader2,
  ScanText,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { Category, Photo, Suggestion } from "@/types";
import { CATEGORY_META } from "@/types";
import { Button } from "@/components/Button";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Link } from "@/router";
import { useAppState, useAppStore } from "@/state/useStore";
import { getSuggestions } from "@/state/selectors";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/cn";

const CATEGORIES: Category[] = [
  "recipe",
  "ticket",
  "document",
  "screenshot",
  "inspiration",
  "shopping",
  "personal",
  "unknown",
];

function Section({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PhotoInsights({
  photo,
  onOpenRecipe,
  onDecide,
}: {
  photo: Photo;
  onOpenRecipe: () => void;
  onDecide?: (suggestion: Suggestion) => void;
}) {
  const state = useAppState();
  const store = useAppStore();
  const [ocrProgress, setOcrProgress] = useState<{ value: number; status: string } | null>(null);

  const suggestions = useMemo(
    () => getSuggestions(photo, state.photos, state.collections),
    [photo, state.photos, state.collections],
  );

  const runAnalysis = async () => {
    setOcrProgress({ value: 0, status: "Initialisation" });
    await store.analyzePhoto(photo.id, (value, status) => {
      setOcrProgress({ value, status });
    });
    setOcrProgress(null);
  };

  return (
    <div className="space-y-5">
      {photo.demoNote ? (
        <p className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold-soft/70 px-3 py-2 text-xs text-[#7a5310]">
          <Sparkles size={14} className="mt-0.5 shrink-0" />
          {photo.demoNote}
        </p>
      ) : null}

      <Section title="Détails" icon={<ImageIcon size={15} className="text-muted" />}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="min-w-0">
            <dt className="text-xs text-faint">Nom</dt>
            <dd className="truncate font-medium text-ink-soft" title={photo.name}>
              {photo.name}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Dimensions</dt>
            <dd className="font-medium text-ink-soft">
              {photo.width} × {photo.height}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-faint">Poids</dt>
            <dd className="font-medium text-ink-soft">{formatBytes(photo.size)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-faint">Importé le</dt>
            <dd className="truncate font-medium text-ink-soft">
              {formatDateTime(photo.importedAt)}
            </dd>
          </div>
        </dl>
      </Section>

      <Section
        title="Catégorie"
        icon={<Wand2 size={15} className="text-muted" />}
        action={<CategoryBadge category={photo.category} confidence={photo.categoryConfidence} />}
      >
        <label className="block">
          <span className="sr-only">Corriger la catégorie</span>
          <select
            value={photo.category}
            onChange={(event) => store.setCategory(photo.id, event.target.value as Category)}
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_META[category].label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-muted">
          {photo.categorySource === "user"
            ? "Catégorie corrigée manuellement."
            : photo.categorySource === "demo"
              ? "Catégorie fournie par le jeu de démonstration."
              : photo.category === "unknown"
                ? "Aucune catégorie fiable détectée pour l'instant."
                : `Suggestion heuristique (confiance ${Math.round(photo.categoryConfidence * 100)} %).`}
        </p>
      </Section>

      <Section
        title="Texte reconnu (OCR)"
        icon={<ScanText size={15} className="text-muted" />}
        action={
          photo.ocrStatus === "done" ? (
            <span className="text-xs font-medium text-moss">Analysé</span>
          ) : null
        }
      >
        {photo.ocrStatus === "idle" ? (
          <div className="space-y-3">
            {state.settings.ocrEnabled ? (
              <Button size="sm" variant="secondary" onClick={runAnalysis}>
                <ScanText size={15} />
                Analyser le texte
              </Button>
            ) : (
              <p className="text-xs text-muted">
                L'OCR est désactivé dans les paramètres.
              </p>
            )}
          </div>
        ) : null}

        {photo.ocrStatus === "running" || ocrProgress ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader2 size={14} className="animate-spin" />
              {ocrProgress?.status ?? "Lecture en cours"}…
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-cream-deep">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.round((ocrProgress?.value ?? 0.1) * 100)}%` }}
              />
            </div>
            <p className="text-[0.68rem] text-faint">
              Le moteur OCR se charge à la demande. Un long texte peut prendre quelques secondes.
            </p>
          </div>
        ) : null}

        {photo.ocrStatus === "done" ? (
          photo.ocrText ? (
            <div className="max-h-48 overflow-auto rounded-xl border border-line bg-surface-2 p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-soft">
                {photo.ocrText}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Aucun texte détecté dans cette image.
            </p>
          )
        ) : null}

        {photo.ocrStatus === "error" ? (
          <div className="space-y-2">
            <p className="text-xs text-[#9a3412]">
              {photo.ocrError ?? "L'analyse a échoué."}
            </p>
            <Button size="sm" variant="secondary" onClick={runAnalysis}>
              Réessayer
            </Button>
          </div>
        ) : null}
      </Section>

      <Section
        title="Suggestions"
        icon={<Sparkles size={15} className="text-muted" />}
      >
        {!state.settings.suggestionsEnabled ? (
          <p className="text-xs text-muted">Les suggestions sont désactivées dans les paramètres.</p>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-muted">
            Aucune suggestion pour cette image. C'est normal pour une photo sans texte.
          </p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.kind}-${index}`}
                className="rounded-xl border border-line bg-surface-2 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {suggestion.kind === "duplicate" ? (
                        <Copy size={14} className="text-accent" />
                      ) : suggestion.kind === "recipe" ? (
                        <BookOpen size={14} className="text-accent" />
                      ) : null}
                      {suggestion.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{suggestion.detail}</p>
                  </div>
                  <span className="shrink-0 text-[0.68rem] tabular-nums text-faint">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                </div>
                <div className="mt-2.5 flex gap-2">
                  {suggestion.kind === "recipe" ? (
                    <Button size="sm" variant="secondary" onClick={onOpenRecipe}>
                      Ouvrir la fiche
                    </Button>
                  ) : null}
                  {suggestion.kind === "collection" && suggestion.collectionId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (onDecide) onDecide(suggestion);
                        else store.assignCollection(photo.id, suggestion.collectionId as string);
                      }}
                    >
                      Classer
                    </Button>
                  ) : null}
                  {suggestion.kind === "duplicate" || suggestion.kind === "similar" ? (
                    <Link
                      to={`/search`}
                      className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-accent hover:bg-accent-soft"
                    >
                      Comparer
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {photo.recipe ? (
        <Section title="Fiche recette" icon={<BookOpen size={15} className="text-muted" />}>
          <button
            type="button"
            onClick={onOpenRecipe}
            className={cn(
              "w-full rounded-xl border border-line bg-surface-2 p-3 text-left transition-colors hover:border-accent",
            )}
          >
            <p className="text-sm font-semibold text-ink">{photo.recipe.title}</p>
            <p className="mt-1 text-xs text-muted">
              {photo.recipe.ingredients.length} ingrédient(s) · {photo.recipe.steps.length} étape(s)
            </p>
          </button>
        </Section>
      ) : null}
    </div>
  );
}
