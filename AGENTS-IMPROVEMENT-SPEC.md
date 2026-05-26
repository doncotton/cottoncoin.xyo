# AGENTS Improvement Spec

Audit of `cottoncoin.xyo` against the newly created `AGENTS.md` and general agent-readiness criteria.

---

## What's Good

| Area | Detail |
|---|---|
| Toolchain consistency | Bun is used exclusively; `package-lock.json` and `yarn.lock` are gitignored. |
| Linting coverage | Solhint + ESLint + Prettier enforced in CI and via `bun run lint`. |
| Commit discipline | `commitizen` + `cz-conventional-changelog` configured in `.czrc`. |
| Test structure | Fixture pattern (`Lock.fixture.ts`) cleanly separates setup from assertions. |
| Custom errors | `Lock.sol` uses typed custom errors (`InvalidUnlockTime`, `NotOwner`, `UnlockTimeNotReached`) instead of `require` strings. |
| Reproducible builds | `bytecodeHash: "none"` in `hardhat.config.ts` prevents metadata-hash drift. |
| CI pipeline | Lint → compile → coverage gate on every push/PR to `main`. |
| Secret hygiene | No secrets in source; `hardhat vars` used for `MNEMONIC` and `INFURA_API_KEY`. |
| `.gitignore` | Covers `artifacts/`, `cache/`, `coverage/`, `types/`, `deployments/`, `node_modules/`. |
| EditorConfig | Consistent indent/charset/EOL rules across file types. |

---

## What's Missing

### 1. No `AGENTS.md` (now fixed)
The file did not exist. Created in this session.

### 2. No `.env.example`
There is no `.env.example` or equivalent to document which environment variables are expected. Agents and new contributors have no reference for what to set up beyond reading `hardhat.config.ts` manually.

### 3. No PR template
`.github/PULL_REQUEST_TEMPLATE.md` is absent. Agents opening PRs have no checklist to follow (lint, tests, coverage, changelog entry).

### 4. No issue templates
`.github/ISSUE_TEMPLATE/` is absent. Bug reports and feature requests have no structure.

### 5. `SECURITY.md` is a placeholder
The file contains the GitHub template boilerplate with version numbers (`5.1.x`, `4.0.x`) that have no relation to this project. The vulnerability reporting section is entirely empty.

### 6. `README.md` still references the upstream template
Badges link to `paulrberg/hardhat-template` GitHub Actions and Gitpod URLs, not to `doncotton/cottoncoin.xyo`. The "Using GitPod" section references the old Gitpod (gitpod.io) rather than the Ona/Gitpod Flex environment in `.devcontainer/`.

### 7. `devcontainer.json` uses the 10 GB universal image with no automations
The dev container uses `mcr.microsoft.com/devcontainers/universal:4.0.1-noble` (≈10 GB). There is no `postCreateCommand` to run `bun install`, no `automations.yaml`, and no Hardhat-specific VS Code extensions configured. Agents and developers must manually install dependencies after container start.

### 8. No `automations.yaml`
Ona/Gitpod Flex supports `automations.yaml` for tasks (e.g., `bun install` on start) and services. None is defined.

### 9. Prettier compiler version mismatch
`.prettierrc.yml` sets `compiler: "0.8.17"` for Solidity files, but `hardhat.config.ts` compiles with `0.8.19`. This can cause formatting inconsistencies on syntax introduced between those versions.

### 10. No coverage threshold enforcement
`bun run coverage` generates a report but no minimum threshold is configured in `.solcover.js` or CI. Coverage can silently regress.

### 11. `polygon-mumbai` is deprecated
Mumbai testnet was deprecated in April 2024. The network config and `chainIds` map still reference it. Agents may attempt to deploy there and fail.

### 12. No `CHANGELOG.md`
Conventional Commits are configured but there is no changelog file and no script to generate one (e.g., `conventional-changelog-cli` or `release-it`).

### 13. `use-template.yml` workflow references missing scripts
The workflow calls `.github/scripts/rename.sh` and references `.github/FUNDING.yml` and `.github/workflows/create.yml`. None of these exist in the repo. The workflow will fail if triggered.

---

## What's Wrong

### W1. Prettier Solidity compiler version mismatch (`.prettierrc.yml`)
**File:** `.prettierrc.yml`, line `compiler: "0.8.17"`  
**Problem:** Hardhat compiles with `0.8.19`. Prettier-plugin-solidity uses the compiler version to parse syntax. A mismatch can cause formatting failures or silently incorrect output on `0.8.18`/`0.8.19` syntax.  
**Fix:** Change to `compiler: "0.8.19"`.

### W2. `SECURITY.md` contains fabricated version data
**File:** `SECURITY.md`  
**Problem:** The supported-versions table lists `5.1.x`, `5.0.x`, `4.0.x` — none of which correspond to this project (currently `1.0.0`). This is misleading and will confuse agents and contributors.  
**Fix:** Replace with accurate version data or remove the table until the project has a release history.

### W3. `use-template.yml` references non-existent files
**File:** `.github/workflows/use-template.yml`  
**Problem:** Steps reference `.github/scripts/rename.sh`, `.github/FUNDING.yml`, and `.github/workflows/create.yml`. None exist. The workflow will error on any push to a non-template repo.  
**Fix:** Either add the missing scripts or delete `use-template.yml` (it is a template-repo artifact that should have been removed on first use).

### W4. README badges point to upstream template repo
**File:** `README.md`  
**Problem:** The Gitpod badge links to `gitpod.io/#https://github.com/paulrberg/hardhat-template` and the GHA badge links to `paulrberg/hardhat-template/actions`. These are wrong for this repo.  
**Fix:** Update all badge URLs to reference `doncotton/cottoncoin.xyo`.

---

## Concrete Improvement Tasks

### Priority 1 — Correctness (breaks things or misleads)

| ID | Task | File(s) |
|---|---|---|
| P1-1 | Fix Prettier Solidity compiler version to `0.8.19` | `.prettierrc.yml` |
| P1-2 | Delete or fix `use-template.yml` (missing scripts) | `.github/workflows/use-template.yml` |
| P1-3 | Fix README badges to point to `doncotton/cottoncoin.xyo` | `README.md` |
| P1-4 | Fix `SECURITY.md` — remove fabricated version table, add real contact info | `SECURITY.md` |

### Priority 2 — Developer/Agent Experience

| ID | Task | File(s) |
|---|---|---|
| P2-1 | Add `postCreateCommand: "bun install"` to devcontainer | `.devcontainer/devcontainer.json` |
| P2-2 | Add `automations.yaml` with a `bun install` on-start task | `.gitpod/automations.yaml` or `.devcontainer/` |
| P2-3 | Add VS Code extension recommendations for Hardhat/Solidity | `.vscode/extensions.json` |
| P2-4 | Add `.env.example` documenting required Hardhat vars | `.env.example` |
| P2-5 | Add `.github/PULL_REQUEST_TEMPLATE.md` with lint/test checklist | `.github/PULL_REQUEST_TEMPLATE.md` |
| P2-6 | Remove or replace `polygon-mumbai` with an active testnet (e.g., Amoy) | `hardhat.config.ts` |

### Priority 3 — Quality Gates

| ID | Task | File(s) |
|---|---|---|
| P3-1 | Add coverage threshold to `.solcover.js` (e.g., `istanbulThresholds: { statements: 90 }`) | `.solcover.js` |
| P3-2 | Add `CHANGELOG.md` and a `release` script using `conventional-changelog-cli` | `package.json`, `CHANGELOG.md` |
| P3-3 | Add GitHub issue templates (bug report, feature request) | `.github/ISSUE_TEMPLATE/` |

---

## Implementation Notes for Agents

When implementing the above:

- **P1-1**: In `.prettierrc.yml`, change `compiler: "0.8.17"` → `compiler: "0.8.19"`. Run `bun run prettier:write` after to reformat any affected `.sol` files.
- **P1-2**: Run `git rm .github/workflows/use-template.yml` unless the intent is to keep this as a template repo. If keeping, add the missing `rename.sh` script.
- **P2-1**: Add `"postCreateCommand": "bun install"` to `.devcontainer/devcontainer.json`. The universal image already has Bun available.
- **P2-2**: Create `.gitpod/automations.yaml` with a task that runs `bun install` and optionally `bun run typechain`.
- **P2-6**: Replace `polygon-mumbai` (chain ID 80001) with `polygon-amoy` (chain ID 80002) in both `chainIds` and `networks` in `hardhat.config.ts`. Update the Infura URL pattern accordingly.
- **P3-1**: Add to `.solcover.js`:
  ```js
  istanbulThresholds: {
    statements: 90,
    branches: 80,
    functions: 90,
    lines: 90,
  },
  ```
