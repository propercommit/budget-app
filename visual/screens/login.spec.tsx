import { test, expect } from "@playwright/experimental-ct-react";
import LoginPage from "@/app/login/page";

/**
 * The unauthenticated login screen: email/password + Google, plus the sign-up
 * variant reached from the footer toggle and its client-side validation error.
 */
test.describe("Login screen", () => {
  test("sign-in mode", async ({ mount }) => {
    const component = await mount(<LoginPage />);

    await expect(component).toContainText("Welcome back");

    await expect(component).toHaveScreenshot("login-signin.png");
  });

  test("sign-up mode", async ({ mount }) => {
    const component = await mount(<LoginPage />);

    await component.getByRole("button", { name: "Sign up" }).click();
    await expect(component).toContainText("Create account");

    await expect(component).toHaveScreenshot("login-signup.png");
  });

  test("sign-up mode with validation error", async ({ mount }) => {
    const component = await mount(<LoginPage />);

    await component.getByRole("button", { name: "Sign up" }).click();
    await component.getByLabel("First name").fill("Alex");
    await component.getByLabel("Last name").fill("Morgan");
    await component.getByLabel("Email address").fill("alex@example.com");
    await component.getByLabel("Password", { exact: true }).fill("password1");
    await component.getByLabel("Confirm password").fill("password2");
    await component.getByRole("button", { name: "Create account" }).click();

    await expect(component).toContainText("Passwords do not match");

    await expect(component).toHaveScreenshot("login-signup-error.png");
  });
});
