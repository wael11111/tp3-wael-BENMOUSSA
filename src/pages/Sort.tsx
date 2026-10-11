import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Clock3,
  FolderPlus,
  Images,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import type { Decision } from "@/types";
import { navigate } from "@/router";
import { useAppState, useAppStore } from "@/state/useStore";
import { getQueue, getSessionProgress } from "@/state/selectors";
import { Button } from "@/components/Button";
import { Progress } from "@/components/Progress";
import { EmptyState } from "@/components/EmptyState";
import { SwipeCard } from "@/components/SwipeCard";
import { PhotoInsights } from "@/components/PhotoInsights";
import { CollectionPicker } from "@/components/CollectionPicker";
import { RecipeSheet } from "@/components/RecipeSheet";
import { useToast } from "@/components/Toast";
import { pluralize } from "@/lib/utils";
import { cn } from "@/lib/cn";

export function Sort() {
  const state = useAppState();
  const store = useAppStore();
  const toast = useToast();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const acting = useRef(false);
  const ensured = useRef(false);

  const queue = useMemo(() => getQueue(state.photos, state.session), [state.photos, state.session]);
  const progress = getSessionProgress(state.photos, state.session);
  const current = queue[0];
  const next = queue[1];

  useEffect(() => {
    if (!state.ready || ensured.current) return;
    ensured.current = true;
    if (!state.session) void store.ensureSession();
  }, [state.ready, state.session, store]);

  const sessionSummary = useMemo(() => {
    if (!state.session) return null;
    const byId = new Map(state.photos.map((photo) => [photo.id, photo]));
    const summary = { keep: 0, collection: 0, later: 0, trash: 0 };
    for (const id of state.session.photoIds) {
      const photo = byId.get(id);
      if (photo?.decision) summary[photo.decision] += 1;
    }
    return summary;
  }, [state.session, state.photos]);

  const decide = useCallback(
    async (decision: Decision, collectionId: string | null = null) => {
      if (!current || acting.current) return;
      acting.current = true;
      try {
        await store.decide(current.id, decision, collectionId);
      } finally {
        acting.current = false;
      }
    },
    [current, store],
  );

  const undo = useCallback(async () => {
    if (!store.canUndo()) {
      toast.push("Rien à annuler", "info");
      return;
    }
    const done = await store.undo();
    if (done) toast.push("Dernière décision annulée", "info");
  }, [store, toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (pickerOpen || recipeOpen) return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "z") {
        event.preventDefault();
        void undo();
        return;
      }
      switch (key) {
        case "arrowright":
        case "k":
          event.preventDefault();
          void decide("keep");
          break;
        case "arrowleft":
        case "x":
          event.preventDefault();
          void decide("trash");
          break;
        case "arrowdown":
        case "l":
          event.preventDefault();
          void decide("later");
          break;
        case "c":
          event.preventDefault();
          if (current) setPickerOpen(true);
          break;
        case "u":
          event.preventDefault();
          void undo();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [decide, undo, pickerOpen, recipeOpen, current]);

  const loadDemo = async () => {
    const report = await store.importDemo();
    if (report.added > 0) toast.push(`${report.added} exemples chargés`, "success");
  };

  if (!state.ready) {
    return <div className="skeleton h-[70vh] rounded-3xl" />;
  }

  if (state.photos.length === 0) {
    return (
      <EmptyState
        icon={<Images size={22} />}
        title="Votre file est vide"
        description="Importez vos propres images ou chargez le jeu de démonstration pour découvrir le tri au swipe."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate("/import")}>
              <Upload size={17} />
              Importer des images
            </Button>
            <Button variant="secondary" onClick={loadDemo}>
              <Sparkles size={17} />
              Charger la démo
            </Button>
          </div>
        }
        className="mt-10"
      />
    );
  }

  if (progress.complete) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-moss-soft text-moss">
          <Check size={30} />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold text-ink">Session terminée</h1>
        <p className="mt-3 text-muted">
          Vous avez traité {progress.done} image{progress.done > 1 ? "s" : ""}. Prenez une
          respiration, ou lancez un nouveau lot.
        </p>
        {sessionSummary ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Conservées", value: sessionSummary.keep, color: "#2f6b4f" },
              { label: "Classées", value: sessionSummary.collection, color: "#2f5d8a" },
              { label: "À revoir", value: sessionSummary.later, color: "#c98a1b" },
              { label: "Inutiles", value: sessionSummary.trash, color: "#a8321f" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-line bg-surface p-4">
                <p className="font-display text-3xl font-semibold" style={{ color: item.color }}>
                  {item.value}
                </p>
                <p className="text-xs text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => {
              ensured.current = true;
              void store.startSession(state.settings.sessionSize);
            }}
          >
            Nouvelle session
          </Button>
          <Button variant="secondary" onClick={() => navigate("/collections")}>
            Voir mes collections
          </Button>
          <Button variant="ghost" onClick={() => navigate("/stats")}>
            Ma progression
          </Button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <EmptyState
        icon={<Check size={22} />}
        title="Tout est trié"
        description="Aucune image en attente dans cette session. Importez-en d'autres ou démarrez un nouveau lot."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={() => void store.startSession(state.settings.sessionSize)}>
              Nouvelle session
            </Button>
            <Button onClick={() => navigate("/import")}>
              <Upload size={17} />
              Importer
            </Button>
          </div>
        }
        className="mt-10"
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-cream-deep hover:text-ink"
            aria-label="Retour à l'accueil"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <p className="eyebrow">Session de tri</p>
            <p className="text-sm font-medium text-ink">
              {progress.done} / {progress.total} traitées
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={undo}
            disabled={!store.canUndo()}
            aria-label="Annuler la dernière décision"
          >
            <RotateCcw size={15} />
            Annuler
            <kbd className="ml-1 hidden rounded border border-line px-1.5 text-[0.62rem] text-faint sm:inline">
              U
            </kbd>
          </Button>
        </div>
      </div>

      <Progress
        className="mb-6"
        value={progress.done}
        max={Math.max(1, progress.total)}
        label="Progression de la session"
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)]">
        <div>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-lg select-none">
            {next ? (
              <div
                className="absolute inset-0 scale-[0.96] rounded-[1.75rem] border border-line bg-surface/70"
                aria-hidden
              />
            ) : null}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={current.id}
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0"
              >
                <SwipeCard
                  photo={current}
                  disabled={pickerOpen || recipeOpen}
                  onDecide={(decision) => void decide(decision)}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mx-auto mt-6 grid max-w-lg grid-cols-4 gap-2.5">
            <ActionButton
              label="Inutile"
              hint="←"
              tone="trash"
              icon={<Trash2 size={20} />}
              onClick={() => void decide("trash")}
            />
            <ActionButton
              label="Plus tard"
              hint="↓"
              tone="later"
              icon={<Clock3 size={20} />}
              onClick={() => void decide("later")}
            />
            <ActionButton
              label="Classer"
              hint="C"
              tone="collection"
              icon={<FolderPlus size={20} />}
              onClick={() => setPickerOpen(true)}
            />
            <ActionButton
              label="Conserver"
              hint="→"
              tone="keep"
              icon={<Check size={20} />}
              onClick={() => void decide("keep")}
            />
          </div>

          <p className="mt-4 text-center text-xs text-faint">
            Glissez la carte, cliquez les boutons, ou utilisez les raccourcis clavier.
          </p>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-3xl border border-line bg-surface p-5">
            <PhotoInsights
              photo={current}
              onOpenRecipe={() => setRecipeOpen(true)}
              onDecide={(suggestion) => {
                if (suggestion.collectionId) void decide("collection", suggestion.collectionId);
              }}
            />
          </div>
        </aside>
      </div>

      <CollectionPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(collectionId) => void decide("collection", collectionId)}
      />

      <RecipeSheet photo={current} open={recipeOpen} onClose={() => setRecipeOpen(false)} />

      {queue.length > 1 ? (
        <p className="mt-8 text-center text-xs text-faint">
          {pluralize(queue.length - 1, "image restante", "images restantes")} dans cette session
        </p>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  hint,
  icon,
  tone,
  onClick,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: "keep" | "trash" | "later" | "collection";
  onClick: () => void;
}) {
  const tones: Record<typeof tone, string> = {
    keep: "border-moss/30 text-moss hover:bg-moss-soft",
    trash: "border-[#a8321f]/25 text-[#a8321f] hover:bg-[#f7e0da]",
    later: "border-gold/30 text-[#8a5a0a] hover:bg-gold-soft",
    collection: "border-slate-blue/25 text-slate-blue hover:bg-slate-blue-soft",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl border bg-surface px-2 py-3 text-xs font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0",
        tones[tone],
      )}
    >
      {icon}
      <span>{label}</span>
      <span className="text-[0.6rem] font-normal text-faint">{hint}</span>
    </button>
  );
}
