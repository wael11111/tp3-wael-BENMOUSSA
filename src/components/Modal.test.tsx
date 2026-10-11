import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";

describe("Modal", () => {
  it("ne rend rien quand fermé", () => {
    render(
      <Modal open={false} onClose={() => undefined} title="Caché">
        contenu
      </Modal>,
    );
    expect(screen.queryByText("contenu")).not.toBeInTheDocument();
  });

  it("affiche le contenu et ferme au clic sur le bouton", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titre">
        contenu
      </Modal>,
    );
    expect(screen.getByText("contenu")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fermer la fenêtre" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("ferme avec la touche Échap", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titre">
        contenu
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ConfirmDialog", () => {
  it("confirme l'action puis se ferme", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Supprimer ?"
        confirmLabel="Oui"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Oui" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
  });
});
