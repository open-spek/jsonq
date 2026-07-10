// Compile-time type machinery (DESIGN section 5): the operator table, the
// op-dependent where-value type, and the key selectors that make invalid
// queries fail to compile. Erased at runtime — this module is only ever
// touched via `import type` and ships as pure declarations. The operator
// name unions themselves live in ops.ts (the runtime switch is exhaustive
// over them); importing them type-only keeps one source of truth.

import type { RelationalOperator, WhereOperator } from "./ops";

// The "allowed on" column of the DESIGN section 6 operator table: equality
// and membership work on any JSON value; the relational operators exist only
// when the field type fits inside number | string. Non-distributive on
// purpose — a number | string union field is orderable, while a
// number | null field is not: evaluateWhere would silently filter every
// null-valued row, so such fields are limited to == / != / in or the
// predicate overload, keeping the null handling explicit.
export type OperatorFor<V> = [V] extends [number | string]
  ? WhereOperator
  : Exclude<WhereOperator, RelationalOperator>;

// The value parameter of where(key, op, value): `in` takes a readonly pool
// of the field type, every other operator takes one field value (DESIGN 6).
export type WhereValue<V, Op extends WhereOperator> = Op extends "in" ? readonly V[] : V;

// Keys of T whose value type is assignable to V (non-distributive): the
// aggregate-key selector as KeysOfType<T, number>. A number | null or
// optional number field is rejected — aggregating it would poison the result
// to NaN at runtime, and a compile error beats silent NaN (DESIGN principle
// 5). The & string drops the undefined that optional properties leak into
// the key union and pins keys to strings.
export type KeysOfType<T, V> = {
  [K in keyof T]: [T[K]] extends [V] ? K : never;
}[keyof T] & string;

// Keys T can sort by: number | string once null/undefined are stripped.
// Sort pins null/undefined values to the END regardless of direction
// (DESIGN 7), so nullable orderable fields are sortable — but a field that
// can ONLY be null/undefined (NonNullable = never) has nothing to order by
// and is rejected, since never extends everything.
export type SortableKey<T> = {
  [K in keyof T]: [NonNullable<T[K]>] extends [never]
    ? never
    : [NonNullable<T[K]>] extends [number | string]
      ? K
      : never;
}[keyof T] & string;
