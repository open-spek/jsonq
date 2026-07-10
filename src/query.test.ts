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

describe("where(predicate): typed escape hatch (task 3.3)", () => {
  test("keeps exactly the rows for which the predicate returns true", () => {
    const result = query(makeUsers())
      .where((user) => user.id % 2 === 1)
      .execute();
    expect(result.map((user) => user.name)).toEqual(["ada", "linus"]);
  });

  test("matched rows are the ORIGINAL row references", () => {
    const users = makeUsers();
    const result = query(users)
      .where((user) => user.id > 1)
      .execute();
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(users[1]);
    expect(result[1]).toBe(users[2]);
  });

  test("predicate and operator wheres chain in call order (overloads coexist)", () => {
    const result = query(makeUsers())
      .where("id", ">", 1)
      .where((user) => user.name.startsWith("g"))
      .execute();
    expect(result).toEqual([{ id: 2, name: "grace", tags: [] }]);
  });

  test("the predicate sees only rows that survived earlier pipeline ops", () => {
    const seen: string[] = [];
    query(makeUsers())
      .where("id", ">", 1)
      .where((user) => {
        seen.push(user.name);
        return true;
      })
      .execute();
    expect(seen).toEqual(["grace", "linus"]);
  });

  test("the predicate is called with the row alone (filter index/array stay internal)", () => {
    const argCounts: number[] = [];
    const spy = (...args: unknown[]): boolean => {
      argCounts.push(args.length);
      return true;
    };
    query(makeUsers()).where(spy).execute();
    expect(argCounts).toEqual([1, 1, 1]);
  });

  test("a predicate with no matches yields an empty array", () => {
    const result = query(makeUsers())
      .where(() => false)
      .execute();
    expect(result).toEqual([]);
  });

  test("predicate filtering never mutates the source array or its rows", () => {
    const users = makeUsers();
    const snapshot = structuredClone(users);
    query(users)
      .where((user) => user.id >= 2)
      .execute();
    expect(users).toEqual(snapshot);
  });

  test("branching: predicate extensions of a shared prefix stay independent", () => {
    const prefix = query(makeUsers()).where((user) => user.id > 1);
    const graceOnly = prefix.where((user) => user.name === "grace");
    const linusOnly = prefix.where("name", "==", "linus");
    expect(graceOnly.execute().map((user) => user.name)).toEqual(["grace"]);
    expect(linusOnly.execute().map((user) => user.name)).toEqual(["linus"]);
    expect(prefix.execute().map((user) => user.name)).toEqual(["grace", "linus"]);
  });
});

describe("explain() with a predicate where (task 3.3)", () => {
  test("a predicate op is described as { kind: 'where', predicate: true }", () => {
    const plan = query(makeUsers())
      .where((user) => user.id > 1)
      .explain();
    expect(plan).toEqual([{ kind: "where", predicate: true }]);
  });

  test("the description never carries the function itself", () => {
    const plan = query(makeUsers())
      .where((user) => user.id > 1)
      .explain();
    const values = Object.values(plan[0] ?? {});
    expect(values.some((value) => typeof value === "function")).toBe(false);
  });

  test("a mixed plan survives a JSON round-trip in call order", () => {
    const plan = query(makeUsers())
      .where("id", ">", 1)
      .where((user) => user.name !== "grace")
      .where("name", "in", ["ada", "linus"])
      .explain();
    expect(JSON.parse(JSON.stringify(plan))).toEqual([
      { kind: "where", key: "id", op: ">", value: 1 },
      { kind: "where", predicate: true },
      { kind: "where", key: "name", op: "in", value: ["ada", "linus"] },
    ]);
  });

  test("the plan and its predicate description are frozen", () => {
    const plan = query(makeUsers())
      .where((user) => user.id > 1)
      .explain();
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan[0])).toBe(true);
  });
});

describe("limit(n): call-time validation (task 3.4)", () => {
  test("a negative n throws TypeError at CALL time, not at execute", () => {
    const q = query(makeUsers());
    expect(() => q.limit(-1)).toThrow(TypeError);
    expect(() => q.limit(-1)).toThrow("limit(-1) requires a non-negative integer");
  });

  test("a non-integer n throws TypeError at CALL time", () => {
    const q = query(makeUsers());
    expect(() => q.limit(1.5)).toThrow(TypeError);
    expect(() => q.limit(1.5)).toThrow("limit(1.5) requires a non-negative integer");
  });

  test("NaN and Infinity are non-integers and throw TypeError", () => {
    const q = query(makeUsers());
    expect(() => q.limit(Number.NaN)).toThrow(TypeError);
    expect(() => q.limit(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  test("a throwing limit() call leaves the receiver untouched", () => {
    const q = query(makeUsers()).where("id", ">", 0);
    expect(() => q.limit(-1)).toThrow(TypeError);
    expect(q.explain()).toHaveLength(1);
    expect(q.execute()).toEqual(makeUsers());
  });
});

describe("limit(n): truncation at its pipeline position (task 3.4)", () => {
  test("limit(0) yields an empty result", () => {
    expect(query(makeUsers()).limit(0).execute()).toEqual([]);
  });

  test("keeps the first n rows, as ORIGINAL row references", () => {
    const users = makeUsers();
    const result = query(users).limit(2).execute();
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(users[0]);
    expect(result[1]).toBe(users[1]);
  });

  test("an n beyond the row count keeps every row", () => {
    expect(query(makeUsers()).limit(99).execute()).toEqual(makeUsers());
  });

  test("limit(k).where(...) truncates FIRST, filters second (call order)", () => {
    // Truncating [1, 2, 3] to its first two rows leaves only id 2 able to
    // match id > 1; filtering first would have kept both 2 and 3.
    const ids = query(makeUsers())
      .limit(2)
      .where("id", ">", 1)
      .execute()
      .map((user) => user.id);
    expect(ids).toEqual([2]);
  });

  test("where(...).limit(k) filters first, truncates second", () => {
    const ids = query(makeUsers())
      .where("id", ">", 1)
      .limit(1)
      .execute()
      .map((user) => user.id);
    expect(ids).toEqual([2]);
  });

  test("chained limits each apply at their own position", () => {
    const ids = query(makeUsers())
      .limit(2)
      .limit(1)
      .execute()
      .map((user) => user.id);
    expect(ids).toEqual([1]);
  });

  test("truncation never mutates the source array or its rows", () => {
    const users = makeUsers();
    const snapshot = structuredClone(users);
    query(users).limit(1).execute();
    expect(users).toEqual(snapshot);
  });

  test("branching: limit extensions of a shared prefix stay independent", () => {
    const prefix = query(makeUsers()).where("id", ">", 1);
    const one = prefix.limit(1);
    const all = prefix.limit(99);
    expect(one.execute().map((user) => user.id)).toEqual([2]);
    expect(all.execute().map((user) => user.id)).toEqual([2, 3]);
    expect(prefix.explain()).toHaveLength(1);
  });
});

describe("explain() with limit ops: call order across mixed pipelines (task 3.4)", () => {
  test("each limit call adds one { kind: 'limit', count } description", () => {
    const plan = query(makeUsers()).limit(2).explain();
    expect(plan).toEqual([{ kind: "limit", count: 2 }]);
  });

  test("a mixed pipeline lists ops in exactly call order", () => {
    const plan = query(makeUsers())
      .where("id", ">", 0)
      .limit(2)
      .where((user) => user.id > 1)
      .limit(1)
      .explain();
    expect(plan).toEqual([
      { kind: "where", key: "id", op: ">", value: 0 },
      { kind: "limit", count: 2 },
      { kind: "where", predicate: true },
      { kind: "limit", count: 1 },
    ]);
  });

  test("limit descriptions survive a JSON round-trip", () => {
    const plan = query(makeUsers()).limit(3).where("name", "==", "ada").explain();
    expect(JSON.parse(JSON.stringify(plan))).toEqual([
      { kind: "limit", count: 3 },
      { kind: "where", key: "name", op: "==", value: "ada" },
    ]);
  });

  test("the plan and its limit description are frozen", () => {
    const plan = query(makeUsers()).limit(1).explain();
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
