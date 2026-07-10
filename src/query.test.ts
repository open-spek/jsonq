import { describe, expect, test } from "bun:test";
import { query } from "./query";

interface User {
  id: number;
  name: string;
  tags: string[];
}

function makeUsers(): User[] {
  return [
    { id: 1, name: "ada", tags: ["math"] },
    { id: 2, name: "grace", tags: [] },
    { id: 3, name: "linus", tags: ["kernel", "vcs"] },
  ];
}

describe("execute() on a query with no ops (op-list skeleton)", () => {
  test("returns a NEW array, not the source array", () => {
    const users = makeUsers();
    const result = query(users).execute();
    expect(result).not.toBe(users);
    expect(result).toEqual(users);
  });

  test("result elements are the ORIGINAL row references, in source order", () => {
    const users = makeUsers();
    const result = query(users).execute();
    expect(result).toHaveLength(users.length);
    for (let i = 0; i < users.length; i += 1) {
      expect(result[i]).toBe(users[i]);
    }
  });

  test("every execute() call returns a fresh array", () => {
    const q = query(makeUsers());
    expect(q.execute()).not.toBe(q.execute());
  });

  test("mutating the result array leaves the source untouched", () => {
    const users = makeUsers();
    const q = query(users);
    const result = q.execute();
    result.pop();
    result.push({ id: 99, name: "intruder", tags: [] });
    expect(users).toEqual(makeUsers());
    expect(q.execute()).toEqual(makeUsers());
  });

  test("an empty source yields an empty new array", () => {
    const source: User[] = [];
    const result = query(source).execute();
    expect(result).toEqual([]);
    expect(result).not.toBe(source);
  });
});

describe("immutability of the source (DESIGN section 7)", () => {
  test("execute() never mutates the source array or its rows", () => {
    const users = makeUsers();
    const snapshot = structuredClone(users);
    query(users).execute();
    expect(users).toEqual(snapshot);
  });
});

describe("explain() on a query with no ops", () => {
  test("returns the empty op-description list", () => {
    expect(query(makeUsers()).explain()).toEqual([]);
  });

  test("the op list is frozen", () => {
    expect(Object.isFrozen(query(makeUsers()).explain())).toBe(true);
  });

  test("ops cannot be smuggled into the pipeline through explain()", () => {
    const ops = query(makeUsers()).explain() as unknown as string[];
    expect(() => {
      ops.push("bogus");
    }).toThrow(TypeError);
  });
});

describe("query independence (precursor to the 3.2 branching proof)", () => {
  // The full branching proof (one shared prefix extended two ways) needs a
  // fluent extending call and lands with where() in task 3.2. Pinned here:
  // queries built over one source share nothing mutable.
  test("two queries over the same source execute independently", () => {
    const users = makeUsers();
    const first = query(users);
    const second = query(users);
    const firstResult = first.execute();
    firstResult.pop();
    expect(second.execute()).toEqual(makeUsers());
    expect(firstResult).not.toBe(second.execute());
  });
});

describe("where(key, op, value): operator filtering (task 3.2)", () => {
  test("== keeps rows whose field deep-equals the value (array field, structural)", () => {
    const result = query(makeUsers()).where("tags", "==", ["math"]).execute();
    expect(result).toEqual([{ id: 1, name: "ada", tags: ["math"] }]);
  });

  test("!= keeps the complement", () => {
    const result = query(makeUsers()).where("name", "!=", "ada").execute();
    expect(result).toEqual([
      { id: 2, name: "grace", tags: [] },
      { id: 3, name: "linus", tags: ["kernel", "vcs"] },
    ]);
  });

  test("relational operators filter a number field", () => {
    const users = makeUsers();
    const ids = (op: "<" | "<=" | ">" | ">=", value: number): number[] =>
      query(users)
        .where("id", op, value)
        .execute()
        .map((user) => user.id);
    expect(ids("<", 2)).toEqual([1]);
    expect(ids("<=", 2)).toEqual([1, 2]);
    expect(ids(">", 2)).toEqual([3]);
    expect(ids(">=", 2)).toEqual([2, 3]);
  });

  test("relational operators on a string field use code-unit order", () => {
    const names = query(makeUsers())
      .where("name", ">", "b")
      .execute()
      .map((user) => user.name);
    expect(names).toEqual(["grace", "linus"]);
  });

  test("in keeps rows whose field deep-equals any pool member", () => {
    const ids = query(makeUsers())
      .where("id", "in", [1, 3])
      .execute()
      .map((user) => user.id);
    expect(ids).toEqual([1, 3]);
  });

  test("in accepts a readonly pool", () => {
    const pool: readonly string[] = ["ada", "linus"];
    const ids = query(makeUsers())
      .where("name", "in", pool)
      .execute()
      .map((user) => user.id);
    expect(ids).toEqual([1, 3]);
  });

  test("matched rows are the ORIGINAL row references", () => {
    const users = makeUsers();
    const result = query(users).where("id", ">", 1).execute();
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(users[1]);
    expect(result[1]).toBe(users[2]);
  });

  test("chained wheres AND together in call order", () => {
    const result = query(makeUsers()).where("id", ">", 1).where("name", "==", "grace").execute();
    expect(result).toEqual([{ id: 2, name: "grace", tags: [] }]);
  });

  test("a where with no matches yields an empty array", () => {
    expect(query(makeUsers()).where("name", "==", "nobody").execute()).toEqual([]);
  });

  test("filtering never mutates the source array or its rows", () => {
    const users = makeUsers();
    const snapshot = structuredClone(users);
    query(users).where("id", ">=", 2).execute();
    expect(users).toEqual(snapshot);
  });
});

describe("explain() with where ops (task 3.2)", () => {
  test("each where call adds one { kind: 'where' } description, in call order", () => {
    const plan = query(makeUsers()).where("id", ">", 1).where("name", "in", ["grace"]).explain();
    expect(plan).toEqual([
      { kind: "where", key: "id", op: ">", value: 1 },
      { kind: "where", key: "name", op: "in", value: ["grace"] },
    ]);
  });

  test("descriptions are serializable: they survive a JSON round-trip", () => {
    const plan = query(makeUsers()).where("tags", "==", ["math"]).explain();
    expect(JSON.parse(JSON.stringify(plan))).toEqual([
      { kind: "where", key: "tags", op: "==", value: ["math"] },
    ]);
  });

  test("the extended op list and its descriptions are frozen", () => {
    const plan = query(makeUsers()).where("id", ">", 1).explain();
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan[0])).toBe(true);
  });
});

describe("branching: extensions of a shared prefix are independent (deferred 3.1 proof)", () => {
  test("where() returns a new query and leaves the receiver untouched", () => {
    const base = query(makeUsers());
    const extended = base.where("id", ">", 1);
    expect(extended).not.toBe(base);
    expect(base.explain()).toEqual([]);
    expect(base.execute()).toEqual(makeUsers());
  });

  test("two queries extended from one shared prefix stay independent", () => {
    const prefix = query(makeUsers()).where("id", ">", 1);
    const graceOnly = prefix.where("name", "==", "grace");
    const linusOnly = prefix.where("name", "==", "linus");

    expect(graceOnly.execute().map((user) => user.name)).toEqual(["grace"]);
    expect(linusOnly.execute().map((user) => user.name)).toEqual(["linus"]);
    expect(prefix.execute().map((user) => user.name)).toEqual(["grace", "linus"]);

    expect(prefix.explain()).toHaveLength(1);
    expect(graceOnly.explain()).toHaveLength(2);
    expect(linusOnly.explain()).toHaveLength(2);
  });
});
