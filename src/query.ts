// Fluent builder (DESIGN section 5): a Query<T> is a reference to the source
// array plus a FROZEN list of pending ops. Every fluent call returns a NEW
// Query with one op appended (the receiver is never touched), and execute()
// interprets the list once, in call order. The fluent methods land one per
// task (3.2-3.10), each adding its op kind to the union below.

import { evaluateWhere } from "./ops";
import type { WhereOperator } from "./ops";
import type { OperatorFor, WhereValue } from "./types";

// Serializable op descriptions returned by explain(), discriminated by
// `kind` (DESIGN section 7 explain row). Keys are recorded as plain strings
// and values by reference, so a description is JSON-serializable whenever
// the query's own values are (rows are JSON values by contract).
export type OpDescription = {
  readonly kind: "where";
  readonly key: string;
  readonly op: WhereOperator;
  readonly value: unknown;
};

// The shared tail every fresh query starts from. Frozen so explain() can
// hand the list out without a defensive copy and so no caller can smuggle
// ops into a pipeline.
const NO_OPS: readonly OpDescription[] = Object.freeze([]);

// Interprets one op against the current pipeline rows, returning a new
// array. Descriptions store stringly keys (they must stay serializable), so
// the row is re-read as an unknown field value at the guarded-core boundary.
function applyOp<T extends object>(rows: T[], op: OpDescription): T[] {
  switch (op.kind) {
    case "where":
      return rows.filter((row) =>
        evaluateWhere((row as Record<string, unknown>)[op.key], op.op, op.value),
      );
  }
}

// The class is module-internal machinery: src/index.ts exports it TYPE-ONLY,
// so `new Query(...)` is not part of the public surface — construction goes
// through query(). Fluent methods extend a query via #extend, which builds a
// NEW Query over the same source; that is what keeps branching safe.
export class Query<T extends object> {
  readonly #source: readonly T[];
  readonly #ops: readonly OpDescription[];

  constructor(source: readonly T[], ops: readonly OpDescription[]) {
    this.#source = source;
    this.#ops = ops;
  }

  // Appends one op description to a frozen copy of the list. The description
  // itself is frozen too, so a plan handed out by explain() cannot be edited
  // to alter the pipeline (freeze is shallow — see the 3.2 PROGRESS note).
  #extend(op: OpDescription): Query<T> {
    return new Query(this.#source, Object.freeze([...this.#ops, Object.freeze(op)]));
  }

  // Typed operator filtering (DESIGN section 6). Op is captured as its own
  // type parameter so the value type can pivot on the operator actually
  // written: `in` takes a readonly pool of T[K], every other op takes T[K].
  where<K extends keyof T & string, Op extends OperatorFor<T[K]>>(
    key: K,
    op: Op,
    value: WhereValue<T[K], Op>,
  ): Query<T> {
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

  // The pending ops, one serializable description per fluent call, in call
  // order (DESIGN section 7 explain row).
  explain(): readonly OpDescription[] {
    return this.#ops;
  }
}

// Entry point: wrap a source array in a query with no pending ops. The
// engine only ever reads the source, so a readonly array is accepted.
export function query<T extends object>(source: readonly T[]): Query<T> {
  return new Query(source, NO_OPS);
}
