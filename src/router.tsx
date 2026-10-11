import { useCallback, useSyncExternalStore, type AnchorHTMLAttributes } from "react";

export interface Route {
  name:
    | "home"
    | "import"
    | "sort"
    | "collections"
    | "collection"
    | "search"
    | "stats"
    | "settings"
    | "photo"
    | "not-found";
  params: Record<string, string>;
  path: string;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHash(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#/, "");
}

function parse(path: string): Route {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const segments = clean.split("/").filter(Boolean);
  if (segments.length === 0) return { name: "home", params: {}, path };

  const [first, second] = segments;
  switch (first) {
    case "import":
      return { name: "import", params: {}, path };
    case "sort":
      return { name: "sort", params: {}, path };
    case "collections":
      return second
        ? { name: "collection", params: { id: second }, path }
        : { name: "collections", params: {}, path };
    case "search":
      return { name: "search", params: second ? { q: decodeURIComponent(second) } : {}, path };
    case "stats":
      return { name: "stats", params: {}, path };
    case "settings":
      return { name: "settings", params: {}, path };
    case "photo":
      return second
        ? { name: "photo", params: { id: second }, path }
        : { name: "not-found", params: {}, path };
    default:
      return { name: "not-found", params: {}, path };
  }
}

let cachedHash = "";
let cachedRoute: Route = { name: "home", params: {}, path: "" };

function getSnapshot(): Route {
  const hash = getHash();
  if (hash !== cachedHash) {
    cachedHash = hash;
    cachedRoute = parse(hash);
  }
  return cachedRoute;
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function navigate(to: string): void {
  const target = to.startsWith("#") ? to : `#${to}`;
  if (window.location.hash === target) {
    getSnapshot();
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = target;
}

export function useNavigate(): (to: string) => void {
  return useCallback((to: string) => navigate(to), []);
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
}

export function Link({ to, children, ...rest }: LinkProps) {
  return (
    <a
      href={to.startsWith("#") ? to : `#${to}`}
      {...rest}
    >
      {children}
    </a>
  );
}
