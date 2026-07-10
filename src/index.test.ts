import { expect, test } from "bun:test";
import { query } from "./index";

test("public surface: query() builds an executable query end to end", () => {
  const rows = [
    { id: 1, name: "ada" },
    { id: 2, name: "grace" },
    { id: 3, name: "linus" },
  ];
  const q = query(rows)
    .where("id", ">", 1)
    .sort("id", "desc")
    .limit(1)
    .where((row) => row.id > 2)
    .select("id");
  expect(q.execute()).toEqual([{ id: 3 }]);
  expect(q.explain()).toEqual([
    { kind: "where", key: "id", op: ">", value: 1 },
    { kind: "sort", key: "id", direction: "desc" },
    { kind: "limit", count: 1 },
    { kind: "where", predicate: true },
    { kind: "select", keys: ["id"] },
  ]);
});
