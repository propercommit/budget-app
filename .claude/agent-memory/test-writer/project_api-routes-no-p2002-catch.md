---
name: api-routes-no-p2002-catch
description: As of 2026-06-22 the categories + spending POST routes DO catch Prisma P2002 and return a friendly 409 (this was fixed after being found absent)
metadata:
  type: project
---

`app/api/categories/route.ts` (duplicate `@@unique([userId,label])`) and `app/api/spending/route.ts` (duplicate `@@unique([userId,name,month])`) both catch a Prisma P2002 in their POST handlers and return a **409** with a friendly message ("A category with this name already exists" / "A spending item with this name already exists for this month"). They import `PrismaClientKnownRequestError` from `@prisma/client/runtime/library` and check `error instanceof PrismaClientKnownRequestError && error.code === "P2002"` — the same pattern the income route uses for `P2025` → 404.

**History / why:** This was originally absent. Commit ae1d74c ("fix: surface duplicate category errors…") claimed to add the 409 but only committed the (then-unused) `import { Prisma }` line — the catch block was never included, so the route silently returned a generic 500 from June 2026 until 2026-06-22, when it was implemented for real (both routes) and the route tests were flipped from asserting 500 to asserting 409.

**How to apply:** The 409 duplicate-error path now exists and is tested — assert 409, not 500. When mocking the rejection, construct a REAL `new PrismaClientKnownRequestError("…", { code: "P2002", clientVersion: "6" })` — a plain `Object.assign(new Error(), {code})` will NOT pass the `instanceof` check in the route. Related: [[route-handler-mocking]].
