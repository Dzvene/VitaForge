import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CalorieRing, MacroBar } from "@/components/ui/charts";
import { Button, Badge } from "@/components/ui/primitives";
import { GuidanceList } from "@/components/coaching/coaching";
import type { GuidanceItem } from "@/lib/api/types";

describe("CalorieRing", () => {
  it("shows remaining calories when under target", () => {
    render(<CalorieRing eaten={1500} target={2000} />);
    expect(screen.getByText("Remaining")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText(/1 500 \/ 2 000 kcal/)).toBeInTheDocument();
  });

  it("flips to over-by when above target", () => {
    render(<CalorieRing eaten={2200} target={2000} />);
    expect(screen.getByText("Over by")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });
});

describe("MacroBar", () => {
  it("shows eaten/target and grams remaining", () => {
    render(<MacroBar kind="protein" label="Protein" eaten={100} target={150} />);
    expect(screen.getByText("Protein")).toBeInTheDocument();
    expect(screen.getByText("100 g")).toBeInTheDocument();
    expect(screen.getByText("50 g left")).toBeInTheDocument();
  });

  it("reports overage", () => {
    render(<MacroBar kind="fat" label="Fat" eaten={90} target={70} />);
    expect(screen.getByText("over by 20 g")).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled while loading", () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("Badge + GuidanceList", () => {
  it("renders a badge", () => {
    render(<Badge tone="ok">active</Badge>);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders guidance items", () => {
    const items: GuidanceItem[] = [
      { kind: "protein_low", message: "Add more protein" },
      { kind: "on_track", message: "Looking good" },
    ];
    render(<GuidanceList items={items} />);
    expect(screen.getByText("Add more protein")).toBeInTheDocument();
    expect(screen.getByText("Looking good")).toBeInTheDocument();
  });
});
