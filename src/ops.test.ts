// Guarded-core tests for src/ops.ts (DESIGN section 5 trust boundary).
// deepEqual pins the ==/!=/in equality semantics from DESIGN section 6:
// deep, structural, type-sensitive; SameValueZero for numbers (decision
// recorded in loop/PROGRESS.md, task 1.1). compareRelational pins the
// <, <=, >, >= semantics: JS relational order per type, NaN comparisons
// false, strings by code-unit order, mixed number/string unordered
// (decisions recorded in loop/PROGRESS.md, task 1.2). evaluateWhere pins
// the single entry point for all 7 operators, including the false-not-throw
// convention for type-invalid operands (decisions recorded in
// loop/PROGRESS.md, task 1.3). computeAggregate pins the aggregate
// semantics from DESIGN section 7: empty-set behaviors (count/sum -> 0,
// avg/min/max throw a RangeError naming the aggregate and the key) and the
// NaN-poisoning stance for non-number values (decisions recorded in
// loop/PROGRESS.md, task 1.4). compareForSort pins the sort-comparator
// semantics from DESIGN section 7: a total preorder where orderable values
// come first (desc is their exact reverse), present-but-unorderable values
// (NaN, type-lying data) follow, and null/undefined always sort LAST
// regardless of direction (decisions recorded in loop/PROGRESS.md, task 3.5).
import { describe, expect, test } from "bun:test";
import {
  compareForSort,
  compareRelational,
  computeAggregate,
  deepEqual,
  evaluateWhere,
  type WhereOperator,
} from "./ops";

describe("deepEqual: primitives are type-sensitive", () => {
  test("equal primitives of the same type", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(false, false)).toBe(true);
  });

  test("1 and \"1\" are unequal (no coercion)", () => {
    expect(deepEqual(1, "1")).toBe(false);
    expect(deepEqual("1", 1)).toBe(false);
  });

  test("boolean never equals its numeric coercion", () => {
    expect(deepEqual(true, 1)).toBe(false);
    expect(deepEqual(false, 0)).toBe(false);
    expect(deepEqual(false, "")).toBe(false);
  });

  test("distinct values of the same type are unequal", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
  });
});

describe("deepEqual: null, undefined, and 0 are all distinct", () => {
  test("each equals itself", () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(0, 0)).toBe(true);
  });

  test("no pair of them is equal", () => {
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(undefined, null)).toBe(false);
    expect(deepEqual(null, 0)).toBe(false);
    expect(deepEqual(undefined, 0)).toBe(false);
  });

  test("null does not equal an object or an empty string", () => {
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
    expect(deepEqual(null, "")).toBe(false);
  });
});

describe("deepEqual: number semantics are SameValueZero (pinned decision)", () => {
  test("NaN equals NaN", () => {
    expect(deepEqual(NaN, NaN)).toBe(true);
  });

  test("NaN nested in structures equals NaN", () => {
    expect(deepEqual({ v: NaN }, { v: NaN })).toBe(true);
    expect(deepEqual([NaN], [NaN])).toBe(true);
  });

  test("NaN does not equal any real number or non-number", () => {
    expect(deepEqual(NaN, 1)).toBe(false);
    expect(deepEqual(1, NaN)).toBe(false);
    expect(deepEqual(NaN, "NaN")).toBe(false);
  });

  test("+0 equals -0", () => {
    expect(deepEqual(0, -0)).toBe(true);
    expect(deepEqual(-0, 0)).toBe(true);
  });
});

describe("deepEqual: objects compare structurally, key order irrelevant", () => {
  test("same keys and values in different insertion order are equal", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  test("differing values under the same key are unequal", () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  test("missing or extra keys make objects unequal", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  test("same key count but different key names are unequal", () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  test("a key explicitly set to undefined is structurally present", () => {
    expect(deepEqual({ a: undefined }, {})).toBe(false);
    expect(deepEqual({}, { a: undefined })).toBe(false);
    expect(deepEqual({ a: undefined }, { a: undefined })).toBe(true);
  });

  test("nested objects compare recursively", () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: "1" } })).toBe(false);
  });
});

describe("deepEqual: arrays compare element-wise and order-sensitive", () => {
  test("same elements in the same order are equal", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  test("same elements in a different order are unequal", () => {
    expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  test("length mismatch is unequal, including prefixes", () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
  });

  test("elements are compared type-sensitively", () => {
    expect(deepEqual([1], ["1"])).toBe(false);
  });

  test("an array never equals a non-array object", () => {
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual({}, [])).toBe(false);
    expect(deepEqual([1], { 0: 1, length: 1 })).toBe(false);
  });
});

describe("deepEqual: mixed nesting and empty containers", () => {
  test("empty containers equal their own kind only", () => {
    expect(deepEqual({}, {})).toBe(true);
    expect(deepEqual([], [])).toBe(true);
  });

  test("objects containing arrays containing objects", () => {
    const a = { users: [{ name: "ada", tags: ["x", "y"] }], total: 1 };
    const b = { total: 1, users: [{ tags: ["x", "y"], name: "ada" }] };
    expect(deepEqual(a, b)).toBe(true);
  });

  test("a deep difference anywhere makes the whole unequal", () => {
    const a = { users: [{ name: "ada", tags: ["x", "y"] }] };
    const b = { users: [{ name: "ada", tags: ["x", "z"] }] };
    expect(deepEqual(a, b)).toBe(false);
  });

  test("nested array vs object mismatch is unequal", () => {
    expect(deepEqual({ a: [] }, { a: {} })).toBe(false);
  });

  test("identical references are equal without recursion", () => {
    const row = { a: [1, { b: 2 }] };
    expect(deepEqual(row, row)).toBe(true);
  });
});

const RELATIONAL_OPS = ["<", "<=", ">", ">="] as const;

describe("compareRelational: JS relational semantics for numbers", () => {
  test("strict inequalities order numbers in both directions", () => {
    expect(compareRelational(1, "<", 2)).toBe(true);
    expect(compareRelational(2, "<", 1)).toBe(false);
    expect(compareRelational(2, ">", 1)).toBe(true);
    expect(compareRelational(1, ">", 2)).toBe(false);
  });

  test("equal numbers: strict operators false, non-strict true", () => {
    expect(compareRelational(5, "<", 5)).toBe(false);
    expect(compareRelational(5, ">", 5)).toBe(false);
    expect(compareRelational(5, "<=", 5)).toBe(true);
    expect(compareRelational(5, ">=", 5)).toBe(true);
  });

  test("non-strict inequalities order unequal numbers in both directions", () => {
    expect(compareRelational(1, "<=", 2)).toBe(true);
    expect(compareRelational(2, "<=", 1)).toBe(false);
    expect(compareRelational(2, ">=", 1)).toBe(true);
    expect(compareRelational(1, ">=", 2)).toBe(false);
  });

  test("negative numbers and zero order numerically", () => {
    expect(compareRelational(-1, "<", 0)).toBe(true);
    expect(compareRelational(-2, "<", -1)).toBe(true);
    expect(compareRelational(0, ">", -1)).toBe(true);
  });

  test("+0 and -0 are not ordered apart", () => {
    expect(compareRelational(0, ">", -0)).toBe(false);
    expect(compareRelational(0, "<", -0)).toBe(false);
    expect(compareRelational(0, ">=", -0)).toBe(true);
    expect(compareRelational(0, "<=", -0)).toBe(true);
  });

  test("infinities order at the extremes", () => {
    expect(compareRelational(-Infinity, "<", Number.MIN_SAFE_INTEGER)).toBe(true);
    expect(compareRelational(Infinity, ">", Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(compareRelational(Infinity, "<=", Infinity)).toBe(true);
  });
});

describe("compareRelational: every comparison involving NaN is false (pinned)", () => {
  test("NaN on the left, right, or both sides fails all four operators", () => {
    for (const op of RELATIONAL_OPS) {
      expect(compareRelational(NaN, op, 1)).toBe(false);
      expect(compareRelational(1, op, NaN)).toBe(false);
      expect(compareRelational(NaN, op, NaN)).toBe(false);
    }
  });
});

describe("compareRelational: strings use plain code-unit order (pinned decision)", () => {
  test("lexicographic ordering in both directions", () => {
    expect(compareRelational("a", "<", "b")).toBe(true);
    expect(compareRelational("b", "<", "a")).toBe(false);
    expect(compareRelational("b", ">", "a")).toBe(true);
    expect(compareRelational("abc", "<", "abd")).toBe(true);
  });

  test("a prefix sorts before its extension", () => {
    expect(compareRelational("ab", "<", "abc")).toBe(true);
    expect(compareRelational("abc", ">", "ab")).toBe(true);
  });

  test("equal strings: strict operators false, non-strict true", () => {
    expect(compareRelational("kiwi", "<", "kiwi")).toBe(false);
    expect(compareRelational("kiwi", ">", "kiwi")).toBe(false);
    expect(compareRelational("kiwi", "<=", "kiwi")).toBe(true);
    expect(compareRelational("kiwi", ">=", "kiwi")).toBe(true);
  });

  test("code-unit order, not locale or human order", () => {
    expect(compareRelational("Z", "<", "a")).toBe(true);
    expect(compareRelational("ä", ">", "z")).toBe(true);
    expect(compareRelational("10", "<", "9")).toBe(true);
  });

  test("the empty string precedes every non-empty string", () => {
    expect(compareRelational("", "<", "a")).toBe(true);
    expect(compareRelational("", "<=", "")).toBe(true);
  });
});

describe("compareRelational: mixed number/string operands are unordered (pinned decision)", () => {
  test("a number never orders against a string, in either direction", () => {
    for (const op of RELATIONAL_OPS) {
      expect(compareRelational(5, op, "10")).toBe(false);
      expect(compareRelational("10", op, 5)).toBe(false);
      expect(compareRelational(5, op, "abc")).toBe(false);
      expect(compareRelational("abc", op, 5)).toBe(false);
    }
  });
});

describe("evaluateWhere: table-driven sweep over all 7 operators (DESIGN section 6)", () => {
  const CASES: ReadonlyArray<{
    name: string;
    row: unknown;
    op: WhereOperator;
    value: unknown;
    expected: boolean;
  }> = [
    // == / != delegate to deepEqual (deep, structural, type-sensitive)
    { name: "== matches an equal primitive", row: 1, op: "==", value: 1, expected: true },
    { name: "== rejects coercion: 1 vs \"1\"", row: 1, op: "==", value: "1", expected: false },
    {
      name: "== compares objects structurally, key order irrelevant",
      row: { a: 1, b: 2 },
      op: "==",
      value: { b: 2, a: 1 },
      expected: true,
    },
    {
      name: "== compares arrays order-sensitively",
      row: [1, 2],
      op: "==",
      value: [2, 1],
      expected: false,
    },
    { name: "== treats NaN as equal to NaN (SameValueZero)", row: NaN, op: "==", value: NaN, expected: true },
    { name: "!= negates deep equality for unequal values", row: 1, op: "!=", value: "1", expected: true },
    { name: "!= negates deep equality for equal values", row: 1, op: "!=", value: 1, expected: false },
    {
      name: "!= sees structurally different objects as unequal",
      row: { a: 1 },
      op: "!=",
      value: { a: 2 },
      expected: true,
    },
    { name: "!= treats NaN as equal to NaN (SameValueZero)", row: NaN, op: "!=", value: NaN, expected: false },
    // relational operators delegate to compareRelational
    { name: "< orders numbers", row: 1, op: "<", value: 2, expected: true },
    { name: "< orders strings by code-unit", row: "Z", op: "<", value: "a", expected: true },
    { name: "< involving NaN is false", row: NaN, op: "<", value: 1, expected: false },
    { name: "<= holds for equal numbers", row: 5, op: "<=", value: 5, expected: true },
    { name: "> orders numbers", row: 2, op: ">", value: 1, expected: true },
    { name: "> on mixed number/string is unordered", row: "5", op: ">", value: 10, expected: false },
    { name: ">= holds for equal numbers", row: 5, op: ">=", value: 5, expected: true },
    { name: ">= fails for a smaller left operand", row: 5, op: ">=", value: 6, expected: false },
    // in: membership via the same deep equality over a readonly array
    { name: "in finds a member primitive", row: 2, op: "in", value: [1, 2, 3], expected: true },
    { name: "in misses an absent primitive", row: 4, op: "in", value: [1, 2, 3], expected: false },
    { name: "in is type-sensitive: \"1\" not in [1, 2, 3]", row: "1", op: "in", value: [1, 2, 3], expected: false },
    {
      name: "in matches objects by deep equality, not reference",
      row: { a: 1 },
      op: "in",
      value: [{ a: 2 }, { a: 1 }],
      expected: true,
    },
    { name: "in finds NaN (SameValueZero)", row: NaN, op: "in", value: [NaN], expected: true },
    { name: "in over an empty array is false", row: 1, op: "in", value: [], expected: false },
    { name: "in matches null by identity", row: null, op: "in", value: [null], expected: true },
  ];

  for (const { name, row, op, value, expected } of CASES) {
    test(name, () => {
      expect(evaluateWhere(row, op, value)).toBe(expected);
    });
  }
});

describe("evaluateWhere: relational ops on non-orderable operands are false (pinned decision)", () => {
  const NON_ORDERABLE = [null, undefined, true, { n: 1 }, [1]] as const;

  test("a non-orderable row value fails every relational operator", () => {
    for (const op of RELATIONAL_OPS) {
      for (const row of NON_ORDERABLE) {
        expect(evaluateWhere(row, op, 1)).toBe(false);
      }
    }
  });

  test("a non-orderable comparison value fails every relational operator", () => {
    for (const op of RELATIONAL_OPS) {
      for (const value of NON_ORDERABLE) {
        expect(evaluateWhere(1, op, value)).toBe(false);
      }
    }
  });

  test("non-orderable on both sides is still false, even for identical values", () => {
    expect(evaluateWhere(null, "<=", null)).toBe(false);
    expect(evaluateWhere(true, ">=", true)).toBe(false);
  });
});

describe("evaluateWhere: in with a non-array value is false, not a throw (pinned decision)", () => {
  test("non-array membership pools never match and never throw", () => {
    expect(evaluateWhere(1, "in", 1)).toBe(false);
    expect(evaluateWhere("a", "in", "abc")).toBe(false);
    expect(evaluateWhere(1, "in", null)).toBe(false);
    expect(evaluateWhere(1, "in", { 0: 1, length: 1 })).toBe(false);
  });

  test("a readonly array literal works as the membership pool", () => {
    const pool = [1, 2, 3] as const;
    expect(evaluateWhere(2, "in", pool)).toBe(true);
  });
});

describe("computeAggregate: count counts values, ignoring their content", () => {
  test("counts the values it is given", () => {
    expect(computeAggregate([10, 20, 30], "count")).toBe(3);
  });

  test("counts non-numeric and degenerate values alike", () => {
    expect(computeAggregate([null, undefined, NaN, "x"], "count")).toBe(4);
  });

  test("count of an empty set is 0 (pinned)", () => {
    expect(computeAggregate([], "count")).toBe(0);
  });
});

describe("computeAggregate: sum", () => {
  test("adds numeric values", () => {
    expect(computeAggregate([1, 2, 3], "sum", "price")).toBe(6);
  });

  test("handles negatives and floats", () => {
    expect(computeAggregate([-1.5, 2.5, -1], "sum", "delta")).toBe(0);
  });

  test("a single value sums to itself", () => {
    expect(computeAggregate([7], "sum", "n")).toBe(7);
  });

  test("sum of an empty set is 0 (pinned)", () => {
    expect(computeAggregate([], "sum", "price")).toBe(0);
  });

  test("a readonly values array is accepted", () => {
    const values = [1, 2, 3] as const;
    expect(computeAggregate(values, "sum", "n")).toBe(6);
  });
});

describe("computeAggregate: avg", () => {
  test("arithmetic mean of the values", () => {
    expect(computeAggregate([2, 4, 6], "avg", "score")).toBe(4);
  });

  test("the mean need not be an integer", () => {
    expect(computeAggregate([1, 2], "avg", "score")).toBe(1.5);
  });

  test("a single value is its own mean", () => {
    expect(computeAggregate([9], "avg", "score")).toBe(9);
  });
});

describe("computeAggregate: min and max", () => {
  test("min picks the smallest value", () => {
    expect(computeAggregate([3, 1, 2], "min", "n")).toBe(1);
  });

  test("max picks the largest value", () => {
    expect(computeAggregate([3, 9, 2], "max", "n")).toBe(9);
  });

  test("negative values order numerically", () => {
    expect(computeAggregate([-3, -9, -2], "min", "n")).toBe(-9);
    expect(computeAggregate([-3, -9, -2], "max", "n")).toBe(-2);
  });

  test("a single value is both min and max", () => {
    expect(computeAggregate([5], "min", "n")).toBe(5);
    expect(computeAggregate([5], "max", "n")).toBe(5);
  });

  test("infinities are legal extremes", () => {
    expect(computeAggregate([1, -Infinity], "min", "n")).toBe(-Infinity);
    expect(computeAggregate([1, Infinity], "max", "n")).toBe(Infinity);
  });
});

describe("computeAggregate: avg/min/max over an empty set throw RangeError (pinned)", () => {
  test("avg throws a RangeError naming the aggregate and the key", () => {
    expect(() => computeAggregate([], "avg", "price")).toThrow(RangeError);
    expect(() => computeAggregate([], "avg", "price")).toThrow(
      new RangeError('Cannot compute avg("price") of an empty set'),
    );
  });

  test("min throws a RangeError naming the aggregate and the key", () => {
    expect(() => computeAggregate([], "min", "score")).toThrow(RangeError);
    expect(() => computeAggregate([], "min", "score")).toThrow(
      new RangeError('Cannot compute min("score") of an empty set'),
    );
  });

  test("max throws a RangeError naming the aggregate and the key", () => {
    expect(() => computeAggregate([], "max", "qty")).toThrow(RangeError);
    expect(() => computeAggregate([], "max", "qty")).toThrow(
      new RangeError('Cannot compute max("qty") of an empty set'),
    );
  });
});

describe("computeAggregate: NaN and non-number values poison the result (pinned decision)", () => {
  test("a NaN value makes every numeric aggregate NaN", () => {
    expect(computeAggregate([1, NaN, 3], "sum", "n")).toBeNaN();
    expect(computeAggregate([1, NaN, 3], "avg", "n")).toBeNaN();
    expect(computeAggregate([1, NaN, 3], "min", "n")).toBeNaN();
    expect(computeAggregate([1, NaN, 3], "max", "n")).toBeNaN();
  });

  test("non-number values (lying data) poison to NaN instead of coercing", () => {
    // raw JS would coerce: 1 + "2" === "12", 1 + null === 1 — both are
    // silent garbage the engine refuses to produce
    expect(computeAggregate([1, "2", 3], "sum", "n")).toBeNaN();
    expect(computeAggregate([1, null, 3], "avg", "n")).toBeNaN();
    expect(computeAggregate([1, undefined, 3], "min", "n")).toBeNaN();
    expect(computeAggregate([{ n: 1 }, 3], "max", "n")).toBeNaN();
  });

  test("count is immune: it counts values, it does not read them", () => {
    expect(computeAggregate([NaN, "2", null], "count")).toBe(3);
  });
});

describe("compareForSort: orderable values follow relational order per direction", () => {
  test("numbers compare numerically ascending", () => {
    expect(compareForSort(1, 2, "asc")).toBeLessThan(0);
    expect(compareForSort(2, 1, "asc")).toBeGreaterThan(0);
    expect(compareForSort(9, 100, "asc")).toBeLessThan(0);
  });

  test("desc is the exact reverse of asc for orderable values", () => {
    expect(compareForSort(1, 2, "desc")).toBeGreaterThan(0);
    expect(compareForSort(2, 1, "desc")).toBeLessThan(0);
    expect(compareForSort("a", "b", "desc")).toBeGreaterThan(0);
  });

  test("equal values compare 0 in both directions (stability hook)", () => {
    expect(compareForSort(3, 3, "asc")).toBe(0);
    expect(compareForSort(3, 3, "desc")).toBe(0);
    expect(compareForSort("x", "x", "asc")).toBe(0);
  });

  test("+0 and -0 compare 0 (no relational order between them)", () => {
    expect(compareForSort(0, -0, "asc")).toBe(0);
    expect(compareForSort(-0, 0, "desc")).toBe(0);
  });

  test("strings compare by plain code-unit order, no locale", () => {
    expect(compareForSort("Z", "a", "asc")).toBeLessThan(0);
    expect(compareForSort("10", "9", "asc")).toBeLessThan(0);
    expect(compareForSort("ä", "z", "asc")).toBeGreaterThan(0);
  });
});

describe("compareForSort: mixed number/string operands bucket numbers first (pinned decision)", () => {
  test("a number sorts before a string ascending", () => {
    expect(compareForSort(100, "a", "asc")).toBeLessThan(0);
    expect(compareForSort("a", 100, "asc")).toBeGreaterThan(0);
  });

  test("the bucket order flips with desc like any orderable comparison", () => {
    expect(compareForSort(100, "a", "desc")).toBeGreaterThan(0);
    expect(compareForSort("a", 100, "desc")).toBeLessThan(0);
  });
});

describe("compareForSort: null/undefined sort LAST regardless of direction (DESIGN 7)", () => {
  test("null goes after any orderable value in both directions", () => {
    expect(compareForSort(1, null, "asc")).toBeLessThan(0);
    expect(compareForSort(1, null, "desc")).toBeLessThan(0);
    expect(compareForSort(null, "z", "asc")).toBeGreaterThan(0);
    expect(compareForSort(null, "z", "desc")).toBeGreaterThan(0);
  });

  test("undefined goes after any orderable value in both directions", () => {
    expect(compareForSort(1, undefined, "asc")).toBeLessThan(0);
    expect(compareForSort(1, undefined, "desc")).toBeLessThan(0);
    expect(compareForSort(undefined, "z", "asc")).toBeGreaterThan(0);
    expect(compareForSort(undefined, "z", "desc")).toBeGreaterThan(0);
  });

  test("null and undefined tie with each other (stable pipeline order wins)", () => {
    expect(compareForSort(null, undefined, "asc")).toBe(0);
    expect(compareForSort(undefined, null, "desc")).toBe(0);
    expect(compareForSort(null, null, "asc")).toBe(0);
    expect(compareForSort(undefined, undefined, "desc")).toBe(0);
  });
});

describe("compareForSort: present-but-unorderable values sort after orderables, before null/undefined (pinned decision)", () => {
  test("NaN goes after every orderable value regardless of direction", () => {
    expect(compareForSort(5, NaN, "asc")).toBeLessThan(0);
    expect(compareForSort(5, NaN, "desc")).toBeLessThan(0);
    expect(compareForSort(NaN, "a", "asc")).toBeGreaterThan(0);
    expect(compareForSort(NaN, "a", "desc")).toBeGreaterThan(0);
  });

  test("NaN goes before null/undefined regardless of direction", () => {
    expect(compareForSort(NaN, null, "asc")).toBeLessThan(0);
    expect(compareForSort(NaN, null, "desc")).toBeLessThan(0);
    expect(compareForSort(undefined, NaN, "asc")).toBeGreaterThan(0);
    expect(compareForSort(undefined, NaN, "desc")).toBeGreaterThan(0);
  });

  test("NaN ties with NaN and with other unorderable values", () => {
    expect(compareForSort(NaN, NaN, "asc")).toBe(0);
    expect(compareForSort(NaN, true, "asc")).toBe(0);
  });

  test("type-lying values (boolean, object, array) rank as unorderable", () => {
    expect(compareForSort(true, 1, "asc")).toBeGreaterThan(0);
    expect(compareForSort({ a: 1 }, "z", "desc")).toBeGreaterThan(0);
    expect(compareForSort([1], null, "asc")).toBeLessThan(0);
    expect(compareForSort(true, false, "asc")).toBe(0);
  });
});
