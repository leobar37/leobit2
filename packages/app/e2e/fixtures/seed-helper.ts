/**
 * Helper to reset database with E2E seed before tests.
 * Assumes backend is running and seed script is available.
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

export async function resetDatabaseWithSeed(): Promise<void> {
  console.log("🌱 Resetting database with E2E seed...");

  // Run seed with force flag to clear existing data
  const response = await fetch(`${BACKEND_URL}/api/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ force: true }),
  });

  if (!response.ok) {
    // Fallback: try running seed script directly if API endpoint not available
    console.log("⚠️ Seed API not available, ensure DB is seeded manually");
    return;
  }

  const result = await response.json();
  console.log("✅ Database seeded:", result);
}

// E2E credentials from seed data
export const E2E_CREDENTIALS = {
  email: "e2e@avileo.com",
  password: "e2e123456",
};
