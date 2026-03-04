import { TEST_USER } from "./data";
import { auth } from "../lib/auth";

export async function createTestUser(): Promise<{ userId: string; email: string; name: string }> {
  console.log(`Creating test user: ${TEST_USER.email}`);

  try {
    // Use Better Auth directly to create user (no server required)
    const result = await auth.api.signUpEmail({
      body: {
        email: TEST_USER.email,
        password: TEST_USER.password,
        name: TEST_USER.name,
      },
    });

    console.log(`✓ Test user created with ID: ${result.user.id}`);
    return {
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
    };
  } catch (error: any) {
    // Check if user already exists
    if (error?.message?.includes("already exists") || error?.message?.includes("already registered")) {
      console.log(`⚠ Test user already exists`);

      // Try to sign in to get user info
      try {
        const result = await auth.api.signInEmail({
          body: {
            email: TEST_USER.email,
            password: TEST_USER.password,
          },
        });

        console.log(`✓ Found existing user with ID: ${result.user.id}`);
        return {
          userId: result.user.id,
          email: result.user.email,
          name: result.user.name,
        };
      } catch (signInError) {
        throw new Error(`User exists but failed to sign in: ${signInError}`);
      }
    }

    throw new Error(`Failed to create test user: ${error?.message || error}`);
  }
}
