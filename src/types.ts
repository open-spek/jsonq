// Compile-time type machinery (DESIGN section 5): the operator table, the
// op-dependent where-value type, and the key selectors that make invalid
// queries fail to compile. Erased at runtime — this module is only ever
// touched via `import type` and ships as pure declarations. The operator
// name unions themselves live in ops.ts (the runtime switch is exhaustive
// over them); importing them type-only keeps one source of truth.

import type { AggregateKind, RelationalOperator, WhereOperator } from "./ops";

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

// Aggregate spec descriptors (DESIGN section 6, the agg namespace). A
// descriptor is plain data: agg.count() carries only its kind, the numeric
// constructors carry kind + the key they reduce. Constructors accept ANY
// string key — the row type is unknowable when a bare agg.sum("price") is
// written — so key validity is enforced where the spec meets a row type:
// the AggSpec<T> constraint on aggregate(spec).
export type AggCount = { readonly kind: "count" };

export type AggNumeric<Kind extends Exclude<AggregateKind, "count">, K extends string> = {
  readonly kind: Kind;
  readonly key: K;
};

// One legal spec entry for row type T: count, or a numeric aggregate over an
// exact-number key (nullable/optional number fields are out — see KeysOfType).
export type AggSpecEntry<T> =
  | AggCount
  | AggNumeric<Exclude<AggregateKind, "count">, KeysOfType<T, number>>;

export type AggSpec<T> = Readonly<Record<string, AggSpecEntry<T>>>;

// Every v1 aggregate yields a number, so a spec's result maps its names to
// number (DESIGN section 7 aggregate row).
export type AggResult<S> = { [Name in keyof S]: number };

// One aggregate result row: the group key under `key` plus the spec's
// numbers — the DESIGN section 6 `{ key: T[K] } & AggResult<S>` intersection
// written as a single flat mapped type, so inferred results read (and
// type-test) as one named object shape. A spec name of `key` wins its slot,
// mirroring the runtime, where spec columns overwrite the key column.
export type AggRow<KeyValue, S> = {
  [Name in keyof S | "key"]: Name extends keyof S ? AggResult<S>[Name] : KeyValue;
};
