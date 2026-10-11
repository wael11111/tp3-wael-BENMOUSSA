import { useMemo, useState } from "react";
import { ArrowLeft, FolderX, Pencil, Trash2 } from "lucide-react";
import { navigate, useRoute } from "@/router";
import { useAppState, useAppStore } from "@/state/useStore";
import { getCollectionPhotos } from "@/state/selectors";
import { Button } from "@/components/Button";
import { PhotoImage } from "@/components/PhotoImage";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { pluralize } from "@/lib/utils";

export function CollectionDetail() {
  const route = useRoute();
  const state = useAppState();
  const store = useAppStore();
  const toast = useToast();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");

  const collection = state.collections.find((item) => item.id === route.params.id);
  const photos = useMemo(
    () => (collection ? getCollectionPhotos(state.photos, collection.id) : []),
    [collection, state.photos],
  );

  if (!collection) {
    return (
      <EmptyState
        icon={<FolderX size={22} />}
        title="Collection introuvable"
        description="Elle a peut-être été supprimée. Retournez à la liste de vos collections."
        action={<Button onClick={() => navigate("/collections")}>Voir les collections</Button>}
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/collections")}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft size={16} />
        Collections
      </button>

      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${collection.color}1f`, color: collection.color }}
          >
            <Icon name={collection.icon} size={24} />
          </span>
          <div>
            <p className="eyebrow">
              {collection.builtin ? "Collection intégrée" : "Collection personnelle"}
            </p>
            <h1 className="font-display text-4xl font-semibold text-ink">{collection.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {pluralize(photos.length, "image classée", "images classées")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setName(collection.name);
              setRenameOpen(true);
            }}
          >
            <Pencil size={15} />
            Renommer
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={15} />
            Supprimer
          </Button>
        </div>
      </header>

      {photos.length === 0 ? (
        <EmptyState
          icon={<Icon name={collection.icon} size={22} />}
          title="Collection vide"
          description="Classez une image depuis le tri ou la recherche pour la retrouver ici. Les fichiers originaux ne sont jamais modifiés."
          action={<Button onClick={() => navigate("/sort")}>Aller au tri</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <button
                type="button"
                onClick={() => navigate(`/photo/${photo.id}`)}
                className="block aspect-square w-full"
              >
                <PhotoImage photo={photo} />
              </button>
              <div className="flex items-center justify-between gap-2 p-2.5">
                <p className="truncate text-xs font-medium text-ink-soft" title={photo.name}>
                  {photo.name}
                </p>
                <button
                  type="button"
                  aria-label={`Retirer ${photo.name} de la collection`}
                  onClick={async () => {
                    await store.removeFromCollection(photo.id);
                    toast.push("Image retirée de la collection", "info");
                  }}
                  className="rounded-full p-1.5 text-muted transition-colors hover:bg-cream-deep hover:text-accent"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Renommer la collection"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={async () => {
                await store.renameCollection(collection.id, name);
                toast.push("Collection renommée", "success");
                setRenameOpen(false);
              }}
              disabled={!name.trim()}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await store.deleteCollection(collection.id);
          toast.push("Collection supprimée. Les images restent dans votre bibliothèque.", "info");
          navigate("/collections");
        }}
        title="Supprimer cette collection ?"
        description="Les images qu'elle contient ne sont pas supprimées : elles redeviennent simplement non classées."
        confirmLabel="Supprimer"
        destructive
      />
    </div>
  );
}
