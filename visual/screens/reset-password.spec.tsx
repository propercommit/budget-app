import { test, expect } from "../test";
import { ResetPasswordForm } from "@/app/auth/reset-password/reset-form";

/**
 * The set-new-password form (the `reset-password` page is a server component
 * that gates on a recovery cookie and renders this client form). Covers the
 * empty form and its mismatch validation error.
 */
test.describe("Reset-password form", () => {
  test("empty form", async ({ mount }) => {
    const component = await mount(<ResetPasswordForm />);

    await expect(component).toHaveScreenshot("reset-password-form.png");
  });

  test("mismatch validation error", async ({ mount }) => {
    const component = await mount(<ResetPasswordForm />);

    await component.getByLabel("New password", { exact: true }).fill("password1");
    await component.getByLabel("Confirm new password").fill("password2");
    await component.getByRole("button").click();

    await expect(component).toContainText("Passwords do not match");

    await expect(component).toHaveScreenshot("reset-password-error.png");
  });
});
