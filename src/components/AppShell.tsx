import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Images,
  Layers,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Upload,
} from "lucide-react";
import type { Route } from "@/router";
import { Link, navigate, useRoute } from "@/router";
import { cn } from "@/lib/cn";
import { Button } from "@/components/Button";
import { useAppState } from "@/state/useStore";

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  match: Route["name"][];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Accueil", to: "/", icon: <Sparkles size={19} />, match: ["home"] },
  { label: "Trier", to: "/sort", icon: <Layers size={19} />, match: ["sort"] },
  {
    label: "Collections",
    to: "/collections",
    icon: <Images size={19} />,
    match: ["collections", "collection"],
  },
  { label: "Recherche", to: "/search", icon: <Search size={19} />, match: ["search", "photo"] },
  { label: "Progression", to: "/stats", icon: <BarChart3 size={19} />, match: ["stats"] },
  { label: "Paramètres", to: "/settings", icon: <SettingsIcon size={19} />, match: ["settings"] },
];

const MOBILE_ITEMS = NAV_ITEMS.filter((item) =>
  ["home", "sort", "collections", "stats", "settings"].some((name) =>
    item.match.includes(name as Route["name"]),
  ),
);

function isActive(route: Route, item: NavItem): boolean {
  return item.match.includes(route.name);
}

export function AppShell({ children }: { children: ReactNode }) {
  const route = useRoute();
  const state = useAppState();
  const [query, setQuery] = useState("");

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    navigate(`/search${query.trim() ? `/${encodeURIComponent(query.trim())}` : ""}`);
  };

  const quotaRatio =
    state.storage && state.storage.quota > 0
      ? state.storage.usage / state.storage.quota
      : 0;
  const quotaWarning = quotaRatio > 0.85;

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-line bg-surface/70 px-5 py-7 backdrop-blur lg:flex">
        <Link to="/" className="group flex items-center gap-2.5 px-2" aria-label="SnapSort, accueil">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-cream">
            <Sparkles size={18} />
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            SnapSort
          </span>
        </Link>

        <nav className="mt-9 flex flex-col gap-1" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive(route, item) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(route, item)
                  ? "bg-ink text-cream"
                  : "text-ink-soft hover:bg-cream-deep",
              )}
            >
              {item.icon}
              {item.label}
              {item.label === "Collections" && state.collections.length > 0 ? (
                <span className="ml-auto text-xs text-faint">{state.collections.length}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-line bg-cream/70 p-4">
            <p className="eyebrow">Total organisé</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">
              {state.photos.filter((photo) => photo.decision !== null).length}
            </p>
            <p className="text-xs text-muted">
              sur {state.photos.length} image{state.photos.length > 1 ? "s" : ""}
            </p>
          </div>
          <Button block onClick={() => navigate("/import")}>
            <Upload size={17} />
            Importer
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link to="/" className="flex items-center gap-2" aria-label="SnapSort, accueil">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-cream">
                <Sparkles size={16} />
              </span>
              <span className="font-display text-xl font-semibold text-ink">SnapSort</span>
            </Link>
            <form onSubmit={submitSearch} className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher"
                aria-label="Rechercher une image"
                className="h-9 w-40 rounded-full border border-line bg-surface pl-9 pr-3 text-sm outline-none transition-all focus:w-52"
              />
            </form>
          </div>
        </header>

        {quotaWarning ? (
          <div className="border-b border-[#e6c98a] bg-gold-soft px-4 py-2.5 text-center text-xs font-medium text-[#7a5310]">
            Stockage local presque plein ({Math.round(quotaRatio * 100)} %). Pensez à exporter ou
            à faire le ménage dans les doublons.
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden safe-bottom"
        aria-label="Navigation mobile"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1.5">
          {MOBILE_ITEMS.map((item) => {
            const active = isActive(route, item);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[0.68rem] font-medium transition-colors",
                  active ? "text-accent" : "text-muted",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
