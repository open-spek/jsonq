// Fluent builder (DESIGN section 5): a Query<T> is a reference to the source
// array plus a FROZEN list of pending ops. Every fluent call returns a NEW
// Query with one op appended (the receiver is never touched), and execute()
// interprets the list once, in call order. This is the op-list skeleton
// (task 3.1): the fluent methods land one per task (3.2-3.10), each adding
// its op kind to the union below.

// Serializable op descriptions returned by explain(), discriminated by
// `kind` (DESIGN section 7 explain row). The union grows with each fluent
// method; the skeleton ships no ops yet, so it is still the empty union.
export type OpDescription = never;

// The shared tail every fresh query starts from. Frozen so explain() can
// hand the list out without a defensive copy and so no caller can smuggle
// ops into a pipeline.
const NO_OPS: readonly OpDescription[] = Object.freeze([]);

// The class is module-internal machinery: src/index.ts exports it TYPE-ONLY,
// so `new Query(...)` is not part of the public surface — construction goes
// through query(). Later fluent methods extend a query with
// `new Query(source, [...ops, op])`, which is what keeps branching safe.
export class Query<T extends object> {
  readonly #source: readonly T[];
  readonly #ops: readonly OpDescription[];

  constructor(source: readonly T[], ops: readonly OpDescription[]) {
    this.#source = source;
    this.#ops = ops;
  }

  // Runs the pipeline over the source. With no op kinds in the skeleton the
  // pipeline is the identity: a NEW array holding the ORIGINAL row
  // references — no deep copy, and the source is never mutated (DESIGN
  // section 7 immutability row).
  execute(): T[] {
    return [...this.#source];
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
