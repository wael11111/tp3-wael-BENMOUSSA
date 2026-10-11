import { useMemo } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Images,
  Layers,
  Play,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { Link, navigate } from "@/router";
import { useAppState, useAppStore } from "@/state/useStore";
import { getSessionProgress, getStats, getUndecided } from "@/state/selectors";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Progress } from "@/components/Progress";
import { PhotoImage } from "@/components/PhotoImage";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { pluralize } from "@/lib/utils";

function StatTile({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface/80 px-4 py-3.5">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          accent ? "bg-accent-soft text-accent-deep" : "bg-cream-deep text-ink-soft"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold leading-none text-ink">{value}</p>
        <p className="truncate text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

export function Home() {
  const state = useAppState();
  const store = useAppStore();
  const toast = useToast();

  const stats = useMemo(() => getStats(state.photos, state.history), [state.photos, state.history]);
  const progress = getSessionProgress(state.photos, state.session);
  const undecided = getUndecided(state.photos);
  const recent = useMemo(
    () =>
      [...state.photos]
        .sort((a, b) => b.importedAt - a.importedAt)
        .slice(0, 5),
    [state.photos],
  );

  const hasPhotos = state.photos.length > 0;

  const startDemo = async () => {
    const report = await store.importDemo();
    if (report.added > 0) {
      toast.push(`${report.added} images de démonstration chargées`, "success");
      navigate("/sort");
    } else if (report.rejected.length > 0) {
      toast.push(report.rejected[0]?.reason ?? "Démo indisponible", "error");
    } else {
      toast.push("La démo est déjà chargée", "info");
      navigate("/sort");
    }
  };

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-rise">
          <p className="eyebrow mb-4 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            Tri intelligent · 100 % local
          </p>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl">
            Vos images méritent
            <br />
            mieux qu'un dossier
            <br />
            <span className="relative inline-block">
              « à trier »
              <span className="absolute -bottom-1 left-0 h-3 w-full rounded-full bg-accent/25" />
            </span>
            .
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
            SnapSort transforme le tri de vos captures, recettes, billets et documents en une
            petite habitude quotidienne. Un lot à la fois, au swipe, avec une analyse locale qui
            suggère la bonne collection.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {hasPhotos ? (
              <Button size="lg" onClick={() => navigate("/sort")}>
                <Play size={18} />
                Reprendre le tri
              </Button>
            ) : (
              <Button size="lg" onClick={startDemo}>
                <Sparkles size={18} />
                Essayer la démo
              </Button>
            )}
            <Button size="lg" variant="secondary" onClick={() => navigate("/import")}>
              <Upload size={18} />
              Importer mes images
            </Button>
            {!hasPhotos ? (
              <button
                type="button"
                onClick={startDemo}
                className="text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                Voir avec des exemples
              </button>
            ) : null}
          </div>
          <p className="mt-5 text-xs text-faint">
            Aucune image ne quitte votre navigateur. Pas de compte, pas de clé API.
          </p>
        </div>

        <div className="relative animate-fade">
          <div className="grid grid-cols-2 gap-4">
            {recent.length > 0 ? (
              recent.slice(0, 4).map((photo, index) => (
                <Link
                  key={photo.id}
                  to={`/photo/${photo.id}`}
                  className={`group relative block overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)] ${
                    index % 3 === 0 ? "aspect-[3/4]" : "aspect-square"
                  } ${index === 1 ? "mt-6" : ""} ${index === 3 ? "-mt-6" : ""}`}
                >
                  <PhotoImage photo={photo} />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 text-left text-xs font-medium text-cream opacity-0 transition-opacity group-hover:opacity-100">
                    {photo.name}
                  </span>
                </Link>
              ))
            ) : (
              <HeroPlaceholder />
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={<Images size={19} />}
          value={stats.total}
          label="Images importées"
        />
        <StatTile
          icon={<Layers size={19} />}
          value={stats.decided}
          label="Images traitées"
          accent
        />
        <StatTile
          icon={<CalendarCheck size={19} />}
          value={stats.todayDecided}
          label="Traitées aujourd'hui"
        />
        <StatTile
          icon={<TrendingUp size={19} />}
          value={stats.streak}
          label={stats.streak > 1 ? "Jours d'affilée" : "Jour actif"}
        />
      </section>

      {state.session && progress.total > 0 ? (
        <Card className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Session en cours</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
              {progress.complete
                ? "Session terminée, bravo !"
                : `${progress.remaining} image${progress.remaining > 1 ? "s" : ""} à trier`}
            </h2>
            <div className="mt-3 max-w-md">
              <Progress value={progress.done} max={progress.total} label="Progression de la session" />
              <p className="mt-2 text-xs text-muted">
                {progress.done} / {progress.total} traitées
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/sort")}>
            {progress.complete ? "Nouvelle session" : "Continuer"}
            <ArrowRight size={17} />
          </Button>
        </Card>
      ) : null}

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Vos collections</p>
            <h2 className="font-display text-3xl font-semibold text-ink">Rangez sans effort</h2>
          </div>
          <Link
            to="/collections"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Tout voir
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {state.collections.slice(0, 8).map((collection) => {
            const count = stats.byCollection[collection.id] ?? 0;
            return (
              <Link
                key={collection.id}
                to={`/collections/${collection.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface/80 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${collection.color}1f`, color: collection.color }}
                >
                  <Icon name={collection.icon} size={19} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{collection.name}</span>
                  <span className="block text-xs text-muted">
                    {pluralize(count, "image", "images")}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {!hasPhotos ? (
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Importez",
              body: "Glissez vos captures, recettes et documents. Les formats JPEG, PNG et WebP sont acceptés.",
            },
            {
              step: "02",
              title: "Triez au geste",
              body: "Conservez, classez, mettez de côté ou marquez comme inutile. Le clavier et le swipe fonctionnent.",
            },
            {
              step: "03",
              title: "Laissez analyser",
              body: "L'OCR local lit le texte et propose une collection. Vous gardez toujours le dernier mot.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-3xl border border-line bg-surface/70 p-6">
              <span className="font-display text-4xl font-semibold text-accent/30">{item.step}</span>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="rounded-3xl border border-line bg-ink px-6 py-8 text-cream sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/60">
              Confidentialité
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-cream">
              Tout reste dans votre navigateur.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-cream/75">
              Vos images sont stockées localement (IndexedDB). Aucun envoi serveur, aucun compte.
              Vous pouvez exporter vos métadonnées ou tout réinitialiser à tout moment.
            </p>
          </div>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 rounded-2xl bg-cream px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white"
          >
            Gérer mes données
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {undecided.length > 0 && !state.session ? (
        <p className="text-center text-sm text-muted">
          {pluralize(undecided.length, "image", "images")} en attente de tri.{" "}
          <button
            type="button"
            className="font-medium text-accent underline-offset-4 hover:underline"
            onClick={() => navigate("/sort")}
          >
            Démarrer une session
          </button>
        </p>
      ) : null}
    </div>
  );
}

function HeroPlaceholder() {
  const samples = [
    { label: "Recette", color: "#c2410c", rotate: "-3deg" },
    { label: "Billet", color: "#7c3aed", rotate: "2deg" },
    { label: "Document", color: "#0369a1", rotate: "-1.5deg" },
    { label: "Citation", color: "#be185d", rotate: "2.5deg" },
  ];
  return (
    <>
      {samples.map((sample, index) => (
        <div
          key={sample.label}
          className={`relative flex aspect-square flex-col justify-end overflow-hidden rounded-3xl border border-line p-4 shadow-[var(--shadow-card)] ${
            index % 3 === 0 ? "aspect-[3/4]" : "aspect-square"
          } ${index === 1 ? "mt-6" : ""} ${index === 3 ? "-mt-6" : ""}`}
          style={{
            backgroundColor: `${sample.color}14`,
            transform: `rotate(${sample.rotate})`,
          }}
        >
          <span className="eyebrow" style={{ color: sample.color }}>
            {sample.label}
          </span>
          <span className="mt-1 h-2 w-3/4 rounded-full bg-ink/10" />
          <span className="mt-1.5 h-2 w-1/2 rounded-full bg-ink/10" />
        </div>
      ))}
    </>
  );
}
