import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import type { Category } from "@/types";
import { CATEGORY_META } from "@/types";
import { navigate, useRoute } from "@/router";
import { useAppState } from "@/state/useStore";
import { searchPhotos } from "@/state/selectors";
import { PageHeader } from "@/components/PageHeader";
import { PhotoImage } from "@/components/PhotoImage";
import { EmptyState } from "@/components/EmptyState";
import { CategoryBadge } from "@/components/CategoryBadge";
import { cn } from "@/lib/cn";

export function Search() {
  const route = useRoute();
  const state = useAppState();
  const [query, setQuery] = useState(route.params.q ?? "");
  const [category, setCategory] = useState<Category | "all">("all");
  const [collectionId, setCollectionId] = useState<string>("all");

  useEffect(() => {
    setQuery(route.params.q ?? "");
  }, [route.params.q]);

  const results = useMemo(() => {
    let list = searchPhotos(state.photos, state.collections, query);
    if (category !== "all") list = list.filter((photo) => photo.category === category);
    if (collectionId !== "all") {
      list = list.filter((photo) => photo.collectionId === collectionId);
    }
    return [...list].sort((a, b) => b.importedAt - a.importedAt);
  }, [state.photos, state.collections, query, category, collectionId]);

  const categories = Object.keys(CATEGORY_META) as Category[];

  return (
    <div>
      <PageHeader
        eyebrow="Retrouver une image"
        title="Recherche"
        description="Cherchez par nom de fichier, texte reconnu par l'OCR, catégorie ou collection."
      />

      <div className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
        <div className="relative">
          <SearchIcon
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") navigate(`/search/${encodeURIComponent(query.trim())}`);
            }}
            placeholder="Ex. tarte, facture, billet, Paris…"
            aria-label="Rechercher"
            className="h-12 w-full rounded-2xl border border-line bg-surface-2 pl-11 pr-4 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <SlidersHorizontal size={14} /> Filtres
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as Category | "all")}
            aria-label="Filtrer par catégorie"
            className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {CATEGORY_META[item].label}
              </option>
            ))}
          </select>
          <select
            value={collectionId}
            onChange={(event) => setCollectionId(event.target.value)}
            aria-label="Filtrer par collection"
            className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="all">Toutes les collections</option>
            {state.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
          {(category !== "all" || collectionId !== "all" || query) ? (
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setCollectionId("all");
                setQuery("");
                navigate("/search");
              }}
              className="text-xs font-medium text-accent underline-offset-4 hover:underline"
            >
              Réinitialiser
            </button>
          ) : null}
          <span className="ml-auto text-xs text-muted">
            {results.length} résultat{results.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="mt-8">
        {state.photos.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={22} />}
            title="Rien à chercher pour l'instant"
            description="Importez quelques images : leurs noms, leur catégorie et le texte OCR deviennent aussitôt recherchables."
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={22} />}
            title="Aucun résultat"
            description="Essayez un autre mot-clé, ou réinitialisez les filtres. L'OCR doit avoir été lancé pour chercher dans le texte."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => navigate(`/photo/${photo.id}`)}
                className={cn(
                  "group overflow-hidden rounded-2xl border border-line bg-surface text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
                )}
              >
                <div className="relative aspect-square">
                  <PhotoImage photo={photo} />
                  <div className="absolute left-2 top-2">
                    <CategoryBadge
                      category={photo.category}
                      confidence={photo.categoryConfidence}
                      showLabel={false}
                    />
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-xs font-medium text-ink-soft">{photo.name}</p>
                  {photo.ocrText ? (
                    <p className="mt-0.5 line-clamp-2 text-[0.68rem] text-faint">
                      {photo.ocrText.slice(0, 80)}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[0.68rem] text-faint">
                      {photo.ocrStatus === "done" ? "Aucun texte" : "Non analysé"}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
