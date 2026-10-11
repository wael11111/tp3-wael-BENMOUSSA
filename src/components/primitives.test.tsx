import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/Button";
import { Progress } from "@/components/Progress";
import { CategoryBadge } from "@/components/CategoryBadge";
import { EmptyState } from "@/components/EmptyState";

describe("Button", () => {
  it("déclenche son action au clic", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Conserver</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Conserver" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("est désactivé quand demandé", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Inutile
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Inutile" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Progress", () => {
  it("expose la valeur accessible", () => {
    render(<Progress value={3} max={10} label="Progression" />);
    const bar = screen.getByRole("progressbar", { name: "Progression" });
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "10");
  });
});

describe("CategoryBadge", () => {
  it("affiche la catégorie et la confiance", () => {
    render(<CategoryBadge category="recipe" confidence={0.8} />);
    expect(screen.getByText("Recette")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("affiche titre, description et action", () => {
    render(
      <EmptyState
        title="File vide"
        description="Importez des images"
        action={<button type="button">Importer</button>}
      />,
    );
    expect(screen.getByText("File vide")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importer" })).toBeInTheDocument();
  });
});
