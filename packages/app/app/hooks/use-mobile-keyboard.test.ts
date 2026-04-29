import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	enableVirtualKeyboardOverlay,
	useMobileKeyboard,
} from "./use-mobile-keyboard";

class MockVisualViewport extends EventTarget {
	height: number;
	offsetTop: number;

	constructor(height: number, offsetTop = 0) {
		super();
		this.height = height;
		this.offsetTop = offsetTop;
	}

	setMetrics({ height, offsetTop = this.offsetTop }: { height: number; offsetTop?: number }) {
		this.height = height;
		this.offsetTop = offsetTop;
	}
}

describe("useMobileKeyboard", () => {
	const originalVisualViewport = window.visualViewport;
	const originalVirtualKeyboard = (
		navigator as Navigator & {
			virtualKeyboard?: { overlaysContent: boolean };
		}
	).virtualKeyboard;

	beforeEach(() => {
		Object.defineProperty(window, "innerHeight", {
			configurable: true,
			value: 800,
		});

		document.documentElement.style.removeProperty("--keyboard-height");
		document.documentElement.style.removeProperty("--visual-viewport-height");
		Object.defineProperty(window, "visualViewport", {
			configurable: true,
			value: undefined,
		});
		Object.defineProperty(navigator, "virtualKeyboard", {
			configurable: true,
			value: undefined,
		});
	});

	afterEach(() => {
		Object.defineProperty(window, "visualViewport", {
			configurable: true,
			value: originalVisualViewport,
		});
		Object.defineProperty(navigator, "virtualKeyboard", {
			configurable: true,
			value: originalVirtualKeyboard,
		});
		document.documentElement.style.removeProperty("--keyboard-height");
		document.documentElement.style.removeProperty("--visual-viewport-height");
	});

	it("returns safe fallback values when viewport APIs are unavailable", () => {
		const { result } = renderHook(() => useMobileKeyboard());

		expect(result.current).toEqual({
			isKeyboardLikelyVisible: false,
			keyboardHeight: 0,
			visualViewportHeight: 800,
			supportsVirtualKeyboard: false,
		});
		expect(document.documentElement.style.getPropertyValue("--keyboard-height")).toBe(
			"0px",
		);
		expect(
			document.documentElement.style.getPropertyValue("--visual-viewport-height"),
		).toBe("800px");
	});

	it("tracks visualViewport changes and updates keyboard css variables", async () => {
		const visualViewport = new MockVisualViewport(800);
		Object.defineProperty(window, "visualViewport", {
			configurable: true,
			value: visualViewport,
		});

		const { result } = renderHook(() => useMobileKeyboard());

		act(() => {
			visualViewport.setMetrics({ height: 620 });
			visualViewport.dispatchEvent(new Event("resize"));
		});

		await waitFor(() => {
			expect(result.current.keyboardHeight).toBe(180);
		});

		expect(result.current.isKeyboardLikelyVisible).toBe(true);
		expect(result.current.visualViewportHeight).toBe(620);
		expect(document.documentElement.style.getPropertyValue("--keyboard-height")).toBe(
			"180px",
		);
		expect(
			document.documentElement.style.getPropertyValue("--visual-viewport-height"),
		).toBe("620px");
	});

	it("does not enable virtual keyboard overlay by default", () => {
		const virtualKeyboard = { overlaysContent: false };
		Object.defineProperty(navigator, "virtualKeyboard", {
			configurable: true,
			value: virtualKeyboard,
		});

		const { result } = renderHook(() => useMobileKeyboard());

		expect(result.current.supportsVirtualKeyboard).toBe(true);
		expect(virtualKeyboard.overlaysContent).toBe(false);
	});

	it("enables virtual keyboard overlay only when explicitly requested", () => {
		const virtualKeyboard = { overlaysContent: false };
		Object.defineProperty(navigator, "virtualKeyboard", {
			configurable: true,
			value: virtualKeyboard,
		});

		expect(enableVirtualKeyboardOverlay()).toBe(true);
		expect(virtualKeyboard.overlaysContent).toBe(true);
	});

	it("returns false when virtual keyboard overlay is unsupported", () => {
		expect(enableVirtualKeyboardOverlay()).toBe(false);
	});

	it("can skip css variable updates when disabled", () => {
		renderHook(() => useMobileKeyboard({ updateCssVariables: false }));

		expect(document.documentElement.style.getPropertyValue("--keyboard-height")).toBe("");
		expect(
			document.documentElement.style.getPropertyValue("--visual-viewport-height"),
		).toBe("");
	});
});
