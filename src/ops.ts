// GUARDED CORE (DESIGN section 5 trust boundary): comparison, equality, and
// aggregate semantics live here — where wrong answers are born. Change with
// extra care; every semantic is pinned by a test in src/ops.test.ts and
// decisions are recorded in loop/PROGRESS.md.

// Deep structural, type-sensitive equality backing the ==, !=, and in
// operators (DESIGN section 6). No coercion: 1 never equals "1". Numbers use
// SameValueZero (NaN equals NaN, +0 equals -0) for consistency with groupBy's
// native-Map key semantics. Objects compare by own enumerable keys, order
// irrelevant; arrays element-wise and order-sensitive. Rows are JSON values,
// so non-plain objects (Date, Map, class instances) get no special handling
// and compare structurally like any other object.
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a === "number" && typeof b === "number") {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((element, i) => deepEqual(element, b[i]));
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left);
  return (
    leftKeys.length === Object.keys(right).length &&
    leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]))
  );
}
