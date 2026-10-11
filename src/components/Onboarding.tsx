import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Layers, ScanText, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/Button";

const STEPS = [
  {
    icon: <Upload size={26} />,
    title: "Importez vos images",
    body: "Glissez vos captures, recettes, billets et documents. SnapSort accepte les JPEG, PNG et WebP, et détecte les doublons exacts.",
  },
  {
    icon: <Layers size={26} />,
    title: "Triez au geste",
    body: "Conservez, classez, mettez de côté ou marquez comme inutile. Swipe, clic ou clavier — tout fonctionne, et chaque décision est enregistrée.",
  },
  {
    icon: <ScanText size={26} />,
    title: "Laissez analyser en local",
    body: "L'OCR lit le texte dans votre navigateur et propose une catégorie. Vous corrigez d'un clic, rien ne quitte votre machine.",
  },
  {
    icon: <Sparkles size={26} />,
    title: "Prenez l'habitude",
    body: "Un petit lot chaque jour, une progression visible, des collections qui se remplissent. C'est tout.",
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-lg rounded-t-3xl bg-surface p-7 shadow-[var(--shadow-pop)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-cream">
              <Sparkles size={15} />
            </span>
            SnapSort
          </span>
          <button
            type="button"
            onClick={onDone}
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Passer
          </button>
        </div>

        <div className="mt-7 flex gap-1.5">
          {STEPS.map((_, stepIndex) => (
            <span
              key={stepIndex}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                stepIndex <= index ? "bg-accent" : "bg-cream-deep"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22 }}
            className="mt-7"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-deep">
              {step?.icon}
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold text-ink">{step?.title}</h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{step?.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-3">
          <span className="text-xs text-faint">
            Étape {index + 1} sur {STEPS.length}
          </span>
          <div className="flex gap-2">
            {index > 0 ? (
              <Button variant="ghost" onClick={() => setIndex((value) => value - 1)}>
                Précédent
              </Button>
            ) : null}
            {isLast ? (
              <Button onClick={onDone}>
                <Check size={17} />
                Commencer
              </Button>
            ) : (
              <Button onClick={() => setIndex((value) => value + 1)}>
                Suivant
                <ArrowRight size={17} />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
