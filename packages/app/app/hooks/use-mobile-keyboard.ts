import { useEffect, useState } from "react";

const KEYBOARD_VISIBILITY_THRESHOLD = 120;

type VisualViewportLike = Pick<
	VisualViewport,
	"height" | "offsetTop" | "addEventListener" | "removeEventListener"
>;

interface VirtualKeyboardLike {
	overlaysContent: boolean;
}

interface KeyboardState {
	isKeyboardLikelyVisible: boolean;
	keyboardHeight: number;
	visualViewportHeight: number;
	supportsVirtualKeyboard: boolean;
}

interface UseMobileKeyboardOptions {
	updateCssVariables?: boolean;
}

function getVisualViewport(): VisualViewportLike | null {
	if (typeof window === "undefined") {
		return null;
	}

	return window.visualViewport ?? null;
}

function getVirtualKeyboard(): VirtualKeyboardLike | null {
	if (typeof navigator === "undefined") {
		return null;
	}

	return (navigator as Navigator & { virtualKeyboard?: VirtualKeyboardLike }).virtualKeyboard ?? null;
}

function getViewportHeightFallback() {
	if (typeof window === "undefined") {
		return 0;
	}

	return window.innerHeight;
}

function roundViewportValue(value: number) {
	return Math.round(value);
}

function computeKeyboardState(): KeyboardState {
	const visualViewport = getVisualViewport();
	const layoutViewportHeight = getViewportHeightFallback();
	const visualViewportHeight = roundViewportValue(
		visualViewport?.height ?? layoutViewportHeight,
	);
	const offsetTop = roundViewportValue(visualViewport?.offsetTop ?? 0);
	const keyboardHeight = Math.max(
		0,
		roundViewportValue(layoutViewportHeight - visualViewportHeight - offsetTop),
	);
	const supportsVirtualKeyboard = getVirtualKeyboard() !== null;

	return {
		isKeyboardLikelyVisible: keyboardHeight >= KEYBOARD_VISIBILITY_THRESHOLD,
		keyboardHeight,
		visualViewportHeight,
		supportsVirtualKeyboard,
	};
}

function applyViewportCssVariables(state: KeyboardState, enabled: boolean) {
	if (!enabled || typeof document === "undefined") {
		return;
	}

	const root = document.documentElement;
	root.style.setProperty("--keyboard-height", `${state.keyboardHeight}px`);
	root.style.setProperty("--visual-viewport-height", `${state.visualViewportHeight}px`);
}

function clearViewportCssVariables(enabled: boolean) {
	if (!enabled || typeof document === "undefined") {
		return;
	}

	const root = document.documentElement;
	root.style.removeProperty("--keyboard-height");
	root.style.removeProperty("--visual-viewport-height");
}

export function enableVirtualKeyboardOverlay() {
	const virtualKeyboard = getVirtualKeyboard();

	if (!virtualKeyboard) {
		return false;
	}

	virtualKeyboard.overlaysContent = true;
	return true;
}

export function useMobileKeyboard(
	options: UseMobileKeyboardOptions = {},
): KeyboardState {
	const { updateCssVariables = true } = options;
	const [state, setState] = useState<KeyboardState>(() => {
		const initialState = computeKeyboardState();
		applyViewportCssVariables(initialState, updateCssVariables);
		return initialState;
	});

	useEffect(() => {
		const visualViewport = getVisualViewport();
		let frameId = 0;

		const syncState = () => {
			frameId = 0;
			const nextState = computeKeyboardState();

			setState((previousState) => {
				if (
					previousState.isKeyboardLikelyVisible === nextState.isKeyboardLikelyVisible &&
					previousState.keyboardHeight === nextState.keyboardHeight &&
					previousState.visualViewportHeight === nextState.visualViewportHeight &&
					previousState.supportsVirtualKeyboard === nextState.supportsVirtualKeyboard
				) {
					applyViewportCssVariables(previousState, updateCssVariables);
					return previousState;
				}

				applyViewportCssVariables(nextState, updateCssVariables);
				return nextState;
			});
		};

		const scheduleSync = () => {
			if (frameId !== 0 || typeof window === "undefined") {
				return;
			}

			frameId = window.requestAnimationFrame(syncState);
		};

		scheduleSync();
		window.addEventListener("resize", scheduleSync);
		visualViewport?.addEventListener("resize", scheduleSync);
		visualViewport?.addEventListener("scroll", scheduleSync);

		return () => {
			window.removeEventListener("resize", scheduleSync);
			visualViewport?.removeEventListener("resize", scheduleSync);
			visualViewport?.removeEventListener("scroll", scheduleSync);

			if (frameId !== 0) {
				window.cancelAnimationFrame(frameId);
			}

			clearViewportCssVariables(updateCssVariables);
		};
	}, [updateCssVariables]);

	return state;
}
