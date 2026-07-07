import { test, expect } from "../test";
import AccountPage from "@/app/account/page";
import { Providers } from "../providers";

/**
 * The v2 account screen (single scrolling page of grouped settings sections —
 * the old profile/settings tabs are gone) and its sheets. The stubbed Supabase
 * user is an email-provider account, so the Security section (email/password
 * rows) and its sheets render (a Google user would hide them).
 *
 * All sheets are Radix dialogs that portal to <body>, outside the mounted
 * component, so those cases screenshot the whole viewport (`page`) rather than
 * the component element.
 */
test.describe("Account screen", () => {
  test("account page", async ({ mount }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await expect(component).toContainText("Preferences");

    await expect(component).toHaveScreenshot("account-page.png");
  });

  test("change-email sheet", async ({ mount, page }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await component.getByRole("button", { name: /^Email/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Change Email");

    await expect(page).toHaveScreenshot("account-modal-email.png");
  });

  test("change-password sheet", async ({ mount, page }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await component.getByRole("button", { name: /^Password/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Change Password");

    await expect(page).toHaveScreenshot("account-modal-password.png");
  });

  test("currency picker", async ({ mount, page }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await component.getByRole("button", { name: /^Currency/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Currency");

    await expect(page).toHaveScreenshot("account-modal-currency.png");
  });

  test("delete-account sheet", async ({ mount, page }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await component.getByRole("button", { name: /^Delete your account/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Delete Account");

    await expect(page).toHaveScreenshot("account-modal-delete.png");
  });

  test("logout dialog", async ({ mount, page }) => {
    const component = await mount(
      <Providers>
        <AccountPage />
      </Providers>,
    );

    await component.getByRole("button", { name: "Log Out" }).click();
    await expect(page.getByRole("dialog")).toContainText("Log out?");

    await expect(page).toHaveScreenshot("account-modal-logout.png");
  });
});
