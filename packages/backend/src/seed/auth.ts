import { auth } from "../lib/auth";
import { TEST_USER } from "./data";

export async function createTestUser(): Promise<{ userId: string; email: string; name: string }> {
  console.log(`Creating test user: ${TEST_USER.email}`);

  const port = process.env.PORT || "3000";
  const baseUrl = `http://localhost:${port}`;

  const signUpResponse = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: TEST_USER.name,
    }),
  });

  if (signUpResponse.ok) {
    const result = await signUpResponse.json();
    console.log(`✓ Test user created with ID: ${result.user.id}`);
    return {
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
    };
  }

  const errorText = await signUpResponse.text();
  if (errorText.includes("already exists") || errorText.includes("already registered")) {
    console.log(`⚠ Test user already exists, signing in...`);

    const signInResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    });

    if (!signInResponse.ok) {
      throw new Error(`Failed to sign in existing user: ${await signInResponse.text()}`);
    }

    const result = await signInResponse.json();
    console.log(`✓ Found existing user with ID: ${result.user.id}`);

    return {
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
    };
  }

  throw new Error(`Failed to create test user: ${errorText}`);
}
