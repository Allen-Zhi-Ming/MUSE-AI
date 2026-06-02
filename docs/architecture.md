# Architecture Notes

MUSE-AI is currently a public documentation foundation for AI-assisted application architecture and compatibility-first frontend migration notes.

## Current scope

The repository documents public-safe project governance, migration principles, and AI-assisted development workflow patterns. It does not deploy a production service.

## Public structure

- `README.md`: public project overview.
- `LICENSE`: open-source license.
- `SECURITY.md`: security reporting policy.
- `AGENTS.md`: AI agent contribution guide.
- `.env.example`: placeholder environment variables.
- `docs/`: architecture and release notes.

## Design principles

- Keep public content separated from private production repositories.
- Use small, reviewable changes.
- Avoid importing private history or production configuration.
- Prefer compatibility-first migration notes over disruptive rewrites.

## Future implementation path

A future code release can add a minimal demo only after a separate public-safety review.
