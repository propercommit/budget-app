# Contributing

Conventions for working on PlanBudget.

## Workflow at a glance

GitHub Flow: branch off `main`, open a pull request, let CI run, merge. Vercel
deploys `main` to production automatically.

```text
main ──┬─────────────────────────────────────────► (auto-deploys to prod)
       │
       └── feat/savings-goals ──► PR ──► CI passes ──► merge
```

Every change reaches `main` through a PR — even working alone — because the PR is
the durable record of *why* a change was made and the gate that runs CI before
anything hits production.

## Commit Messages

Format: `<type>(<scope>): <subject>`, written in the imperative mood.

```text
<type>(<scope>): <subject>

<body>
```

### Types

| Type       | When to use it                                              |
| ---------- | ----------------------------------------------------------- |
| `fix`      | A bug fix                                                   |
| `feat`     | A new feature                                               |
| `refactor` | A code change that neither fixes a bug nor adds a feature   |
| `perf`     | A change that improves performance                          |
| `test`     | Adding or fixing tests                                      |
| `docs`     | Documentation only                                          |
| `chore`    | Build, tooling, deps — no production code change            |

### Subject

- **Scope** — the area touched, in parens: `income`, `auth`, `spending`, etc.
- **Imperative mood** — complete the sentence *"If applied, this commit will…"*.
  So `reset add form state`, not `reset the form` (past), `resets` (present), or
  `resetting` (gerund). This matches Git's own generated messages ("Merge…",
  "Revert…"), so your history reads consistently.
- **Length** — ≤50 characters, lowercase, no trailing period.

### Body

The diff already shows *what* changed. The body's job is the *why* — the reasoning
and context the diff can't capture, for the reader (probably you) months later.

### Example

```text
fix(income): reset add form state on each open

The popin key only varied by income id, so the add form (constant
key 'add') reused its mounted instance between opens and kept stale
field values. A per-open counter now forces a new key each time,
remounting the form clean.
```

## Pull Requests

### Title

Use the same convention as commits — `<type>(<scope>): <subject>`. If you
squash-merge, the PR title becomes the commit subject on `main`, so matching the
formats keeps the history consistent.

The title must summarise the *whole* PR, so it depends on what's inside:

- **Single-commit PR** — reuse the commit subject; they describe the same change.
- **Multi-commit PR** — write a new subject that captures the umbrella goal, not
  any single commit's. If you can't tell what the PR did from its title alone,
  it's too narrow — zoom out to the outcome.

```text
Single:  fix(income): reset add form state on each open
Bundle:  feat(income): fix and harden add-form reset
```

### Description

The diff shows *what* changed; the description carries the context it can't. At
minimum:

- **Why** — one or two sentences on the problem this solves, not a restatement of
  the code.
- **Linked backlog item** — reference the Notion task it closes, so the PR and the
  backlog stay connected.
- **Testing** — how you verified it: tests added/updated, manual steps, or both.
- **Screenshots** — before/after for any UI change.

The repo's `.github/pull_request_template.md` pre-fills this structure into every
new PR automatically.

### Before merging

- [ ] CI passes (GitHub Actions + Vitest) — never merge a red build.
- [ ] Tests added or updated for the change.
- [ ] Previewed on the Vercel deployment (for UI or flow changes).
- [ ] Branch is up to date with `main`.

### Branching

Branch off `main`, named after the change using the commit type as a prefix:

```text
fix/income-add-reset
feat/savings-goals
```

Open the PR, let CI run, merge to `main`. Vercel deploys `main` to production
automatically.
