import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useAppState, useAppStore } from "@/state/useStore";
import { useToast } from "@/components/Toast";

interface CollectionPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (collectionId: string) => void;
  title?: string;
}

export function CollectionPicker({ open, onClose, onPick, title }: CollectionPickerProps) {
  const state = useAppState();
  const store = useAppStore();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const createAndPick = async () => {
    const collection = await store.createCollection(name);
    if (collection) {
      toast.push(`Collection « ${collection.name} » créée`, "success");
      setName("");
      setCreating(false);
      onPick(collection.id);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? "Classer dans une collection"}
      description="Choisissez une collection existante ou créez-en une nouvelle."
      size="md"
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {state.collections.map((collection) => (
          <button
            key={collection.id}
            type="button"
            onClick={() => {
              onPick(collection.id);
              onClose();
            }}
            className="flex flex-col items-start gap-2.5 rounded-2xl border border-line bg-surface-2 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-[var(--shadow-card)]"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${collection.color}1f`, color: collection.color }}
            >
              <Icon name={collection.icon} size={17} />
            </span>
            <span className="text-sm font-medium text-ink">{collection.name}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreating((value) => !value)}
          className="flex flex-col items-start gap-2.5 rounded-2xl border border-dashed border-line-strong p-3.5 text-left transition-colors hover:border-accent hover:text-accent"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream-deep text-ink-soft">
            <Plus size={17} />
          </span>
          <span className="text-sm font-medium">Nouvelle</span>
        </button>
      </div>

      {creating ? (
        <div className="mt-4 flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void createAndPick();
            }}
            placeholder="Nom de la collection"
            className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
          <Button onClick={createAndPick} disabled={!name.trim()}>
            Créer
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
