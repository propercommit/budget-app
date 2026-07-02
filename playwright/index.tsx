// Playwright Component Testing entry point.
//
// This file is loaded once in the browser test harness before any component is
// mounted. It pulls in the app's real Tailwind stylesheet (processed by the
// project's PostCSS/Tailwind pipeline via Vite) so mounted components look
// exactly as they do in the app, then pins a deterministic font stack.
//
// `next/font` (Geist) is unavailable outside Next, so the app's
// `--font-geist-*` CSS variables are never set here. We point them at a fixed
// system sans/mono stack so screenshots stay stable across runs on the same
// machine instead of falling back to whatever the browser picks per element.
import "../app/globals.css";
import "./harness.css";
