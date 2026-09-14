// Test-only stub for the "server-only" package.
//
// The real package's default export condition unconditionally throws
// ("can only be used from a Server Component") — it only resolves to a
// no-op under the "react-server" bundler condition that Next.js sets
// during its own build. Vitest runs in plain Node, so without this
// alias every lib/auth/** module (which imports "server-only" as a
// safety marker against accidental client bundling) would throw the
// moment a test imported it. See vitest.config.ts.
export {};
