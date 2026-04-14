# Provably Fair Plinko Game

A visually rich, highly deterministic Plinko simulation backed by a strict cryptographic commit-reveal protocol.

## Features

* **Provable Fairness:** Fully verifiable commit-reveal scheme with `SHA256` hashing and a deterministic `XorShift32` PRNG.
* **Canvas Frontend:** Beautiful rendering with glowing bins, responsive peg generation, customized Web Audio API synthesis (no files, built-in), and programmatic win confetti.
* **Granular Replay Verifier:** Dedicated offline-ready `/verify` interface rendering step-by-step path retracing overlaying the physics logic perfectly.
* **Accessibility:** Automatic "reduced-motion" graceful degradation to instant resolutions.
* **Easter Eggs:** Press `T` to toggle a vintage arcade format (board visual tilt), or type `opensesame` sequentially to toggle the fiery Dungeon Theme!

---

## Architecture Overview

**Frontend:** Next.js 14 (App Router) + React + Raw Canvas API   
**Backend:** Next.js API Routes (`/api/rounds`)   
**Database:** Prisma ORM with SQLite (schema configured for edge deployment via PostgreSQL easily)   
**Engine Layer:** Pure deterministic math logic split cleanly under `/lib/engine/plinko.ts`  

* `POST /api/rounds/commit`: Creates a round, rolls `serverSeed` and `nonce`, returns the `commitHex`.
* `POST /api/rounds/:id/start`: Uses the `clientSeed` to establish the final `combinedSeed`. Runs the physics deterministic engine and saves results safely.
* `POST /api/rounds/:id/reveal`: Broadcasts the secret `serverSeed` to the client for auditing purposes.

---

## Fairness Spec Implemented

### Protocol
* **commitHex:** Computed before the drop using `SHA256(serverSeed + ":" + nonce)`.
* **combinedSeed:** Calculated internally after the bet is placed: `SHA256(serverSeed + ":" + clientSeed + ":" + nonce)`.
* **PRNG Algorithm:** We use `XorShift32`. We seed this PRNG by parsing the **first 4 bytes** of `combinedSeed` out of hex format into a standard big-endian unsigned 32-bit integer.

### Deterministic Engine (Peg Map & Path)
* **Peg Generation:** Performed first, mapping rows in a triangle. Uses the exact SRS `leftBias` algorithm: 
  `leftBias = 0.5 + (rand() - 0.5) * 0.2` and mathematically rounded to exactly **6 decimal places**.
* **Path Generation:** Run deterministically *after* the peg map consumes the required PRNG values. Drop adjustments are added uniformly `bias' = clamp(leftBias + adj, 0, 1)`, and nodes traversed left `rnd < bias'` or right.

---

## Testing & Verifying Results

The repository explicitly includes testing suites confirming zero deviation off the core requirement hashes and XorShift configurations!

Run unit tests via Vitest:
```bash
npm run test
```

* `tests/engine.test.ts` perfectly asserts all outputs matching the `candidate-hello` and `nonce=42` sample test vector.
* `tests/prng.test.ts` covers RNG sequence invariants and period verifications.

---

## How to Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup the Database:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

3. **Start the Next.js local server:**
   ```bash
   npm run dev
   ```

4. **Play / Validate:**
   - Head to [http://localhost:3000](http://localhost:3000)
   - Play a round! Once finished, click **"Verify This Round"** or head manually to [http://localhost:3000/verify](http://localhost:3000/verify). 

*Configuration:*
Uses `.env` with a local `DATABASE_URL` default. Next.js picks it up natively.

---

## AI Usage Statement

I used AI assistance during the development of this project as a productivity and ideation tool, while ensuring that all core logic, decisions, and validations were fully understood and verified by me.

AI was primarily used to:

* Explore implementation approaches for the deterministic Plinko engine and commit-reveal flow
* Speed up initial scaffolding for API routes and UI components
* Validate edge cases in the PRNG and hashing pipeline
* Refine the structure of the verifier and replay logic

All critical parts of the system — including the deterministic engine, PRNG sequencing, and fairness protocol — were carefully reviewed, tested, and adjusted manually to ensure correctness and full reproducibility.

A key design decision was to avoid physics-based engines (e.g., Matter.js) and instead implement a fully deterministic mathematical model. The visual animation layer simply follows the computed path, ensuring that the outcome is always verifiable and consistent across environments.

Overall, AI was used as a support tool, but the architecture, debugging, and final implementation decisions were made independently to align with the assignment requirements.

**Next Steps (With More Time):** 
With additional time, we would isolate a generic websocket dispatcher or polling layer for an observer's page showing a Realtime Session Log (`/api/rounds?limit=20`) globally broadcasting every player's drops natively. We'd also incorporate server-rendered Next.js metadata hooks to permalink replay verification screenshots beautifully.
