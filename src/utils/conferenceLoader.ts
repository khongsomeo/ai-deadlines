/**
 * @deprecated Use the `useConferences` hook from `@/hooks/useConferences` instead.
 *
 * This file previously used `import.meta.glob` with `{ eager: true }`, which parsed
 * and merged all 114+ YAML files synchronously at module initialisation time — blocking
 * the main thread before the first render.
 *
 * The hook replaces this with a non-eager, async load triggered on component mount,
 * which fixes the startup bottleneck (Problem 1 in IMPROVEMENTS.md).
 *
 * This file is kept only for reference and will be removed in a future cleanup.
 */

export default [];