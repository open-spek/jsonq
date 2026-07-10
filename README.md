# jsonq

> Status: pre-alpha. Spec locked; being built autonomously by a test-gated agent loop.

**jsonq is the query engine where an invalid query does not compile.**

A small, readable, fully type-safe fluent query engine for in-memory JSON arrays, in pure
TypeScript with zero runtime dependencies.

```ts
import { query, agg } from "jsonq";

const adults = query(users)
  .where("age", ">", 18)          // ">" only compiles on number/string fields
  .where("country", "==", "TR")   // value is locked to typeof users[n].country
  .sort("name")
  .limit(10)
  .execute();                     // User[] — a new array; the source is never mutated

query(orders)
  .groupBy("customerId")
  .aggregate({ n: agg.count(), total: agg.sum("price") });
  // Array<{ key: string; n: number; total: number }> — inferred from the spec
```

- The full API contract and pinned semantics: [`docs/DESIGN.md`](./docs/DESIGN.md)
- What this refuses to be: [`MANIFESTO.md`](./MANIFESTO.md)
- How it is being built (autonomous loop): [`loop/LOOP-ENGINEERING.md`](./loop/LOOP-ENGINEERING.md)

This README will grow verified usage examples as the build lands them; examples here are
executed before being written down.
