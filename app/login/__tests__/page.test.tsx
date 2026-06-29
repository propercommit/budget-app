// @vitest-environment jsdom
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Boundary mocks -------------------------------------------------------
// The page talks to exactly two boundaries: the Supabase browser client
// (`@/lib/supabase` -> `createClient()`) and `react-hot-toast`. `vi.mock`
// factories hoist above the imports, so the spies are created inside
// `vi.hoisted` and re-grabbed here. createClient() returns the same fake auth
// object every render so assertions see the calls the component made.
const { signInWithPassword, signUp, signInWithOAuth } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: { signInWithPassword, signUp, signInWithOAuth },
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import LoginPage from "@/app/login/page";
import toast from "react-hot-toast";

// Radix's Checkbox (rendered in signup mode) pulls in `react-use-size`, which
// instantiates a ResizeObserver. jsdom doesn't ship one, so provide a no-op
// stub — we never assert on element size here.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

// --- window.location / history harness ------------------------------------
// The component reads window.location.{search,origin,pathname}, writes
// window.location.href on login success, and calls history.replaceState. In
// jsdom the real Location object navigates (and throws "Not implemented") on
// href writes, so we swap in a plain object whose props are freely settable.
// `useEffect` reads location.search on mount, so each render sets it first.
const ORIGIN = "https://app.test";
const realLocation = window.location;

function mockLocation(search = "") {
  const loc = {
    origin: ORIGIN,
    pathname: "/login",
    search,
    href: `${ORIGIN}/login${search}`,
  };
  Object.defineProperty(window, "location", {
    configurable: true,
    value: loc,
  });
  return loc;
}

function renderPage(search = "") {
  const location = mockLocation(search);
  const view = render(<LoginPage />);
  return { ...view, location };
}

let replaceStateSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Sensible success defaults; individual tests override.
  signInWithPassword.mockResolvedValue({ error: null });
  signUp.mockResolvedValue({ error: null });
  signInWithOAuth.mockResolvedValue({ error: null });
  replaceStateSpy = vi
    .spyOn(window.history, "replaceState")
    .mockImplementation(() => {});
});

afterEach(() => {
  replaceStateSpy.mockRestore();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: realLocation,
  });
});

describe("LoginPage — OAuth error surfacing on mount", () => {
  it.each([
    ["auth_failed", "We couldn't complete your sign-in. Please try again."],
    ["no_code", "Sign-in was interrupted. Please try again."],
    ["access_denied", "Sign-in was cancelled."],
  ])("maps ?error=%s to its toast message", async (code, message) => {
    renderPage(`?error=${code}`);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
  });

  it("falls back to a generic message for an unknown error code", async () => {
    renderPage("?error=something_weird");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Sign-in failed. Please try again.")
    );
  });

  it("strips the error param via replaceState, dropping the query when empty", async () => {
    renderPage("?error=auth_failed");
    await waitFor(() => expect(replaceStateSpy).toHaveBeenCalled());
    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/login");
  });

  it("preserves other params when stripping the error code", async () => {
    renderPage("?error=auth_failed&redirect=%2Fdashboard");
    await waitFor(() => expect(replaceStateSpy).toHaveBeenCalled());
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/login?redirect=%2Fdashboard"
    );
  });

  it("does nothing when there is no error param", () => {
    renderPage("");
    expect(toast.error).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});

describe("LoginPage — email login (handleSubmit, login mode)", () => {
  it("signs in with the entered credentials and navigates home on success", async () => {
    const user = userEvent.setup();
    const { location } = renderPage();

    await user.type(screen.getByLabelText("Email address"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2pw");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "hunter2pw",
      })
    );
    expect(location.href).toBe("/");
  });

  it("renders the auth error message and does not navigate", async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const user = userEvent.setup();
    const { location } = renderPage();

    await user.type(screen.getByLabelText("Email address"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2pw");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid login credentials"
      )
    );
    expect(location.href).toBe(`${ORIGIN}/login`);
  });

  it("shows a generic message when the call throws", async () => {
    signInWithPassword.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email address"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2pw");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "An unexpected error occurred. Please try again."
      )
    );
  });
});

describe("LoginPage — email signup (handleSubmit, signup mode)", () => {
  // Switch into signup mode via the footer toggle and return the user-event
  // instance so callers can keep interacting.
  async function gotoSignup() {
    const user = userEvent.setup();
    const view = renderPage();
    await user.click(screen.getByRole("button", { name: "Sign up" }));
    return { user, ...view };
  }

  it("signs up with trimmed names and shows the confirmation message", async () => {
    const { user } = await gotoSignup();

    // fireEvent.change injects the surrounding whitespace verbatim so we can
    // assert the handler trims it before sending it to Supabase.
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "  John  " },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "  Doe  " },
    });
    await user.type(screen.getByLabelText("Email address"), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(signUp).toHaveBeenCalled());
    expect(signUp).toHaveBeenCalledWith({
      email: "john@example.com",
      password: "password123",
      options: { data: { first_name: "John", last_name: "Doe" } },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your email for the confirmation link!"
    );
  });

  it("surfaces a signup auth error in the alert box", async () => {
    signUp.mockResolvedValue({
      error: { message: "User already registered" },
    });
    const { user } = await gotoSignup();

    await user.type(screen.getByLabelText("First name"), "John");
    await user.type(screen.getByLabelText("Last name"), "Doe");
    await user.type(screen.getByLabelText("Email address"), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "User already registered"
      )
    );
  });
});

describe("LoginPage — signup client validation (validateSignupForm)", () => {
  // These exercise the validation branches directly through the submit
  // handler. We dispatch the form's submit event rather than clicking the
  // button so native HTML constraints (required, minLength) don't pre-empt the
  // handler — the unit under test is validateSignupForm, not the browser.
  async function fillSignup(overrides: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
  }>) {
    const defaults = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      confirmPassword: "password123",
      acceptTerms: true,
    };
    const v = { ...defaults, ...overrides };
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: v.firstName },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: v.lastName },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: v.email },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: v.password },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: v.confirmPassword },
    });
    if (v.acceptTerms) await user.click(screen.getByRole("checkbox"));

    fireEvent.submit(container.querySelector("form")!);
  }

  it("rejects a blank first name", async () => {
    await fillSignup({ firstName: "   " });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter your first name"
      )
    );
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects a blank last name", async () => {
    await fillSignup({ lastName: "" });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter your last name"
      )
    );
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    await fillSignup({
      password: "password123",
      confirmPassword: "password999",
    });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Passwords do not match"
      )
    );
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters", async () => {
    await fillSignup({ password: "short", confirmPassword: "short" });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Password must be at least 8 characters"
      )
    );
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects when terms are not accepted", async () => {
    await fillSignup({ acceptTerms: false });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please accept the Terms of Service and Privacy Policy"
      )
    );
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe("LoginPage — Google sign-in (handleGoogleSignIn)", () => {
  it("starts OAuth with the bare callback URL when no redirect is present", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalled());
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${ORIGIN}/auth/callback` },
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("appends the page's ?redirect= as ?next= on the callback URL", async () => {
    const user = userEvent.setup();
    renderPage("?redirect=/budget");

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalled());
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${ORIGIN}/auth/callback?next=%2Fbudget` },
    });
  });

  it("toasts when Supabase returns an OAuth error", async () => {
    signInWithOAuth.mockResolvedValue({ error: { message: "oauth boom" } });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to connect to Google. Please try again."
      )
    );
  });

  it("toasts when the OAuth call throws", async () => {
    signInWithOAuth.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to connect to Google. Please try again."
      )
    );
  });
});

describe("LoginPage — mode switching and resetForm", () => {
  it("reveals signup-only fields when switching to signup", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByLabelText("First name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last name")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("clears entered fields when switching modes", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Email address"), "typed@example.com");
    expect(screen.getByLabelText("Email address")).toHaveValue(
      "typed@example.com"
    );

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByLabelText("Email address")).toHaveValue("");
    expect(screen.queryByLabelText("First name")).not.toBeInTheDocument();
  });
});

describe("LoginPage — disabled states while a request is in flight", () => {
  it("disables the submit and Google buttons during login", async () => {
    // A login that never settles keeps isLoading=true so we can observe the
    // disabled state, then we resolve it to settle the act() cleanly.
    let resolveSignIn!: (v: { error: null }) => void;
    signInWithPassword.mockReturnValue(
      new Promise((r) => {
        resolveSignIn = r;
      })
    );

    const user = userEvent.setup();
    const { location } = renderPage();

    await user.type(screen.getByLabelText("Email address"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2pw");
    // Capture the elements before submitting: while loading their labels become
    // a spinner (no accessible name), but React reuses the same DOM nodes.
    const submitBtn = screen.getByRole("button", { name: "Sign in" });
    const googleBtn = screen.getByRole("button", {
      name: /continue with google/i,
    });
    await user.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(googleBtn).toBeDisabled();

    resolveSignIn({ error: null });
    await waitFor(() => expect(location.href).toBe("/"));
  });
});
