import { fireEvent, render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { MetricCard } from "./metric-card";

describe("MetricCard", () => {
  it("renders as static content by default", () => {
    render(
      <MetricCard
        title="Movimiento Hoy"
        value="S/ 10.00"
        icon={FileText}
      />
    );

    expect(screen.getByText("Movimiento Hoy")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("supports an accessible click action", () => {
    const onClick = vi.fn();

    render(
      <MetricCard
        title="Movimiento Hoy"
        value="S/ 10.00"
        icon={FileText}
        onClick={onClick}
        ariaLabel="Ver movimientos de hoy"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver movimientos de hoy" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
