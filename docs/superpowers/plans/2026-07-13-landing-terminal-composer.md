# Landing Terminal Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the landing forms with a room-style sticky terminal composer and scrollable transcript while preserving the existing landing visuals.

**Architecture:** Keep command parsing and guided creation state in a pure landing-terminal helper. Reuse a shared visual composer shell for the landing and room page; the landing page owns transcript state plus existing API calls.

**Tech Stack:** Next.js 15, React 19, Node test runner.

## Global Constraints

- Preserve landing header, hero, footer, theme, and Playground link.
- Support direct and guided `/create`, `/join`, and `/help`.
- Keep passwords out of transcript rows; keep current room creation and local creator storage behavior.
- Keep desktop Escape cancellation; do not add a mobile cancellation control.
- Reuse existing 127.0.0.1:3000 and 127.0.0.1:3001 listeners for runtime checks.

## Tasks

1. Add test-first landing command parsing, templates, guided creation state, defaults, validation, password masking, and cancellation.
2. Extract the common terminal composer frame from the room page without changing room-only menu/status behavior.
3. Replace landing forms with transcript-driven command actions, keeping direct and guided help/join behavior plus existing create API behavior.
4. Run targeted tests, build, existing-listener checks, and browser-visible route verification.
