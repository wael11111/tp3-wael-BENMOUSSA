import { useState } from "react";
import { ArrowLeft, Check, Clock3, FolderPlus, ImageOff, Trash2 } from "lucide-react";
import { navigate, useRoute } from "@/router";
import { useAppState, useAppStore } from "@/state/useStore";
import { Button } from "@/components/Button";
import { PhotoImage } from "@/components/PhotoImage";
import { PhotoInsights } from "@/components/PhotoInsights";
import { CollectionPicker } from "@/components/CollectionPicker";
import { RecipeSheet } from "@/components/RecipeSheet";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";

export function PhotoDetail() {
  const route = useRoute();
  const state = useAppState();
  const store = useAppStore();
  const toast = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);

  const photo = state.photos.find((item) => item.id === route.params.id);

  if (!photo) {
    return (
      <EmptyState
        icon={<ImageOff size={22} />}
        title="Image introuvable"
        description="Elle a peut-être été retirée. Retournez à votre bibliothèque."
        action={<Button onClick={() => navigate("/collections")}>Voir les collections</Button>}
      />
    );
  }

  const collection = state.collections.find((item) => item.id === photo.collectionId);

  return (
    <div>
      <button
        type="button"
        onClick={() => window.history.back()}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
        <div>
          <div className="overflow-hidden rounded-3xl border border-line bg-[#eee7d8] shadow-[var(--shadow-card)]">
            <div className="flex max-h-[74vh] items-center justify-center">
              <PhotoImage photo={photo} contain className="max-h-[74vh] w-full" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button variant="success" size="sm" onClick={() => void store.decide(photo.id, "keep")}>
              <Check size={15} /> Conserver
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
              <FolderPlus size={15} /> Classer
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void store.decide(photo.id, "later")}>
              <Clock3 size={15} /> Plus tard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void store.decide(photo.id, "trash")}>
              <Trash2 size={15} /> Inutile
            </Button>
          </div>
        </div>

        <aside>
          <div className="rounded-3xl border border-line bg-surface p-5">
            <div className="mb-4">
              <p className="eyebrow">Image</p>
              <h1 className="mt-1 truncate font-display text-2xl font-semibold text-ink" title={photo.name}>
                {photo.name}
              </h1>
              {collection ? (
                <button
                  type="button"
                  onClick={() => navigate(`/collections/${collection.id}`)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-accent hover:text-accent"
                >
                  Dans « {collection.name} »
                </button>
              ) : (
                <p className="mt-2 text-xs text-faint">Non classée</p>
              )}
            </div>
            <PhotoInsights photo={photo} onOpenRecipe={() => setRecipeOpen(true)} />
            <div className="mt-5 border-t border-line pt-4">
              <Button
                variant="ghost"
                size="sm"
                block
                onClick={async () => {
                  await store.removePhoto(photo.id);
                  toast.push("Image retirée de SnapSort (le fichier original est intact)", "info");
                  navigate("/collections");
                }}
              >
                <Trash2 size={15} />
                Retirer de SnapSort
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <CollectionPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(collectionId) => void store.assignCollection(photo.id, collectionId)}
      />
      <RecipeSheet photo={photo} open={recipeOpen} onClose={() => setRecipeOpen(false)} />
    </div>
  );
}
