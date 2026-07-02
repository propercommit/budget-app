import { test, expect } from "@playwright/experimental-ct-react";
import AccountPage from "@/app/account/page";
import { Providers } from "../providers";

/**
 * The account screen and its four modals. The stubbed Supabase user is an
 * email-provider account, so the email/password cards and their modals render
 * (a Google user would hide them).
 *
 * The modals are Radix dialogs that portal to <body>, outside the mounted
 * component, so those cases screenshot the whole viewport (`page`) rather than
 * the component element.
 */
test.describe("Account screen", () => {
  test("profile tab", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await expect(component).toContainText("Profile Information");

    await expect(component).toHaveScreenshot("account-profile.png");
  });

  test("settings tab", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await component.getByRole("button", { name: "Settings" }).click();
    await expect(component).toContainText("Currency");

    await expect(component).toHaveScreenshot("account-settings.png");
  });

  test("change-email modal", async ({ mount, page }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await component.getByRole("button", { name: /Email Address/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Change Email");

    await expect(page).toHaveScreenshot("account-modal-email.png");
  });

  test("change-password modal", async ({ mount, page }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await component.getByRole("button", { name: /Password/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Change Password");

    await expect(page).toHaveScreenshot("account-modal-password.png");
  });

  test("delete-account modal", async ({ mount, page }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await component.getByRole("button", { name: "Delete Account" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await expect(page).toHaveScreenshot("account-modal-delete.png");
  });

  test("logout modal", async ({ mount, page }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await component.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByRole("dialog")).toContainText("Are you sure you want to logout?");

    await expect(page).toHaveScreenshot("account-modal-logout.png");
  });
});
