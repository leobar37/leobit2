import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { OnboardingChecklist } from "./onboarding-checklist";

describe("OnboardingChecklist", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders actionable steps and links product creation correctly", () => {
    render(
      <MemoryRouter>
        <OnboardingChecklist hasProducts={false} hasSales={false} userName="Usuario" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Completa estos pasos para activar tu negocio")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Hacer ahora" }).getAttribute("href")).toBe("/productos/nuevo");
  });

  it("calls onCreateSale when the sale CTA is pressed", () => {
    const onCreateSale = vi.fn();

    render(
      <MemoryRouter>
        <OnboardingChecklist
          hasProducts={false}
          hasSales={false}
          userName="Usuario"
          onCreateSale={onCreateSale}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));

    expect(onCreateSale).toHaveBeenCalledTimes(1);
  });

  it("stays dismissed after reload when the user closes it", () => {
    const { unmount } = render(
      <MemoryRouter>
        <OnboardingChecklist hasProducts={false} hasSales={false} userName="Usuario" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("Cerrar checklist"));
    expect(window.localStorage.getItem("avileo:onboarding-checklist-dismissed")).toBe("true");

    unmount();

    render(
      <MemoryRouter>
        <OnboardingChecklist hasProducts={false} hasSales={false} userName="Usuario" />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Completa estos pasos para activar tu negocio")).toBeNull();
  });
});
