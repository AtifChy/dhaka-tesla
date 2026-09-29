# Step 11 - Git, README, AI policy, video, and submission

## Required Git flow

The assignment explicitly defines this flow:

```text
feature/* -> master -> pre-release -> release/v1.0.0
```

This is not the usual “all features merge into a permanent develop/pre-release branch” workflow.

1. Start each logical feature from current `master`.
2. Make incremental commits on the feature branch.
3. Test it, then merge it into `master` when it works.
4. Once MVP features are integrated, use `pre-release` for integration fixes, docs, Docker, deployment checks, and video preparation.
5. Cut `release/v1.0.0` from `pre-release`; that exact version is shown in the video/deployment.

## Promote the current work without rewriting history

The database, API, Docker, and frontend features have already been merged to `master`. The required `pre-release` and `release/v1.0.0` branches already exist. For new work, first merge tested feature branches to `master`, then promote in order:

```bash
git switch pre-release
git merge --no-ff master
git switch release/v1.0.0
git merge --no-ff pre-release
```

Do not force-reset or recreate the existing branches. Verify the release build, then push the three branches. Tagging is optional and does not replace the required release branch; do not move an existing tag without explicit approval.

If `v1.0.0` does not yet exist and acceptance is complete, it may be created on the release commit:

```bash
git tag -a v1.0.0 -m "Dhaka Tesla Pool v1.0.0"
```

## Feature branch examples

```text
feature/passenger-auth
feature/passenger-rides
feature/tesla-pooling
feature/driver-flow
feature/frontend-passenger
feature/frontend-driver
feature/docker-deployment
```

Keep one understandable logical change per commit:

```text
feat(auth): add passenger login endpoint
feat(pool): enforce Bullet seat capacity
fix(pool): prevent final-seat overbooking
test(pool): cover concurrent seat claims
build(docker): add api web and postgres services
docs(readme): explain architecture and AI usage
```

Avoid `update`, `changes`, `fix`, `final`, `latest`, `working now`, and artificial micro-commits.

## Root README requirements

Replace the starter README before submission. It must contain:

1. Product summary and problem statement in your own words.
2. Implemented features and screenshots/GIFs.
3. Architecture Mermaid diagram and ERD.
4. Stack choices, alternatives, why they fit, and switch conditions.
5. Project structure and prerequisites.
6. Every `.env.example` variable.
7. Local and Docker setup.
8. Prisma migration, verification, and seed commands.
9. Frontend/backend/test commands.
10. Demo credentials.
11. API overview and Swagger URL.
12. Fare formula with Nusrat/Rafiq hand calculations and Decimal rationale.
13. Pool compatibility, lifecycle, capacity transaction, and concurrency explanation.
14. Deployment URL or honest free-hosting limitation plus Docker fallback.
15. Key trade-offs, known limitations, and next improvements.
16. AI Usage section.
17. Six-minute video link.
18. Optional viral-scale reasoning.

## AI usage policy

AI use is allowed. Hiding it is not. Keep [the AI usage log](ai-usage-log.md) current and summarize it in the root README.

The summary can truthfully say:

> OpenAI Codex was used to analyze the assignment, research official framework behavior, troubleshoot the PostgreSQL 18 Docker volume, review the Prisma 8 contract and seed, and draft an implementation guide. I accepted the suggestions to use atomic conditional seat allocation and exact Decimal money with integer-poysha calculations. I changed the initial UUID/integer-poysha-storage direction to auto-incrementing integer IDs and Decimal BDT storage to keep the assessment simple and human-readable. I reviewed the resulting decisions and verified relevant database work with Prisma verification, repeated seeding, TypeScript checks, and builds.

During development, record:

- Tool and date.
- What it was used for.
- Material suggestion.
- Accepted, changed, or rejected decision and why.
- How the result was verified.
- Commit containing the resulting work when available.

Never paste secrets or real user data into an AI tool. Do not claim verification that has not happened. Be prepared to explain and change every AI-assisted line live.

## Six-minute video

Keep it at or below six minutes:

```text
0:00-1:00  Problem, actors, core pooling idea in your own words
1:00-3:00  Architecture, ERD, lifecycle, one key decision, one trade-off
3:00-6:00  Passenger flow, driver flow, pooling, fare/status, edge case, deployment
```

Show:

- Nusrat and Rafiq sharing Bullet.
- Their individual, hand-checkable fares.
- Jashim accepting and progressing the pool.
- One interesting edge case: Shirin racing for the last seat or a rejected invalid transition.
- Architecture/ERD while explaining, not merely scrolling through code.

## Submission checklist

- Public/evaluator-accessible repository.
- Working frontend, backend, and database.
- Full Docker Compose, `.env.example`, migrations, seed, no secrets.
- Jashim/Bullet/Nusrat/Rafiq used consistently.
- Architecture and ERD.
- `master`, `pre-release`, and `release/v1.0.0` plus real feature branches.
- Meaningful tests including concurrency.
- Self-contained README.
- Free deployment URL if available, otherwise reproducible Docker explanation.
- Six-minute video link.
- Honest AI Usage section.

## Acceptance gate

- Git history demonstrates the real engineering sequence.
- README commands work from a fresh clone.
- AI disclosure includes one accepted and one changed/rejected suggestion.
- Video stays within six minutes and shows the release branch behavior.
- Every submission checklist item has direct evidence.
