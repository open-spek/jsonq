import { expect, test } from "bun:test";
import { agg, query } from "./index";

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
  expect(query(rows).where("id", ">", 1).count()).toBe(2);
  expect(query(rows).sum("id")).toBe(6);
  const groups = query(rows).where("id", ">", 1).groupBy("name").execute();
  expect([...groups.keys()]).toEqual(["grace", "linus"]);
  expect(groups.get("grace")).toEqual([{ id: 2, name: "grace" }]);
  expect(query(rows).groupBy("name").aggregate({ n: agg.count(), maxId: agg.max("id") })).toEqual([
    { key: "ada", n: 1, maxId: 1 },
    { key: "grace", n: 1, maxId: 2 },
    { key: "linus", n: 1, maxId: 3 },
  ]);
});
