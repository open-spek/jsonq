// Public surface (DESIGN section 5): query() plus the public types. Query is
// exported type-only so the constructor stays internal — queries are built
// with query() and extended only through the fluent methods. The agg
// aggregate-spec namespace lands with grouped aggregates (task 3.10).
export { query } from "./query";
export type { OpDescription, Query } from "./query";
