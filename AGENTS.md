# Codex Rules

## Goal

Ship small, clean, verifiable improvements quickly. Prefer clarity, minimal diffs, and predictable behavior over clever rewrites.

## Execution Rules

- Read the relevant file before editing it.
- Start with the smallest change that can solve the real problem.
- Do not refactor unrelated code while fixing a focused issue.
- Prefer modifying existing files over creating new abstractions.
- Avoid new dependencies unless the current stack cannot reasonably solve the task.
- Skip `node_modules`, `dist`, and generated files unless the user explicitly asks.
- When the task is ambiguous, choose the safest minimal interpretation and state it in the final note.

## Project Rules

- Treat this repo as a React 19 + Vite app with plain CSS and Recharts.
- Preserve the current visual language: warm neutrals, strong typography, rounded surfaces, and restrained accents.
- Reuse existing CSS variables in `src/index.css` before adding new ones.
- Keep chart styling consistent with existing color tokens and label formatting helpers.
- Prefer extending the current screen and layout system over introducing a new design system.

## React Rules

- Keep components focused: one component, one clear job.
- Keep derived data in pure helper functions or `useMemo`, not inside JSX.
- Add state only when it changes UI behavior or user flow.
- Prefer explicit names over short clever names.
- Extract repeated display logic into small helpers before duplicating JSX.
- Avoid premature optimization. Add memoization only for expensive derived data or unstable chart props.
- Do not introduce `useEffect` for logic that can be computed during render.

## CSS Rules

- Prefer existing tokens, spacing rhythm, and radius values.
- Keep styles in CSS classes instead of inline styles, unless a library API requires inline values.
- Avoid one-off magic numbers when an existing spacing or size token works.
- Make desktop and mobile layouts work in the same pass.
- Preserve readability first: contrast, spacing, overflow, and wrapping beat decoration.
- Use motion sparingly and only when it improves hierarchy or feedback.

## Code Writing Rules

- Favor simple control flow and early returns.
- Keep utility functions small and deterministic.
- Co-locate helpers near the component when they are screen-specific.
- Use constants for repeated labels, colors, thresholds, and formatter behavior.
- Match the surrounding file style instead of reformatting everything.
- Add comments only when the intent is not obvious from the code.

## Verification Rules

- After meaningful changes, run `npm run lint`.
- Run `npm run build` before finishing changes that affect rendering, structure, or imports.
- If a check cannot run, say so clearly in the final response.
- Call out unverified edge cases instead of pretending they are covered.

## Frontend Quality Bar

- The first screen should communicate purpose immediately.
- Every section should have one clear responsibility.
- Charts should remain readable at a glance.
- Empty, loading, and error-adjacent states should not look broken.
- If a UI change adds noise without improving scanning or action, remove it.
