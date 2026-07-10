import { expect, test } from "bun:test";
import { query } from "./index";

test("public surface: query() builds an executable query end to end", () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const q = query(rows)
    .where("id", ">", 1)
    .limit(1)
    .where((row) => row.id < 3);
  expect(q.execute()).toEqual([{ id: 2 }]);
  expect(q.explain()).toEqual([
    { kind: "where", key: "id", op: ">", value: 1 },
    { kind: "limit", count: 1 },
    { kind: "where", predicate: true },
  ]);
});
