import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Photo, RecipeData } from "@/types";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { useAppState, useAppStore } from "@/state/useStore";
import { extractRecipe } from "@/lib/classify";
import { useToast } from "@/components/Toast";

interface RecipeSheetProps {
  photo: Photo | null;
  open: boolean;
  onClose: () => void;
}

function emptyRecipe(): RecipeData {
  return { title: "", ingredients: [""], steps: [""] };
}

export function RecipeSheet({ photo, open, onClose }: RecipeSheetProps) {
  const store = useAppStore();
  const state = useAppState();
  const toast = useToast();
  const [draft, setDraft] = useState<RecipeData>(emptyRecipe());

  useEffect(() => {
    if (!open || !photo) return;
    if (photo.recipe) {
      setDraft(photo.recipe);
    } else {
      const extracted = extractRecipe(photo.ocrText);
      setDraft(extracted ?? { title: photo.name.replace(/\.[a-z0-9]+$/i, ""), ingredients: [""], steps: [""] });
    }
  }, [open, photo]);

  if (!photo) return null;

  const save = async () => {
    const clean: RecipeData = {
      title: draft.title.trim() || "Recette sans titre",
      ingredients: draft.ingredients.map((item) => item.trim()).filter(Boolean),
      steps: draft.steps.map((item) => item.trim()).filter(Boolean),
    };
    await store.setRecipe(photo.id, clean);
    const recipes = state.collections.find((collection) => collection.name === "Recettes");
    if (recipes) await store.assignCollection(photo.id, recipes.id);
    toast.push("Fiche recette enregistrée", "success");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Fiche recette"
      description="Vérifiez et corrigez les informations extraites avant de les enregistrer."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save}>Enregistrer la fiche</Button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="block">
          <span className="eyebrow">Titre</span>
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            className="mt-2 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            placeholder="Nom de la recette"
          />
        </label>

        <div>
          <span className="eyebrow">Ingrédients</span>
          <div className="mt-2 space-y-2">
            {draft.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={ingredient}
                  onChange={(event) => {
                    const next = [...draft.ingredients];
                    next[index] = event.target.value;
                    setDraft({ ...draft, ingredients: next });
                  }}
                  className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm outline-none focus:border-accent"
                  placeholder="250 g de farine"
                />
                <button
                  type="button"
                  aria-label="Supprimer l'ingrédient"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      ingredients: draft.ingredients.filter((_, i) => i !== index),
                    })
                  }
                  className="rounded-lg p-2 text-muted hover:bg-cream-deep hover:text-accent"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, ingredients: [...draft.ingredients, ""] })}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent"
          >
            <Plus size={15} /> Ajouter un ingrédient
          </button>
        </div>

        <div>
          <span className="eyebrow">Étapes</span>
          <div className="mt-2 space-y-2">
            {draft.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="mt-2.5 text-xs font-semibold text-faint">{index + 1}</span>
                <textarea
                  value={step}
                  onChange={(event) => {
                    const next = [...draft.steps];
                    next[index] = event.target.value;
                    setDraft({ ...draft, steps: next });
                  }}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm outline-none focus:border-accent"
                  placeholder="Mélanger la farine et le beurre…"
                />
                <button
                  type="button"
                  aria-label="Supprimer l'étape"
                  onClick={() =>
                    setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })
                  }
                  className="rounded-lg p-2 text-muted hover:bg-cream-deep hover:text-accent"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, steps: [...draft.steps, ""] })}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent"
          >
            <Plus size={15} /> Ajouter une étape
          </button>
        </div>
      </div>
    </Modal>
  );
}
