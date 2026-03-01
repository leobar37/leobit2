/**
 * Browser MSW Setup
 * 
 * This file sets up MSW for browser-based tests.
 * Use this for tests that need the service worker to intercept fetch requests.
 */

import { beforeAll, afterEach, afterAll } from "vitest";
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// Create MSW worker instance for browser
export const worker = setupWorker(...handlers);

export async function initWorker() {
	await worker.start({
		onUnhandledRequest: "bypass",
		serviceWorker: {
			url: "/mockServiceWorker.js",
		},
	});
}

export function cleanupWorker() {
	worker.resetHandlers();
}
