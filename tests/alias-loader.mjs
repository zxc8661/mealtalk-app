/**
 * Resolves the app's `@/` path alias for `node --test`.
 *
 * Node does not read tsconfig `paths`, and rewriting the source to relative
 * imports purely to make it testable would be the tail wagging the dog. The
 * modules under test import `@/db/database` only for its types, so type
 * stripping erases that edge and expo-sqlite is never loaded here.
 */
const sourceRoot = new URL('../src/', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return nextResolve(new URL(`${specifier.slice(2)}.ts`, sourceRoot).href, context);
  }
  return nextResolve(specifier, context);
}
