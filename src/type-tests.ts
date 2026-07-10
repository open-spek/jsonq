// Compile-time test suite. Checked by `tsc --noEmit` (gate step 1); contains
// no runtime assertions, is never imported by shipped code, and is excluded
// from the build (tsconfig.build.json). Populated starting at
// loop/IMPLEMENTATION_PLAN.md task 2.1.
export {};
