import { useMemo, useState } from "react";
import { Copy, FolderPlus, Images, Sparkles, Trash2 } from "lucide-react";
import { Link, navigate } from "@/router";
import { useAppState, useAppStore } from "@/state/useStore";
import {
  getCollectionPhotos,
  getDuplicateGroups,
  getSimilarPairs,
  getTrash,
} from "@/state/selectors";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { PhotoImage } from "@/components/PhotoImage";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { pluralize } from "@/lib/utils";

export function Collections() {
  const state = useAppState();
  const store = useAppStore();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const duplicateGroups = useMemo(() => getDuplicateGroups(state.photos), [state.photos]);
  const similarPairs = useMemo(() => getSimilarPairs(state.photos), [state.photos]);
  const trash = useMemo(() => getTrash(state.photos), [state.photos]);

  const create = async () => {
    const collection = await store.createCollection(name);
    if (collection) {
      toast.push(`Collection « ${collection.name} » créée`, "success");
      setName("");
      setCreateOpen(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Bibliothèque"
        title="Collections"
        description="Vos images classées, les doublons repérés et la corbeille. Une collection ne copie jamais le fichier : elle l'organise."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <FolderPlus size={17} />
            Nouvelle collection
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.collections.map((collection) => {
          const photos = getCollectionPhotos(state.photos, collection.id);
          const cover = photos[0];
          return (
            <Link
              key={collection.id}
              to={`/collections/${collection.id}`}
              className="group overflow-hidden rounded-3xl border border-line bg-surface transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="relative aspect-[16/9] bg-cream-deep">
                {cover ? (
                  <PhotoImage photo={cover} />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ backgroundColor: `${collection.color}14`, color: collection.color }}
                  >
                    <Icon name={collection.icon} size={30} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/55 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-cream">
                      {collection.name}
                    </h2>
                    <p className="text-xs text-cream/75">
                      {pluralize(photos.length, "image", "images")}
                    </p>
                  </div>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/90"
                    style={{ color: collection.color }}
                  >
                    <Icon name={collection.icon} size={17} />
                  </span>
                </div>
              </div>
              {collection.description ? (
                <p className="px-4 py-3 text-sm text-muted">{collection.description}</p>
              ) : (
                <p className="px-4 py-3 text-sm text-faint">Collection personnelle</p>
              )}
            </Link>
          );
        })}
      </div>

      <section className="mt-12">
        <div className="mb-4 flex items-center gap-2">
          <Copy size={18} className="text-accent" />
          <h2 className="font-display text-2xl font-semibold text-ink">Doublons exacts</h2>
          <span className="rounded-full bg-cream-deep px-2 py-0.5 text-xs text-muted">
            {duplicateGroups.length}
          </span>
        </div>
        {duplicateGroups.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun doublon exact. Les empreintes SHA-256 de vos fichiers sont comparées localement.
          </p>
        ) : (
          <div className="space-y-4">
            {duplicateGroups.map((group, index) => (
              <Card key={group[0]?.exactHash ?? index} className="p-4">
                <div className="flex flex-wrap gap-3">
                  {group.map((photo) => (
                    <Link
                      key={photo.id}
                      to={`/photo/${photo.id}`}
                      className="group relative w-28 overflow-hidden rounded-2xl border border-line"
                    >
                      <div className="aspect-square">
                        <PhotoImage photo={photo} />
                      </div>
                      <span className="block truncate px-2 py-1.5 text-[0.68rem] text-muted">
                        {photo.name}
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">
                  {group.length} fichiers identiques — vous pouvez en retirer sans perdre
                  l'original.
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-plum" />
          <h2 className="font-display text-2xl font-semibold text-ink">Images similaires</h2>
          <span className="rounded-full bg-cream-deep px-2 py-0.5 text-xs text-muted">
            {similarPairs.length}
          </span>
        </div>
        {similarPairs.length === 0 ? (
          <p className="text-sm text-muted">
            Aucune ressemblance forte détectée (hash perceptuel dHash, distance ≤ 8/64).
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {similarPairs.slice(0, 12).map((pair) => (
              <Card key={`${pair.a.id}-${pair.b.id}`} className="p-3">
                <div className="flex items-center gap-3">
                  {[pair.a, pair.b].map((photo) => (
                    <Link
                      key={photo.id}
                      to={`/photo/${photo.id}`}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line"
                    >
                      <PhotoImage photo={photo} />
                    </Link>
                  ))}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{pair.a.name}</p>
                    <p className="truncate text-xs text-muted">{pair.b.name}</p>
                    <p className="mt-1 text-[0.68rem] text-faint">
                      Ressemblance · distance {pair.distance}/64
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 size={18} className="text-[#a8321f]" />
            <h2 className="font-display text-2xl font-semibold text-ink">Corbeille</h2>
            <span className="rounded-full bg-cream-deep px-2 py-0.5 text-xs text-muted">
              {trash.length}
            </span>
          </div>
          {trash.length > 0 ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                void store.emptyTrash();
                toast.push("Corbeille vidée", "success");
              }}
            >
              Vider la corbeille
            </Button>
          ) : null}
        </div>
        {trash.length === 0 ? (
          <p className="text-sm text-muted">
            La corbeille est vide. Retirer une image d'ici ne supprime jamais le fichier original
            de votre ordinateur.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
            {trash.map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-2xl border border-line">
                <div className="aspect-square opacity-70">
                  <PhotoImage photo={photo} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {state.photos.length === 0 ? (
        <EmptyState
          className="mt-12"
          icon={<Images size={22} />}
          title="Aucune image pour l'instant"
          description="Importez vos images ou chargez la démonstration pour commencer à remplir vos collections."
          action={
            <Button onClick={() => navigate("/import")}>
              <Images size={17} />
              Importer des images
            </Button>
          }
        />
      ) : null}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle collection"
        description="Donnez-lui un nom clair. Vous pourrez la renommer ou la supprimer à tout moment."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={create} disabled={!name.trim()}>
              Créer
            </Button>
          </>
        }
      >
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void create();
          }}
          placeholder="Ex. Croquis, Musique, Recettes de famille"
          className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
      </Modal>
    </div>
  );
}
