import { useEffect, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Onboarding } from "@/components/Onboarding";
import { useAppState, useAppStore } from "@/state/useStore";
import { useRoute } from "@/router";
import { Home } from "@/pages/Home";
import { Import } from "@/pages/Import";
import { Sort } from "@/pages/Sort";
import { Collections } from "@/pages/Collections";
import { CollectionDetail } from "@/pages/CollectionDetail";
import { Search } from "@/pages/Search";
import { Stats } from "@/pages/Stats";
import { Settings } from "@/pages/Settings";
import { PhotoDetail } from "@/pages/PhotoDetail";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";

const ONBOARDING_KEY = "snapsort.onboarded";

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream">
      <span className="flex h-14 w-14 animate-pulse-soft items-center justify-center rounded-2xl bg-ink text-cream">
        <Sparkles size={24} />
      </span>
      <p className="font-display text-2xl font-semibold text-ink">SnapSort</p>
      <p className="text-sm text-muted">Préparation de votre espace local…</p>
    </div>
  );
}

function CurrentPage() {
  const route = useRoute();
  switch (route.name) {
    case "home":
      return <Home />;
    case "import":
      return <Import />;
    case "sort":
      return <Sort />;
    case "collections":
      return <Collections />;
    case "collection":
      return <CollectionDetail />;
    case "search":
      return <Search />;
    case "stats":
      return <Stats />;
    case "settings":
      return <Settings />;
    case "photo":
      return <PhotoDetail />;
    default:
      return (
        <EmptyState
          title="Page introuvable"
          description="Cette adresse n'existe pas dans SnapSort."
          action={<Button onClick={() => (window.location.hash = "#/")}>Retour à l'accueil</Button>}
        />
      );
  }
}

export function App() {
  const state = useAppState();
  const store = useAppStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    void store.init();
  }, [store]);

  useEffect(() => {
    if (!state.ready) return;
    if (localStorage.getItem(ONBOARDING_KEY) !== "1") {
      setShowOnboarding(true);
    }
  }, [state.ready]);

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  };

  if (!state.ready) return <Splash />;

  return (
    <>
      <AppShell>
        {state.error ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#e6c98a] bg-gold-soft/70 px-4 py-3 text-sm text-[#7a5310]">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        ) : null}
        <CurrentPage />
      </AppShell>
      {showOnboarding ? <Onboarding onDone={finishOnboarding} /> : null}
    </>
  );
}
