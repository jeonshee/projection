# CLAUDE.md

This file provides guidance to AI assistants working in this repository.

## Repository Status

**Last audited: 2026-03-10**

This is a newly initialized repository with no source code yet. Only `CLAUDE.md` and the `.git` directory exist. This file will be updated as the project grows.

## Project Overview

_To be filled in as the project takes shape._

- **Purpose**: <!-- Describe what this project does -->
- **Language(s)**: <!-- e.g., TypeScript, Python, Go -->
- **Framework(s)**: <!-- e.g., Next.js, FastAPI, gin -->

---

## Development Setup

### Prerequisites

_Document required tools and versions here as they are determined._

```bash
# Example (update when project is initialized):
# node >= 20
# python >= 3.11
# go >= 1.22
```

### Installation

```bash
# Clone and enter the repo
git clone <repo-url>
cd projection

# Install dependencies (update this command when applicable)
# npm install | pip install -e . | go mod download
```

### Environment Variables

Create a `.env` file from the example (add `.env.example` when environment variables are introduced):

```bash
cp .env.example .env
```

_Document required environment variables here as they are added._

---

## Common Commands

_These will be filled in once a project type and toolchain are established._

| Task          | Command           |
|---------------|-------------------|
| Install deps  | `TBD`             |
| Run dev server| `TBD`             |
| Build         | `TBD`             |
| Run tests     | `TBD`             |
| Lint          | `TBD`             |
| Format        | `TBD`             |
| Type-check    | `TBD`             |

---

## Project Structure

_Update this tree as directories and key files are added._

```
projection/
├── CLAUDE.md          # This file
└── .git/
```

---

## Architecture & Key Conventions

_Document architectural decisions, patterns, and conventions as they emerge._

### Code Style

- _Formatting, linting, and naming conventions go here._

### Testing

- _Test framework, file naming conventions, and coverage requirements go here._

### Git Workflow

- Branch naming for human work: `feature/<description>`, `fix/<description>`, `chore/<description>`
- Branch naming for AI-driven work: `claude/<description>-<session-id>` (e.g., `claude/claude-md-mmk8ui7462v31tyn-acPfS`)
- Commit style: Use clear, imperative messages (e.g., `Add user authentication`, `Fix null pointer in parser`)
- Pull requests: Require passing CI before merging

### Error Handling

- _Document preferred error handling patterns when the language/framework is decided._

---

## AI Assistant Guidelines

When working in this repository, AI assistants should:

1. **Read before editing** — Always read a file before modifying it to understand existing patterns.
2. **Stay minimal** — Only make changes that are directly requested or clearly necessary. Avoid over-engineering.
3. **No speculative additions** — Do not add docstrings, comments, error handling, or features that were not requested.
4. **Prefer editing over creating** — Modify existing files rather than creating new ones when possible.
5. **Run tests before committing** — Verify changes do not break existing functionality.
6. **Update this file** — When significant new patterns, commands, or architectural decisions are introduced, update the relevant section of `CLAUDE.md`.
7. **Environment secrets** — Never commit `.env` files or secrets. Use `.env.example` with placeholder values.

---

## Frequently Asked Questions

_Add Q&A entries here as recurring questions arise during development._
