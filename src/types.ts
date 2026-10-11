export type Category =
  | "recipe"
  | "ticket"
  | "document"
  | "screenshot"
  | "inspiration"
  | "shopping"
  | "personal"
  | "unknown";

export type Decision = "keep" | "collection" | "later" | "trash";

export type AnalysisStatus = "idle" | "running" | "done" | "error" | "unavailable";

export interface Suggestion {
  kind: "collection" | "recipe" | "duplicate" | "similar" | "ticket";
  label: string;
  detail: string;
  collectionId: string | null;
  confidence: number;
}

export interface RecipeData {
  title: string;
  ingredients: string[];
  steps: string[];
}

export interface Photo {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  importedAt: number;
  source: "import" | "demo";
  blobKey: string;
  exactHash: string;
  perceptualHash: string;
  ocrText: string;
  ocrStatus: AnalysisStatus;
  ocrError: string | null;
  category: Category;
  categoryConfidence: number;
  categorySource: "heuristic" | "demo" | "user";
  decision: Decision | null;
  collectionId: string | null;
  decidedAt: number | null;
  demoNote: string | null;
  recipe: RecipeData | null;
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
  color: string;
  builtin: boolean;
  description: string;
  createdAt: number;
}

export interface Settings {
  sessionSize: number;
  ocrEnabled: boolean;
  autoAnalyze: boolean;
  suggestionsEnabled: boolean;
  language: "fra" | "eng";
}

export interface SessionState {
  id: string;
  startedAt: number;
  photoIds: string[];
  size: number;
}

export interface DecisionSnapshot {
  decision: Decision | null;
  collectionId: string | null;
  decidedAt: number | null;
}

export interface HistoryEntry {
  id: string;
  photoId: string;
  at: number;
  action: "decide" | "revert" | "import" | "trash-purge";
  before: DecisionSnapshot;
  after: DecisionSnapshot;
  label: string;
}

export interface StoredBlob {
  key: string;
  blob: Blob;
}

export const CATEGORY_META: Record<
  Category,
  { label: string; icon: string; color: string }
> = {
  recipe: { label: "Recette", icon: "ChefHat", color: "#c2410c" },
  ticket: { label: "Billet / réservation", icon: "Ticket", color: "#7c3aed" },
  document: { label: "Document", icon: "FileText", color: "#0369a1" },
  screenshot: { label: "Capture d'écran", icon: "Smartphone", color: "#475569" },
  inspiration: { label: "Inspiration", icon: "Quote", color: "#be185d" },
  shopping: { label: "Shopping", icon: "ShoppingBag", color: "#15803d" },
  personal: { label: "Photo personnelle", icon: "Camera", color: "#b45309" },
  unknown: { label: "Inconnu", icon: "HelpCircle", color: "#6b7280" },
};

export const DECISION_META: Record<
  Decision,
  { label: string; hint: string }
> = {
  keep: { label: "Conserver", hint: "Garde l'image dans votre bibliothèque" },
  collection: { label: "Classer", hint: "Range l'image dans une collection" },
  later: { label: "Revoir plus tard", hint: "Range dans « À revoir »" },
  trash: { label: "Inutile", hint: "Marque pour suppression" },
};

export const DEFAULT_SETTINGS: Settings = {
  sessionSize: 10,
  ocrEnabled: true,
  autoAnalyze: true,
  suggestionsEnabled: true,
  language: "fra",
};

export const SESSION_SIZE_OPTIONS = [5, 10, 15, 20] as const;
export const MAX_SESSION_SIZE = 200;

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES_PER_IMPORT = 200;
export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
