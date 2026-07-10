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

export type RelationalOperator = "<" | "<=" | ">" | ">=";

// The <, <=, >, >= operators, allowed on number | string fields only
// (DESIGN section 6). Same-type operands follow plain JS relational
// semantics: numeric order for numbers, where every comparison involving
// NaN is false, and code-unit order for strings (no locale). Mixed
// number/string operands are unordered and compare false under every
// operator — the type layer only lets them through a number | string
// union field, and coercing would betray the engine's type sensitivity.
export function compareRelational(
  a: number | string,
  op: RelationalOperator,
  b: number | string,
): boolean {
  if (typeof a !== typeof b) {
    return false;
  }
  switch (op) {
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
  }
}

export type WhereOperator = "==" | "!=" | RelationalOperator | "in";

function isOrderable(value: unknown): value is number | string {
  return typeof value === "number" || typeof value === "string";
}

// Single runtime entry point for all 7 where operators (DESIGN section 6):
// == and != are deep type-sensitive equality, in is membership via the same
// deep equality over a readonly array, and the relational operators delegate
// to compareRelational. Operands the type layer would reject (relational on
// a non-orderable value, in on a non-array) evaluate false rather than
// throwing: DESIGN section 7 locks the runtime error set to the limit
// TypeError and the empty-set RangeError, so type-invalid data filters rows
// out instead of crashing the pipeline.
export function evaluateWhere(rowValue: unknown, op: WhereOperator, value: unknown): boolean {
  switch (op) {
    case "==":
      return deepEqual(rowValue, value);
    case "!=":
      return !deepEqual(rowValue, value);
    case "in":
      return Array.isArray(value) && value.some((member: unknown) => deepEqual(rowValue, member));
    case "<":
    case "<=":
    case ">":
    case ">=":
      return isOrderable(rowValue) && isOrderable(value) && compareRelational(rowValue, op, value);
  }
}

export type AggregateKind = "count" | "sum" | "avg" | "min" | "max";

// Aggregate semantics (DESIGN sections 6-7). The caller extracts the field
// values (count works on whole rows, so it needs no key); the key is carried
// only so the empty-set error can name it. Empty-set pins: count -> 0,
// sum -> 0, avg/min/max throw RangeError naming the aggregate and the key.
// NaN values (a legal number by type) and non-number values (data lying
// about its static type) poison the numeric aggregates to NaN — never
// skipped like SQL NULLs, never coerced like raw JS arithmetic, never
// thrown (DESIGN section 7 locks the runtime error set).
export function computeAggregate(values: readonly unknown[], kind: "count"): number;
export function computeAggregate(
  values: readonly unknown[],
  kind: Exclude<AggregateKind, "count">,
  key: string,
): number;
export function computeAggregate(
  values: readonly unknown[],
  kind: AggregateKind,
  key = "",
): number {
  if (kind === "count") {
    return values.length;
  }
  if (values.length === 0) {
    if (kind === "sum") {
      return 0;
    }
    throw new RangeError(`Cannot compute ${kind}("${key}") of an empty set`);
  }
  const numbers = values.map((value) => (typeof value === "number" ? value : NaN));
  switch (kind) {
    case "sum":
      return numbers.reduce((total, value) => total + value, 0);
    case "avg":
      return numbers.reduce((total, value) => total + value, 0) / numbers.length;
    case "min":
      return numbers.some(Number.isNaN) ? NaN : numbers.reduce((a, b) => (b < a ? b : a));
    case "max":
      return numbers.some(Number.isNaN) ? NaN : numbers.reduce((a, b) => (b > a ? b : a));
  }
}
