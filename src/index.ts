// Public surface (DESIGN section 5): query(), the agg aggregate-spec
// namespace, and the public types. Query and GroupedQuery are exported
// type-only so their constructors stay internal — queries are built with
// query() and extended only through the fluent methods.
export { agg, query } from "./query";
export type { GroupedQuery, OpDescription, Query } from "./query";
export type { AggCount, AggNumeric, AggResult, AggRow, AggSpec, AggSpecEntry } from "./types";
