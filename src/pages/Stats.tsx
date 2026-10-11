import { useMemo } from "react";
import { Activity, CalendarCheck, Flame, Layers, TrendingUp } from "lucide-react";
import { CATEGORY_META, type Category } from "@/types";
import { useAppState } from "@/state/useStore";
import { getStats, groupByDay } from "@/state/selectors";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Progress } from "@/components/Progress";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { formatDateTime, pluralize } from "@/lib/utils";

export function Stats() {
  const state = useAppState();
  const stats = useMemo(() => getStats(state.photos, state.history), [state.photos, state.history]);
  const days = useMemo(
    () => groupByDay(state.photos.filter((photo) => photo.decidedAt)),
    [state.photos],
  );

  const categories = (Object.keys(CATEGORY_META) as Category[])
    .map((category) => ({ category, count: stats.byCategory[category] ?? 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxCategory = Math.max(1, ...categories.map((item) => item.count));
  const completion = stats.total > 0 ? Math.round((stats.decided / stats.total) * 100) : 0;

  if (state.photos.length === 0) {
    return (
      <div>
        <PageHeader
          eyebrow="Progression"
          title="Votre progression"
          description="Les statistiques apparaissent dès que vous commencez à trier."
        />
        <EmptyState
          icon={<Activity size={22} />}
          title="Aucune donnée pour l'instant"
          description="Importez des images et triez une première session pour voir vos statistiques se construire."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Progression"
        title="Votre progression"
        description="Des chiffres réels, calculés depuis vos décisions. Aucune donnée inventée."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-5">
          <CalendarCheck size={20} className="text-accent" />
          <p className="mt-3 font-display text-4xl font-semibold text-ink">{stats.todayDecided}</p>
          <p className="text-xs text-muted">Images traitées aujourd'hui</p>
        </Card>
        <Card className="p-5">
          <Flame size={20} className="text-[#c2410c]" />
          <p className="mt-3 font-display text-4xl font-semibold text-ink">{stats.streak}</p>
          <p className="text-xs text-muted">
            {stats.streak > 1 ? "Jours consécutifs" : "Jour actif"}
          </p>
        </Card>
        <Card className="p-5">
          <Layers size={20} className="text-slate-blue" />
          <p className="mt-3 font-display text-4xl font-semibold text-ink">{stats.decided}</p>
          <p className="text-xs text-muted">Décisions enregistrées</p>
        </Card>
        <Card className="p-5">
          <TrendingUp size={20} className="text-moss" />
          <p className="mt-3 font-display text-4xl font-semibold text-ink">{completion}%</p>
          <p className="text-xs text-muted">De votre bibliothèque triée</p>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">Bibliothèque</h2>
          <p className="text-sm text-muted">
            {stats.decided} / {stats.total}
          </p>
        </div>
        <Progress className="mt-4" value={stats.decided} max={Math.max(1, stats.total)} />
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Conservées", value: stats.kept, color: "#2f6b4f" },
            { label: "Classées", value: stats.collected, color: "#2f5d8a" },
            { label: "À revoir", value: stats.later, color: "#c98a1b" },
            { label: "Inutiles", value: stats.trashed, color: "#a8321f" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-surface-2 p-4">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <p className="mt-2 font-display text-2xl font-semibold text-ink">{item.value}</p>
              <p className="text-xs text-muted">{item.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl font-semibold text-ink">Par catégorie</h2>
          {categories.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Pas encore de catégorie détectée.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {categories.map((item) => {
                const meta = CATEGORY_META[item.category];
                return (
                  <li key={item.category}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-ink-soft">
                        <Icon name={meta.icon} size={15} style={{ color: meta.color }} />
                        {meta.label}
                      </span>
                      <span className="tabular-nums text-muted">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-cream-deep">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(item.count / maxCategory) * 100}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-2xl font-semibold text-ink">Activité récente</h2>
          {days.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Aucune décision enregistrée pour le moment.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {days.slice(0, 6).map((day) => (
                <li key={day.key}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                    {formatDateTime(day.photos[0]?.decidedAt ?? Date.now()).split(" · ")[0]}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {pluralize(day.photos.length, "image traitée", "images traitées")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {day.photos.slice(0, 8).map((photo) => (
                      <span
                        key={photo.id}
                        className="inline-block h-1.5 w-6 rounded-full"
                        style={{ backgroundColor: CATEGORY_META[photo.category].color }}
                        title={photo.name}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-display text-2xl font-semibold text-ink">Historique des décisions</h2>
        {state.history.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Vos actions apparaîtront ici.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {[...state.history]
              .reverse()
              .slice(0, 12)
              .map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="truncate text-ink-soft">
                    {entry.action === "revert" ? "Annulation" : "Décision"} · {entry.label}
                  </span>
                  <span className="shrink-0 text-xs text-faint">{formatDateTime(entry.at)}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      {state.photos.some((photo) => photo.source === "demo") ? (
        <p className="mt-6 text-center text-xs text-faint">
          Certaines images proviennent du jeu de démonstration. Réinitialisez-le depuis les
          paramètres pour repartir de zéro.
        </p>
      ) : null}
    </div>
  );
}
