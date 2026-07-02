/**
 * CT stub for `next/navigation`.
 *
 * Screens (`Header`, the account page) call `useRouter()` at render and invoke
 * `router.push`/`router.replace` only inside event handlers that visual tests
 * never trigger. The harness has no Next router, so we return a no-op router and
 * empty navigation primitives — enough to render, nothing that navigates.
 */
type Router = {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
};

const noopRouter: Router = {
  push: () => {},
  replace: () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
  prefetch: () => {},
};

export function useRouter(): Router {
  return noopRouter;
}

export function usePathname(): string {
  return "/";
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

export function useParams(): Record<string, string> {
  return {};
}

export function redirect(_href: string): never {
  throw new Error(`redirect(${_href}) is not supported in component tests`);
}

export function notFound(): never {
  throw new Error("notFound() is not supported in component tests");
}
