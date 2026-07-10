// Fluent builder (DESIGN section 5): a Query<T> is a reference to the source
// array plus a FROZEN list of pending ops. Every fluent call returns a NEW
// Query with one op appended (the receiver is never touched), and execute()
// interprets the list once, in call order. The fluent methods land one per
// task (3.2-3.10), each adding its op kind to the unions below.

import { evaluateWhere } from "./ops";
import type { WhereOperator } from "./ops";
import type { OperatorFor, WhereValue } from "./types";

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

export type OpDescription = WhereDescription | WherePredicateDescription;

// The internal pipeline op: identical to its public description for data
// ops, but a predicate where carries the actual function, which execute()
// needs and explain() must never hand out.
type PipelineOp<T> =
  | WhereDescription
  | { readonly kind: "where"; readonly predicate: (row: T) => boolean };

// The shared tail every fresh query starts from; typed never[] so one frozen
// constant serves every row type.
const NO_OPS: readonly never[] = Object.freeze([]);

// Every predicate where maps to this same frozen marker description.
const PREDICATE_DESCRIPTION: WherePredicateDescription = Object.freeze({
  kind: "where",
  predicate: true,
});

// Interprets one op against the current pipeline rows, returning a new
// array. Keyed descriptions store stringly keys (they must stay
// serializable), so the row is re-read as an unknown field value at the
// guarded-core boundary. A predicate is invoked with the row ALONE —
// Array.filter's index and array stay internal, honoring the
// (row: T) => boolean contract.
function applyOp<T extends object>(rows: T[], op: PipelineOp<T>): T[] {
  switch (op.kind) {
    case "where":
      return "predicate" in op
        ? rows.filter((row) => op.predicate(row))
        : rows.filter((row) =>
            evaluateWhere((row as Record<string, unknown>)[op.key], op.op, op.value),
          );
  }
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

  // Runs the pipeline over the source, one op at a time, in call order
  // (DESIGN section 7 pipeline-order row). The initial spread makes every
  // call return a NEW array of the ORIGINAL row references — no deep copy,
  // and the source is never mutated (DESIGN section 7 immutability row).
  execute(): T[] {
    let rows = [...this.#source];
    for (const op of this.#ops) {
      rows = applyOp(rows, op);
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

// Entry point: wrap a source array in a query with no pending ops. The
// engine only ever reads the source, so a readonly array is accepted.
export function query<T extends object>(source: readonly T[]): Query<T> {
  return new Query(source, NO_OPS);
}
