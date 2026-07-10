// Fluent builder (DESIGN section 5): a Query<T> is a reference to the source
// array plus a FROZEN list of pending ops. Every fluent call returns a NEW
// Query with one op appended (the receiver is never touched), and execute()
// interprets the list once, in call order. The fluent methods land one per
// task (3.2-3.10), each adding its op kind to the unions below.

import { compareForSort, computeAggregate, evaluateWhere } from "./ops";
import type { AggregateKind, SortDirection, WhereOperator } from "./ops";
import type { KeysOfType, OperatorFor, SortableKey, WhereValue } from "./types";

// Serializable op descriptions returned by explain(), discriminated by
// `kind` (DESIGN section 7 explain row). Keys are recorded as plain strings
// and values by reference, so a description is JSON-serializable whenever
// the query's own values are (rows are JSON values by contract). A predicate
// where is reduced to the `predicate: true` marker — functions do not
// serialize, so the plan records only that a predicate filter runs there.
type WhereDescription = {
  readonly kind: "where";
  readonly key: string;
  readonly op: WhereOperator;
  readonly value: unknown;
};

type WherePredicateDescription = {
  readonly kind: "where";
  readonly predicate: true;
};

type SortDescription = {
  readonly kind: "sort";
  readonly key: string;
  readonly direction: SortDirection;
};

type LimitDescription = {
  readonly kind: "limit";
  readonly count: number;
};

type SelectDescription = {
  readonly kind: "select";
  readonly keys: readonly string[];
};

export type OpDescription =
  | WhereDescription
  | WherePredicateDescription
  | SortDescription
  | LimitDescription
  | SelectDescription;

// The internal pipeline op: identical to its public description for data
// ops, but a predicate where carries the actual function, which execute()
// needs and explain() must never hand out.
type PipelineOp<T> =
  | WhereDescription
  | { readonly kind: "where"; readonly predicate: (row: T) => boolean }
  | SortDescription
  | LimitDescription
  | SelectDescription;

// The shared tail every fresh query starts from; typed never[] so one frozen
// constant serves every row type.
const NO_OPS: readonly never[] = Object.freeze([]);

// Every predicate where maps to this same frozen marker description.
const PREDICATE_DESCRIPTION: WherePredicateDescription = Object.freeze({
  kind: "where",
  predicate: true,
});

// Interprets one non-sort op against the current pipeline rows, returning a
// new array (sort ops travel as runs through applySortRun). Keyed
// descriptions store stringly keys (they must stay serializable), so the row
// is re-read as an unknown field value at the guarded-core boundary. A
// predicate is invoked with the row ALONE — Array.filter's index and array
// stay internal, honoring the (row: T) => boolean contract. A select maps
// each row to a new object carrying only the named keys the row actually
// HAS (absence is data, preserved as such); field values copy by reference,
// never deeply. After a select the pipeline rows are no longer T-shaped —
// the cast at the end of that arm is where the row-type change happens at
// runtime, mirroring the Query<Pick<T, K>> re-branding in select().
function applyOp<T extends object>(
  rows: T[],
  op: Exclude<PipelineOp<T>, SortDescription>,
): T[] {
  switch (op.kind) {
    case "where":
      return "predicate" in op
        ? rows.filter((row) => op.predicate(row))
        : rows.filter((row) =>
            evaluateWhere((row as Record<string, unknown>)[op.key], op.op, op.value),
          );
    case "limit":
      return rows.slice(0, op.count);
    case "select":
      return rows.map((row) => {
        const projected: Record<string, unknown> = {};
        for (const key of op.keys) {
          if (Object.hasOwn(row, key)) {
            projected[key] = (row as Record<string, unknown>)[key];
          }
        }
        return projected as T;
      });
  }
}

// Consecutive sort ops compose as ONE multi-key ordering — the FIRST call is
// the primary key and each later call breaks ties, like SQL ORDER BY a, b
// (DESIGN section 7 sort row). Grouping happens here at interpretation time,
// so the op list stays one entry per fluent call and explain() never shows a
// merged op. Any other op ends the run: the earlier sort must materialize
// its order at its own pipeline position (a limit between two sorts
// truncates the FIRST ordering), so a later sort starts a fresh run and the
// prior order survives only through stability.
function groupSortRuns<T extends object>(
  ops: readonly PipelineOp<T>[],
): (Exclude<PipelineOp<T>, SortDescription> | SortDescription[])[] {
  const steps: (Exclude<PipelineOp<T>, SortDescription> | SortDescription[])[] = [];
  for (const op of ops) {
    const previous = steps[steps.length - 1];
    if (op.kind !== "sort") {
      steps.push(op);
    } else if (Array.isArray(previous)) {
      previous.push(op);
    } else {
      steps.push([op]);
    }
  }
  return steps;
}

// Applies one composed sort run: rows compare key by key in run order until
// a key breaks the tie, each key keeping its own direction and its own
// nulls-last ranking. Rows equal on EVERY key compare 0, so the stable
// native sort keeps their pipeline order.
function applySortRun<T extends object>(rows: T[], run: readonly SortDescription[]): T[] {
  return [...rows].sort((a, b) => {
    for (const op of run) {
      const order = compareForSort(
        (a as Record<string, unknown>)[op.key],
        (b as Record<string, unknown>)[op.key],
        op.direction,
      );
      if (order !== 0) {
        return order;
      }
    }
    return 0;
  });
}

// Maps an internal op to its public, serializable description: data ops ARE
// their own (frozen) descriptions; a predicate op is reduced to the marker.
function describeOp<T extends object>(op: PipelineOp<T>): OpDescription {
  return "predicate" in op ? PREDICATE_DESCRIPTION : op;
}

// The class is module-internal machinery: src/index.ts exports it TYPE-ONLY,
// so `new Query(...)` is not part of the public surface — construction goes
// through query(). Fluent methods extend a query via #extend, which builds a
// NEW Query over the same source; that is what keeps branching safe.
export class Query<T extends object> {
  readonly #source: readonly T[];
  readonly #ops: readonly PipelineOp<T>[];

  constructor(source: readonly T[], ops: readonly PipelineOp<T>[]) {
    this.#source = source;
    this.#ops = ops;
  }

  // Appends one op to a frozen copy of the list. The op object is frozen
  // too, so a keyed description handed out by explain() cannot be edited to
  // alter the pipeline (freeze is shallow — see the 3.2 PROGRESS note).
  #extend(op: PipelineOp<T>): Query<T> {
    return new Query(this.#source, Object.freeze([...this.#ops, Object.freeze(op)]));
  }

  // Typed operator filtering (DESIGN section 6). Op is captured as its own
  // type parameter so the value type can pivot on the operator actually
  // written: `in` takes a readonly pool of T[K], every other op takes T[K].
  where<K extends keyof T & string, Op extends OperatorFor<T[K]>>(
    key: K,
    op: Op,
    value: WhereValue<T[K], Op>,
  ): Query<T>;
  // Typed escape hatch (DESIGN section 6): declared last so the plain method
  // type resolves to it, and everything the operator table cannot express
  // stays available without losing the row type.
  where(predicate: (row: T) => boolean): Query<T>;
  where(
    ...args:
      | [key: string, op: WhereOperator, value: unknown]
      | [predicate: (row: T) => boolean]
  ): Query<T> {
    if (args.length === 1) {
      return this.#extend({ kind: "where", predicate: args[0] });
    }
    const [key, op, value] = args;
    return this.#extend({ kind: "where", key, op, value });
  }

  // Stable ordering at this pipeline position (DESIGN section 7 sort row):
  // only number | string keys are sortable, nullable ones included —
  // null/undefined values sort LAST regardless of direction. Directly
  // chained sort calls compose as tie-breakers with the FIRST call primary
  // (see groupSortRuns). The resolved direction is recorded explicitly, so
  // a serialized plan never depends on knowing the default.
  sort(key: SortableKey<T>, direction: SortDirection = "asc"): Query<T> {
    return this.#extend({ kind: "sort", key, direction });
  }

  // Keeps the first n rows at this pipeline position (DESIGN section 7 limit
  // row): limit(k).where(...) truncates first and filters second. A negative
  // or non-integer n is a bug at the CALL site, so it throws here — fail
  // fast, not at execute. This TypeError and the empty-set RangeError are
  // the engine's only runtime errors (DESIGN section 7 runtime-errors row).
  limit(n: number): Query<T> {
    if (!Number.isInteger(n) || n < 0) {
      throw new TypeError(`limit(${String(n)}) requires a non-negative integer`);
    }
    return this.#extend({ kind: "limit", count: n });
  }

  // Projection (DESIGN section 7 select row): from this op on, every row is
  // a NEW object carrying only the named keys, so this is the one fluent
  // call that changes the row type — a selected-away key must not compile in
  // any later call. The description records the keys verbatim (duplicates
  // included: explain() reflects the call) and freezes them; a rest argument
  // is a fresh array, so freezing in place is safe. K defaults to never so a
  // zero-key select types as the empty projection it is at runtime — without
  // the default, inference falls back to the CONSTRAINT and the type would
  // claim every key survives. The cast is sound because ops interpret
  // positionally: everything already recorded runs BEFORE this select and
  // still sees the wider pre-projection rows, and the source array only ever
  // feeds the pipeline's first step.
  select<K extends keyof T & string = never>(...keys: K[]): Query<Pick<T, K>> {
    return this.#extend({ kind: "select", keys: Object.freeze(keys) }) as unknown as Query<
      Pick<T, K>
    >;
  }

  // Grouping (DESIGN section 6): hands the pipeline to a GroupedQuery over
  // this query — a stage change, not a recorded op, so the receiver keeps
  // its plan and stays reusable, and no groupBy entry appears in explain()
  // (the grouped stage has no explain of its own). ANY key is groupable:
  // grouping is SameValueZero on the raw value, so no orderability
  // constraint applies (see GroupedQuery for the key-equality fine print).
  groupBy<K extends keyof T & string>(key: K): GroupedQuery<T, K> {
    return new GroupedQuery(this, key);
  }

  // Ungrouped aggregates (DESIGN section 6): terminal reads that run the
  // full pipeline and reduce the result in one step. No op is recorded, so
  // the receiver and its plan stay untouched and reusable. count counts
  // whole rows and needs no key; the numeric aggregates accept only
  // exact-number keys (KeysOfType<T, number> — nullable and optional number
  // fields are out, because a compile error beats a NaN-poisoned result).
  // The empty-set semantics — count/sum -> 0, avg/min/max -> RangeError
  // naming the aggregate and the key — surface directly from the guarded
  // core (DESIGN section 7 empty-set row).
  count(): number {
    return computeAggregate(this.execute(), "count");
  }

  sum(key: KeysOfType<T, number>): number {
    return this.#aggregate("sum", key);
  }

  avg(key: KeysOfType<T, number>): number {
    return this.#aggregate("avg", key);
  }

  min(key: KeysOfType<T, number>): number {
    return this.#aggregate("min", key);
  }

  max(key: KeysOfType<T, number>): number {
    return this.#aggregate("max", key);
  }

  // Extracts the keyed field value from every pipeline row, then hands the
  // numeric semantics to the guarded core (1.4 convention: ops.ts receives
  // extracted values, never rows or keys to read on its own).
  #aggregate(kind: Exclude<AggregateKind, "count">, key: string): number {
    const values = this.execute().map((row) => (row as Record<string, unknown>)[key]);
    return computeAggregate(values, kind, key);
  }

  // Runs the pipeline over the source, one step at a time, in call order
  // (DESIGN section 7 pipeline-order row); a step is a single op or a run
  // of consecutive sorts composed into one ordering. The initial spread
  // makes every call return a NEW array of the ORIGINAL row references — no
  // deep copy, and the source is never mutated (DESIGN section 7
  // immutability row).
  execute(): T[] {
    let rows = [...this.#source];
    for (const step of groupSortRuns(this.#ops)) {
      rows = Array.isArray(step) ? applySortRun(rows, step) : applyOp(rows, step);
    }
    return rows;
  }

  // One serializable description per fluent call, in call order (DESIGN
  // section 7 explain row). A predicate op must not leak its function, so
  // the plan is a frozen mapped copy, not the internal op list itself.
  explain(): readonly OpDescription[] {
    return Object.freeze(this.#ops.map((op) => describeOp(op)));
  }
}

// The grouped stage (DESIGN section 6): a base query plus a grouping key,
// created only by groupBy() — like Query, the constructor is module-internal
// and src/index.ts exports the class TYPE-ONLY. execute() runs the base
// pipeline first (every op before groupBy applies in call order), then
// partitions the rows into a native Map, whose key equality is SameValueZero:
// NaN key values form one group, +0/-0 collide, and — the documented
// limitation of the DESIGN section 7 groupBy row — key values that are
// objects group by REFERENCE, not by the deep structural equality that
// where() uses. Groups appear in first-seen order (Map insertion order) and
// rows keep pipeline order within a group. aggregate(spec) lands in 3.10.
export class GroupedQuery<T extends object, K extends keyof T> {
  readonly #base: Query<T>;
  readonly #key: K;

  constructor(base: Query<T>, key: K) {
    this.#base = base;
    this.#key = key;
  }

  // A fresh Map of fresh group arrays on every call; the arrays hold the
  // ORIGINAL row references (no deep copy — DESIGN section 7 immutability
  // row), so grouped execution mutates nothing and shares nothing between
  // calls.
  execute(): Map<T[K], T[]> {
    const groups = new Map<T[K], T[]>();
    for (const row of this.#base.execute()) {
      const keyValue = row[this.#key];
      const group = groups.get(keyValue);
      if (group) {
        group.push(row);
      } else {
        groups.set(keyValue, [row]);
      }
    }
    return groups;
  }
}

// Entry point: wrap a source array in a query with no pending ops. The
// engine only ever reads the source, so a readonly array is accepted.
export function query<T extends object>(source: readonly T[]): Query<T> {
  return new Query(source, NO_OPS);
}
