/**
 * CT stub for `next/link`.
 *
 * `next/link` pulls in Next's router runtime, which does not exist in the
 * Playwright component harness. Screens under test only need the link to render
 * as a plain anchor for the screenshot — navigation is never exercised — so we
 * forward `href` to an `<a>` and drop Next-only props.
 */
import * as React from "react";

interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string | { pathname?: string };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  children?: React.ReactNode;
}

export default function Link({
  href,
  prefetch: _prefetch,
  replace: _replace,
  scroll: _scroll,
  children,
  ...rest
}: LinkProps) {
  const resolved = typeof href === "string" ? href : (href.pathname ?? "#");

  return (
    <a href={resolved} {...rest}>
      {children}
    </a>
  );
}
