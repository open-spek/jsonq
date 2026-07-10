// Compile-time test suite. Checked by `tsc --noEmit` (gate step 1); contains
// no runtime assertions, is never imported by shipped code, and is excluded
// from the build (tsconfig.build.json). Negative cases are honest by
// construction: a `@ts-expect-error` line that stops erroring is itself a
// typecheck error ("unused directive"), so a loosened type layer fails here.

import type { OpDescription, Query, query } from "./index";
import type { KeysOfType, OperatorFor, SortableKey, WhereValue } from "./types";

// -- Test harness -------------------------------------------------------------
// Equal is the conditional-type identity check (distinguishes any, unions,
// literal vs widened); Expect only accepts a literal true. Defined here, not
// in types.ts, so test scaffolding never ships in the package declarations.

export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
export type Expect<T extends true> = T;

// Constraint probes: each alias compiles only when its arguments satisfy the
// type machinery, so a use-site under `@ts-expect-error` is a negative test.
type OperatorAllows<V, Op extends OperatorFor<V>> = [V, Op];
type WhereValueAllows<V, Op extends OperatorFor<V>, W extends WhereValue<V, Op>> = [V, Op, W];
type SortableAllows<T, K extends SortableKey<T>> = [T, K];
type NumericKeyAllows<T, K extends KeysOfType<T, number>> = [T, K];

// Row fixture spanning every field category of the DESIGN section 6 table.
interface Product {
  id: number;
  name: string;
  price: number;
  sku: string | number;
  active: boolean;
  rating: number | null;
  discount?: number;
  tags: string[];
  supplier: { id: number } | null;
  deletedAt: null;
}

// -- OperatorFor<V> (DESIGN section 6 operator table) --------------------------

export type OperatorForCases = [
  Expect<Equal<OperatorFor<number>, "==" | "!=" | "<" | "<=" | ">" | ">=" | "in">>,
  Expect<Equal<OperatorFor<string>, "==" | "!=" | "<" | "<=" | ">" | ">=" | "in">>,
  Expect<Equal<OperatorFor<string | number>, "==" | "!=" | "<" | "<=" | ">" | ">=" | "in">>,
  Expect<Equal<OperatorFor<boolean>, "==" | "!=" | "in">>,
  Expect<Equal<OperatorFor<string[]>, "==" | "!=" | "in">>,
  Expect<Equal<OperatorFor<{ id: number }>, "==" | "!=" | "in">>,
  Expect<Equal<OperatorFor<null>, "==" | "!=" | "in">>,
  Expect<Equal<OperatorFor<number | null>, "==" | "!=" | "in">>,
  Expect<Equal<OperatorFor<number | undefined>, "==" | "!=" | "in">>,
];

// @ts-expect-error relational operator on a boolean field must not compile
export type RelationalOnBoolean = OperatorAllows<boolean, ">">;
// @ts-expect-error relational operator on a null field must not compile
export type RelationalOnNull = OperatorAllows<null, "<">;
// @ts-expect-error relational operator on an object field must not compile
export type RelationalOnObject = OperatorAllows<{ id: number }, ">=">;
// @ts-expect-error relational operator on an array field must not compile
export type RelationalOnArray = OperatorAllows<string[], "<=">;
// @ts-expect-error relational operator on a nullable number field must not compile
export type RelationalOnNullableNumber = OperatorAllows<number | null, ">">;

// -- WhereValue<V, Op> (`in` -> readonly V[]; every other op -> V) -------------

export type WhereValueCases = [
  Expect<Equal<WhereValue<string, "==">, string>>,
  Expect<Equal<WhereValue<number, ">=">, number>>,
  Expect<Equal<WhereValue<string, "in">, readonly string[]>>,
  Expect<Equal<WhereValue<number | null, "!=">, number | null>>,
  Expect<Equal<WhereValue<number | null, "in">, readonly (number | null)[]>>,
];

// Positive use-site: a readonly pool of the field type is accepted for `in`.
export type InTakesReadonlyPool = WhereValueAllows<string, "in", readonly string[]>;

// @ts-expect-error where value must match the field type (string field, number value)
export type ValueTypeMismatch = WhereValueAllows<string, ">", 5>;
// @ts-expect-error in requires an array pool, not a bare field value
export type InRejectsBareValue = WhereValueAllows<string, "in", "a">;
// @ts-expect-error in pool elements must match the field type
export type InRejectsWrongElementType = WhereValueAllows<string, "in", readonly number[]>;

// -- KeysOfType<T, V> (aggregate keys: exact-assignable matches only) ----------

export type KeysOfTypeCases = [
  Expect<Equal<KeysOfType<Product, number>, "id" | "price">>,
  Expect<Equal<KeysOfType<Product, string>, "name">>,
  Expect<Equal<KeysOfType<Product, boolean>, "active">>,
  Expect<Equal<KeysOfType<{ name: string }, number>, never>>,
];

// @ts-expect-error a string field is not a numeric aggregate key
export type AggregateOnString = NumericKeyAllows<Product, "name">;
// @ts-expect-error a nullable number field is not a numeric aggregate key
export type AggregateOnNullableNumber = NumericKeyAllows<Product, "rating">;
// @ts-expect-error an optional number field is not a numeric aggregate key
export type AggregateOnOptionalNumber = NumericKeyAllows<Product, "discount">;
// @ts-expect-error an unknown key is not an aggregate key
export type AggregateOnUnknownKey = NumericKeyAllows<Product, "missing">;

// -- where(key, op, value) API surface (task 3.2) -------------------------------
// The probes above check the type machinery in isolation; these check that the
// where METHOD is actually wired through it. `declare const` exists only for
// `typeof` instantiation expressions and is never evaluated; the call-site
// probe function is never called and the file never runs.

// Exported so no-unused-vars accepts a value binding used only in typeof.
export declare const productQuery: Query<Product>;

export type WhereApiCases = [
  // where returns Query<T> unchanged — filtering never narrows the row type
  Expect<Equal<ReturnType<typeof productQuery.where<"price", ">">>, Query<Product>>>,
  // value parameter locked to T[K] for plain operators
  Expect<Equal<Parameters<typeof productQuery.where<"price", ">">>[2], number>>,
  Expect<Equal<Parameters<typeof productQuery.where<"rating", "==">>[2], number | null>>,
  // value parameter locked to readonly T[K][] for `in`
  Expect<Equal<Parameters<typeof productQuery.where<"name", "in">>[2], readonly string[]>>,
];

export function whereCallSites(q: Query<Product>): void {
  // Positive call sites: one per operator category of the section 6 table.
  q.where("price", ">", 10);
  q.where("name", "==", "widget");
  q.where("tags", "==", ["a", "b"]);
  q.where("sku", "<=", 100);
  q.where("rating", "==", null);
  q.where("supplier", "==", { id: 1 });
  q.where("name", "in", ["a", "b"] as const);

  // @ts-expect-error an unknown key must not compile
  q.where("missing", "==", 1);
  // @ts-expect-error value type must match the field type (string field, number value)
  q.where("name", ">", 5);
  // @ts-expect-error relational operator on a boolean field must not compile
  q.where("active", ">", true);
  // @ts-expect-error in requires a readonly pool of the field type, not a bare value
  q.where("name", "in", "a");
}

// -- Query<T> skeleton (DESIGN section 6: query() entry point, terminals) ------

export type QuerySkeletonCases = [
  Expect<Equal<ReturnType<typeof query<Product>>, Query<Product>>>,
  Expect<Equal<Parameters<typeof query<Product>>[0], readonly Product[]>>,
  Expect<Equal<ReturnType<Query<Product>["execute"]>, Product[]>>,
  Expect<Equal<ReturnType<Query<Product>["explain"]>, readonly OpDescription[]>>,
];

// @ts-expect-error rows must be objects — a primitive element type is not queryable
export type QueryOverPrimitives = ReturnType<typeof query<number>>;

// -- SortableKey<T> (number | string; nullable allowed, nulls sort last) -------

export type SortableKeyCases = [
  Expect<Equal<SortableKey<Product>, "id" | "name" | "price" | "sku" | "rating" | "discount">>,
  Expect<Equal<SortableKey<{ active: boolean; tags: string[] }>, never>>,
];

// @ts-expect-error a boolean field is not sortable
export type SortOnBoolean = SortableAllows<Product, "active">;
// @ts-expect-error an object field is not sortable
export type SortOnObject = SortableAllows<Product, "supplier">;
// @ts-expect-error an array field is not sortable
export type SortOnArray = SortableAllows<Product, "tags">;
// @ts-expect-error an always-null field is not sortable
export type SortOnAlwaysNull = SortableAllows<Product, "deletedAt">;
// @ts-expect-error an unknown key is not sortable
export type SortOnUnknownKey = SortableAllows<Product, "missing">;
