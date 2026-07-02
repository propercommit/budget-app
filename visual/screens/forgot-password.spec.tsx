import { test, expect } from "@playwright/experimental-ct-react";
import ForgotPasswordPage from "@/app/auth/forgot-password/page";

/**
 * The password-reset request screen: the email form and the neutral
 * "check your email" confirmation shown after submitting (the app always shows
 * this regardless of whether the account exists, to avoid enumeration).
 */
test.describe("Forgot-password screen", () => {
  test("email request form", async ({ mount }) => {
    const component = await mount(<ForgotPasswordPage />);

    await expect(component).toContainText("Reset your password");

    await expect(component).toHaveScreenshot("forgot-password-form.png");
  });

  test("submitted confirmation", async ({ mount }) => {
    const component = await mount(<ForgotPasswordPage />);

    await component.getByLabel("Email address").fill("alex@example.com");
    await component.getByRole("button", { name: "Send reset link" }).click();
    await expect(component).toContainText("Check your email");

    await expect(component).toHaveScreenshot("forgot-password-submitted.png");
  });
});
