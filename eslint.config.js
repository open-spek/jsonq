// ESLint 9 flat config (docs/TOOLCHAIN.md): eslint + typescript-eslint,
// recommended rule sets. `no-explicit-any` is an error via the recommended
// set — the "no `any` in src/" bar from docs/TOOLCHAIN.md.
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "coverage/", "node_modules/"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
