# AGENTS.md

Agent and AI assistant guidance for the `cottoncoin.xyo` Hardhat/Solidity project.

---

## Project Overview

Solidity smart-contract project built on the [paulrberg/hardhat-template](https://github.com/paulrberg/hardhat-template).

| Layer | Technology |
|---|---|
| Smart contracts | Solidity `^0.8.9`, Hardhat `^2.19` |
| TypeScript tooling | TypeScript `^5.3`, `ts-node`, TypeChain (ethers-v6) |
| Package manager | **Bun** (`bun install`, `bun run <script>`) |
| Testing | Mocha + Chai + `@nomicfoundation/hardhat-chai-matchers` |
| Linting | Solhint (Solidity), ESLint + `@typescript-eslint` (TS) |
| Formatting | Prettier + `prettier-plugin-solidity` |
| Commits | Conventional Commits via `commitizen` (`cz-conventional-changelog`) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Deployment | `hardhat-deploy` (`deploy/deploy.ts`) |

---

## Repository Layout

```
contracts/        Solidity source files
deploy/           hardhat-deploy deployment scripts
tasks/            Hardhat CLI tasks (accounts, lock)
test/             Mocha test suites (mirrors contracts/ structure)
  lock/           Lock contract tests + fixture
  types.ts        Shared TypeScript types for tests
types/            TypeChain-generated bindings (gitignored, auto-generated)
artifacts/        Compiled artifacts (gitignored)
hardhat.config.ts Main Hardhat configuration
```

---

## Essential Commands

```sh
bun install                  # Install dependencies
bun run compile              # Compile contracts
bun run typechain            # Compile + generate TypeChain bindings
bun run test                 # Run test suite
bun run coverage             # Run tests with coverage report
bun run lint                 # Lint Solidity + TypeScript + Prettier check
bun run lint:sol             # Solhint only
bun run lint:ts              # ESLint only
bun run prettier:write       # Auto-format all files
bun run clean                # Remove artifacts, cache, coverage, types
bun run deploy:contracts     # Deploy to default (hardhat) network
npx hardhat node             # Start a persistent local node (chain ID 31337, port 8545)
                             # Then deploy against it: bun run deploy:contracts --network localhost
REPORT_GAS=true bun run test # Test with gas usage report
```

---

## Hardhat Variables (Secrets)

Required at runtime (set via `bunx hardhat vars set <KEY>`):

| Variable | Purpose |
|---|---|
| `MNEMONIC` | BIP-39 mnemonic for all network accounts |
| `INFURA_API_KEY` | RPC access for Infura-hosted networks |

Optional (for contract verification):

`ETHERSCAN_API_KEY`, `ARBISCAN_API_KEY`, `SNOWTRACE_API_KEY`, `BSCSCAN_API_KEY`, `OPTIMISM_API_KEY`, `POLYGONSCAN_API_KEY`

In CI these are injected as environment variables (`HARDHAT_VAR_MNEMONIC`, `HARDHAT_VAR_INFURA_API_KEY`).

---

## Code Conventions

### Solidity
- Pragma: `>=0.8.9` (compiler locked to `0.8.19` in `hardhat.config.ts`)
- Use custom errors instead of `require` strings
- Max line length: 120 characters (Solhint enforced)
- Optimizer: enabled, 800 runs
- Bytecode hash: `none` (reproducible builds)
- Visibility must be explicit on all functions (constructors exempt)

### TypeScript
- Strict ESLint: `@typescript-eslint/recommended` + `no-floating-promises`
- Unused vars allowed only with `_` prefix
- All async Hardhat task actions must `await` or `void` promises

### Formatting
- Prettier handles `.js`, `.json`, `.md`, `.sol`, `.ts`, `.yml`
- Run `bun run prettier:write` before committing

### Commits
- Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, etc.)
- Use `git cz` or `bunx cz` to invoke commitizen interactively

---

## Adding a New Contract

1. Create `contracts/MyContract.sol` following existing style.
2. Add a deployment script `deploy/myContract.ts` using `hardhat-deploy` pattern.
3. Add tests under `test/myContract/MyContract.ts` and a fixture `MyContract.fixture.ts`.
4. Register any new Hardhat tasks in `tasks/` and import them in `hardhat.config.ts`.
5. Run `bun run typechain` to regenerate bindings.
6. Run `bun run lint && bun run test` before opening a PR.

---

## CI Pipeline

`.github/workflows/ci.yml` runs on every push/PR to `main`:

1. `bun run lint` — Solhint + ESLint + Prettier check
2. `bun run typechain` — compile + generate bindings
3. `bun run coverage` — full test suite with coverage

A `deploy` job runs after `ci` on `main` pushes and publishes the repo root to GitHub Pages (`gh-pages` branch).

---

## Networks

Configured networks in `hardhat.config.ts`:

| Name | Chain ID | Notes |
|---|---|---|
| `hardhat` | 31337 | Default in-process network |
| `localhost` | 31337 | External `hardhat node` process (`http://127.0.0.1:8545`) |
| `ganache` | 1337 | Local Ganache (`http://localhost:8545`) |
| `sepolia` | 11155111 | Infura testnet |
| `mainnet` | 1 | Infura mainnet |
| `arbitrum` | 42161 | Infura Arbitrum |
| `optimism` | 10 | Infura Optimism |
| `polygon-mainnet` | 137 | Infura Polygon |
| `polygon-mumbai` | 80001 | Infura Polygon testnet |
| `avalanche` | 43114 | Public RPC |
| `bsc` | 56 | Public RPC |

---

## What Agents Should NOT Do

- Do not commit `artifacts/`, `cache/`, `coverage/`, or `types/` — these are gitignored and auto-generated.
- Do not hardcode mnemonics or API keys in source files; use `hardhat vars`.
- Do not change the Solidity compiler version without updating both `hardhat.config.ts` and the pragma range.
- Do not use `npm` or `yarn`; this project uses **Bun**.
- Do not skip `bun run lint` before proposing a PR.
