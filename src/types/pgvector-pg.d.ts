/**
 * Ambient declaration for the 'pgvector/pg' subpath export.
 *
 * The `pgvector` package only ships a package.json "exports" map (no
 * root-level index files), which Node's runtime `require` resolves fine but
 * TypeScript's classic/Node10 module resolution (used by this project's
 * `module: "commonjs"` tsconfig) cannot. Rather than switching the whole
 * project to a resolution mode that requires "exports" map support, declare
 * the small shape we actually use here.
 */
declare module 'pgvector/pg' {
  import type { ClientBase } from 'pg';

  export function registerTypes(client: ClientBase): Promise<void>;
}
