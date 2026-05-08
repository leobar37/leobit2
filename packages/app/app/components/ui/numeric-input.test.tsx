import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { FormInput } from "../forms/form-input";
import {
  NumericInput,
  sanitizeNumericInputValue,
} from "./numeric-input";

describe("sanitizeNumericInputValue", () => {
  it("keeps only one decimal separator and respects decimal precision", () => {
    expect(
      sanitizeNumericInputValue("12a,34.56", {
        decimals: 2,
      }),
    ).toBe("12.34");
  });

  it("removes decimals entirely when decimal input is disabled", () => {
    expect(
      sanitizeNumericInputValue("10.25", {
        allowDecimal: false,
      }),
    ).toBe("1025");
  });
});

describe("NumericInput", () => {
  it("passes the sanitized value to change handlers", () => {
    const handleChange = vi.fn();

    render(<NumericInput decimals={2} onChange={handleChange} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "9a,87.65" },
    });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(
      (handleChange.mock.calls[0][0].target as HTMLInputElement).value,
    ).toBe("9.87");
  });

  it("defaults to a decimal keyboard hint", () => {
    render(<NumericInput />);

    expect(screen.getByRole("textbox").getAttribute("inputmode")).toBe(
      "decimal",
    );
  });
});

describe("FormInput", () => {
  it("keeps a reserved message row even without helper text", () => {
    function TestForm() {
      const form = useForm({ defaultValues: { amount: "" } });
      return (
        <FormProvider {...form}>
          <FormInput label="Monto" name="amount" />
        </FormProvider>
      );
    }

    const { container } = render(<TestForm />);
    const message = container.querySelector("p.min-h-5");

    expect(message).toBeTruthy();
    expect(message?.className.includes("opacity-0")).toBe(true);
  });
});
