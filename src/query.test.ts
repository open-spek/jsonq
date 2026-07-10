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

// Sort fixture (task 3.5): plays has duplicates (stability) and values whose
// numeric and lexicographic orders differ (9 < 100 numerically, "100" < "9"
// as strings); rating is optional AND nullable so both null and undefined
// nulls-last cases are reachable through the typed API.
interface Track {
  id: number;
  title: string;
  plays: number;
  rating?: number | null;
}

function makeTracks(): Track[] {
  return [
    { id: 1, title: "delta", plays: 100, rating: 5 },
    { id: 2, title: "alpha", plays: 9 },
    { id: 3, title: "echo", plays: 20, rating: null },
    { id: 4, title: "bravo", plays: 100, rating: 1 },
    { id: 5, title: "charlie", plays: 9, rating: 3 },
  ];
}

function sortedIds(q: { execute(): Track[] }): number[] {
  return q.execute().map((track) => track.id);
}

describe("sort(key, direction?): single-key ordering (task 3.5)", () => {
  test("ascending is the default direction", () => {
    expect(sortedIds(query(makeTracks()).sort("title"))).toEqual([2, 4, 5, 1, 3]);
  });

  test("explicit 'asc' matches the default", () => {
    expect(query(makeTracks()).sort("title", "asc").execute()).toEqual(
      query(makeTracks()).sort("title").execute(),
    );
  });

  test("numbers sort numerically, not lexicographically", () => {
    // lexicographic order would put "100" before "9"
    expect(sortedIds(query(makeTracks()).sort("plays"))).toEqual([2, 5, 3, 1, 4]);
  });

  test("desc reverses the orderable values", () => {
    expect(sortedIds(query(makeTracks()).sort("plays", "desc"))).toEqual([1, 4, 3, 2, 5]);
  });

  test("the sort is stable: equal keys keep pipeline order", () => {
    // plays 9: id 2 before id 5 (source order); plays 100: id 1 before id 4
    expect(sortedIds(query(makeTracks()).sort("plays"))).toEqual([2, 5, 3, 1, 4]);
    expect(sortedIds(query(makeTracks()).sort("plays", "desc"))).toEqual([1, 4, 3, 2, 5]);
  });

  test("null and undefined values sort LAST ascending, in pipeline order", () => {
    // ratings 1, 3, 5 first; then id 2 (undefined) before id 3 (null)
    expect(sortedIds(query(makeTracks()).sort("rating"))).toEqual([4, 5, 1, 2, 3]);
  });

  test("null and undefined values sort LAST descending too", () => {
    expect(sortedIds(query(makeTracks()).sort("rating", "desc"))).toEqual([1, 5, 4, 2, 3]);
  });

  test("sorted rows are the ORIGINAL row references", () => {
    const tracks = makeTracks();
    const result = query(tracks).sort("title").execute();
    expect(result[0]).toBe(tracks[1]);
    expect(result[4]).toBe(tracks[2]);
  });

  test("sorting never mutates the source array or its rows", () => {
    const tracks = makeTracks();
    const snapshot = structuredClone(tracks);
    query(tracks).sort("plays", "desc").execute();
    expect(tracks).toEqual(snapshot);
  });

  test("sorting an empty source yields an empty array", () => {
    expect(query([] as Track[]).sort("title").execute()).toEqual([]);
  });

  test("sort applies at its pipeline position: sort-then-limit keeps the smallest", () => {
    expect(sortedIds(query(makeTracks()).sort("plays").limit(2))).toEqual([2, 5]);
  });

  test("limit-then-sort truncates FIRST, orders second (call order)", () => {
    // truncating to the first two rows leaves ids 1 and 2; sorting them by
    // plays ascending gives [2, 1] — sorting first would have given [2, 5]
    expect(sortedIds(query(makeTracks()).limit(2).sort("plays"))).toEqual([2, 1]);
  });

  test("branching: sort extensions of a shared prefix stay independent", () => {
    const prefix = query(makeTracks()).where("plays", ">", 9);
    const byTitle = prefix.sort("title");
    const byPlaysDesc = prefix.sort("plays", "desc");
    expect(sortedIds(byTitle)).toEqual([4, 1, 3]);
    expect(sortedIds(byPlaysDesc)).toEqual([1, 4, 3]);
    expect(sortedIds(prefix)).toEqual([1, 3, 4]);
    expect(prefix.explain()).toHaveLength(1);
  });
});

describe("explain() with sort ops (task 3.5)", () => {
  test("a sort call adds one { kind: 'sort', key, direction } description", () => {
    expect(query(makeTracks()).sort("plays", "desc").explain()).toEqual([
      { kind: "sort", key: "plays", direction: "desc" },
    ]);
  });

  test("the defaulted direction is recorded explicitly as 'asc'", () => {
    expect(query(makeTracks()).sort("title").explain()).toEqual([
      { kind: "sort", key: "title", direction: "asc" },
    ]);
  });

  test("sort descriptions survive a JSON round-trip in call order", () => {
    const plan = query(makeTracks()).where("plays", ">", 9).sort("title", "desc").limit(1).explain();
    expect(JSON.parse(JSON.stringify(plan))).toEqual([
      { kind: "where", key: "plays", op: ">", value: 9 },
      { kind: "sort", key: "title", direction: "desc" },
      { kind: "limit", count: 1 },
    ]);
  });

  test("the plan and its sort description are frozen", () => {
    const plan = query(makeTracks()).sort("title").explain();
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan[0])).toBe(true);
  });
});

// Tie-breaker fixture (task 3.6): score and name both carry duplicates so
// two- and three-key chains have genuine ties at every level, and ids 2/3
// tie on BOTH score and name (full-tie stability is observable).
interface Player {
  id: number;
  team: string;
  score: number;
  name: string;
}

function makePlayers(): Player[] {
  return [
    { id: 1, team: "red", score: 10, name: "zoe" },
    { id: 2, team: "blue", score: 10, name: "amy" },
    { id: 3, team: "red", score: 10, name: "amy" },
    { id: 4, team: "blue", score: 20, name: "bob" },
    { id: 5, team: "red", score: 20, name: "amy" },
  ];
}

function playerIds(q: { execute(): Player[] }): number[] {
  return q.execute().map((player) => player.id);
}

describe("chained .sort() tie-breakers: FIRST call is primary (task 3.6)", () => {
  test("two chained sorts: first call orders, second breaks ties", () => {
    // plays asc groups 9:{alpha, charlie} 20:{echo} 100:{delta, bravo};
    // title breaks the ties inside each group (SQL ORDER BY plays, title)
    expect(sortedIds(query(makeTracks()).sort("plays").sort("title"))).toEqual([2, 5, 3, 4, 1]);
  });

  test("each chained key keeps its own direction", () => {
    expect(sortedIds(query(makeTracks()).sort("plays", "desc").sort("title"))).toEqual([
      4, 1, 3, 2, 5,
    ]);
    expect(sortedIds(query(makeTracks()).sort("plays").sort("title", "desc"))).toEqual([
      5, 2, 3, 1, 4,
    ]);
  });

  test("three chained sorts compose left to right", () => {
    // team asc, then score desc inside each team, then name asc on the
    // remaining {id 1, id 3} tie (both red, score 10)
    expect(
      playerIds(query(makePlayers()).sort("team").sort("score", "desc").sort("name")),
    ).toEqual([4, 2, 5, 3, 1]);
  });

  test("rows equal on EVERY chained key keep pipeline order (stability)", () => {
    // ids 2 and 3 tie on both score and name; id 2 comes first in the source
    expect(playerIds(query(makePlayers()).sort("score").sort("name"))).toEqual([2, 3, 1, 5, 4]);
  });

  test("nulls sort last within each tie-breaker level", () => {
    // plays 9 group: rating 3 (charlie) before the undefined rating (alpha)
    expect(sortedIds(query(makeTracks()).sort("plays").sort("rating"))).toEqual([5, 2, 3, 4, 1]);
  });

  test("rows tied on a null primary key fall through to the tie-breaker", () => {
    // undefined (alpha) and null (echo) both rank last on rating and tie
    // there, so title orders them — not pipeline order
    expect(sortedIds(query(makeTracks()).sort("rating").sort("title"))).toEqual([4, 5, 1, 2, 3]);
  });

  test("an intervening op ends the chain: the later sort is primary", () => {
    // sort(title) materializes at its position; after the filter, sort(plays)
    // starts a NEW ordering — title order survives only through stability
    expect(
      sortedIds(query(makeTracks()).sort("title").where("plays", ">", 9).sort("plays")),
    ).toEqual([3, 4, 1]);
  });

  test("a limit between two sorts truncates the FIRST ordering", () => {
    // plays desc gives [1, 4, 3, 2, 5]; limit keeps [1, 4, 3]; title orders those
    expect(
      sortedIds(query(makeTracks()).sort("plays", "desc").limit(3).sort("title")),
    ).toEqual([4, 1, 3]);
  });

  test("chained sorting never mutates the source array or its rows", () => {
    const tracks = makeTracks();
    const snapshot = structuredClone(tracks);
    query(tracks).sort("plays").sort("title", "desc").execute();
    expect(tracks).toEqual(snapshot);
  });

  test("branching: chained-sort extensions of a shared sort prefix stay independent", () => {
    const prefix = query(makeTracks()).sort("plays");
    const byTitle = prefix.sort("title");
    const byRating = prefix.sort("rating");
    expect(sortedIds(byTitle)).toEqual([2, 5, 3, 4, 1]);
    expect(sortedIds(byRating)).toEqual([5, 2, 3, 4, 1]);
    expect(sortedIds(prefix)).toEqual([2, 5, 3, 1, 4]);
    expect(prefix.explain()).toHaveLength(1);
  });
});

describe("explain() with chained sorts (task 3.6)", () => {
  test("composition is invisible in the plan: one description per sort call", () => {
    expect(query(makeTracks()).sort("plays").sort("title", "desc").explain()).toEqual([
      { kind: "sort", key: "plays", direction: "asc" },
      { kind: "sort", key: "title", direction: "desc" },
    ]);
  });
});

describe("select(...keys): projection (task 3.7)", () => {
  test("projects each row to a NEW object with exactly the named keys", () => {
    const users = makeUsers();
    const result = query(users).select("id", "name").execute();
    expect(result).toEqual([
      { id: 1, name: "ada" },
      { id: 2, name: "grace" },
      { id: 3, name: "linus" },
    ]);
    expect(Object.keys(result[0] ?? {})).toEqual(["id", "name"]);
    expect(result[0]).not.toBe(users[0]);
  });

  test("projected field values are the ORIGINAL references, not deep copies", () => {
    const tags = ["kernel", "vcs"];
    const users: User[] = [{ id: 3, name: "linus", tags }];
    const result = query(users).select("tags").execute();
    expect(result[0]?.tags).toBe(tags);
  });

  test("selecting the same key twice is harmless", () => {
    const result = query(makeUsers()).select("id", "id").execute();
    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(Object.keys(result[0] ?? {})).toEqual(["id"]);
  });

  test("a zero-key select projects every row to an empty object", () => {
    expect(query(makeUsers()).select().execute()).toEqual([{}, {}, {}]);
  });

  test("a named key ABSENT from a row stays absent from its projection", () => {
    // toEqual ignores undefined-valued keys, so Object.hasOwn is the real pin
    const result = query(makeTracks()).select("id", "rating").execute();
    expect(result[0]).toEqual({ id: 1, rating: 5 });
    expect(Object.hasOwn(result[1] ?? {}, "rating")).toBe(false);
    expect(result[2]).toEqual({ id: 3, rating: null });
  });

  test("a named key explicitly set to undefined stays an own key", () => {
    const rows: { id: number; note?: string }[] = [{ id: 1, note: undefined }, { id: 2 }];
    const result = query(rows).select("id", "note").execute();
    expect(Object.hasOwn(result[0] ?? {}, "note")).toBe(true);
    expect(Object.hasOwn(result[1] ?? {}, "note")).toBe(false);
  });

  test("where before select filters the FULL rows (the filter key may be selected away)", () => {
    const result = query(makeTracks()).where("plays", ">", 9).select("title").execute();
    expect(result).toEqual([{ title: "delta" }, { title: "echo" }, { title: "bravo" }]);
  });

  test("a keyed where after select filters the projected rows", () => {
    const result = query(makeTracks()).select("id", "plays").where("plays", "==", 9).execute();
    expect(result).toEqual([
      { id: 2, plays: 9 },
      { id: 5, plays: 9 },
    ]);
  });

  test("a predicate after select sees only the projected keys", () => {
    const seen: string[][] = [];
    query(makeUsers())
      .select("id")
      .where((row) => {
        seen.push(Object.keys(row));
        return true;
      })
      .execute();
    expect(seen).toEqual([["id"], ["id"], ["id"]]);
  });

  test("sort and limit compose with select in call order", () => {
    const result = query(makeTracks()).select("id", "plays").sort("plays").limit(2).execute();
    expect(result).toEqual([
      { id: 2, plays: 9 },
      { id: 5, plays: 9 },
    ]);
  });

  test("projection never mutates the source array or its rows", () => {
    const users = makeUsers();
    const snapshot = structuredClone(users);
    query(users).select("id", "name").execute();
    expect(users).toEqual(snapshot);
  });

  test("branching: select extensions of a shared prefix stay independent", () => {
    const prefix = query(makeUsers()).where("id", ">", 1);
    const idsOnly = prefix.select("id");
    const namesOnly = prefix.select("name");
    expect(idsOnly.execute()).toEqual([{ id: 2 }, { id: 3 }]);
    expect(namesOnly.execute()).toEqual([{ name: "grace" }, { name: "linus" }]);
    expect(prefix.execute()).toEqual([
      { id: 2, name: "grace", tags: [] },
      { id: 3, name: "linus", tags: ["kernel", "vcs"] },
    ]);
    expect(prefix.explain()).toHaveLength(1);
  });
});

describe("explain() with select ops (task 3.7)", () => {
  test("a select call adds one { kind: 'select', keys } description", () => {
    expect(query(makeUsers()).select("id", "name").explain()).toEqual([
      { kind: "select", keys: ["id", "name"] },
    ]);
  });

  test("keys are recorded verbatim: duplicates stay in the plan", () => {
    expect(query(makeUsers()).select("id", "id").explain()).toEqual([
      { kind: "select", keys: ["id", "id"] },
    ]);
  });

  test("select descriptions survive a JSON round-trip in call order", () => {
    const plan = query(makeUsers()).where("id", ">", 1).select("id", "name").limit(1).explain();
    expect(JSON.parse(JSON.stringify(plan))).toEqual([
      { kind: "where", key: "id", op: ">", value: 1 },
      { kind: "select", keys: ["id", "name"] },
      { kind: "limit", count: 1 },
    ]);
  });

  test("the plan, the select description, and its keys array are all frozen", () => {
    const plan = query(makeUsers()).select("id").explain();
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan[0])).toBe(true);
    const description = plan[0] as { kind: "select"; keys: readonly string[] };
    expect(Object.isFrozen(description.keys)).toBe(true);
    expect(() => {
      (description.keys as string[]).push("bogus");
    }).toThrow(TypeError);
  });
});

describe("ungrouped aggregates: count/sum/avg/min/max (task 3.8)", () => {
  test("count() with no ops returns the source row count", () => {
    expect(query(makeTracks()).count()).toBe(5);
  });

  test("count() runs the pipeline first: a where filters before counting", () => {
    expect(query(makeTracks()).where("plays", ">", 9).count()).toBe(3);
  });

  test("aggregates see the pipeline in CALL order: limit before where truncates first", () => {
    // limit(2) keeps ids [1, 2]; the filter then leaves only id 1
    expect(query(makeTracks()).limit(2).where("plays", ">", 9).count()).toBe(1);
  });

  test("sum totals a numeric field over the pipeline result", () => {
    expect(query(makeTracks()).sum("plays")).toBe(238);
    expect(query(makeTracks()).where("plays", "<", 100).sum("plays")).toBe(38);
  });

  test("avg divides the sum by the pipeline row count", () => {
    expect(query(makeTracks()).avg("plays")).toBeCloseTo(47.6);
    expect(query(makeTracks()).where("plays", "==", 9).avg("plays")).toBe(9);
  });

  test("min and max find the extremes of the pipeline result", () => {
    expect(query(makeTracks()).min("plays")).toBe(9);
    expect(query(makeTracks()).max("plays")).toBe(100);
    expect(query(makeTracks()).where("plays", "<", 100).max("plays")).toBe(20);
  });

  test("aggregates work on projected rows after a select", () => {
    expect(query(makeTracks()).select("plays").sum("plays")).toBe(238);
  });

  test("a NaN field value poisons numeric aggregates through the query surface", () => {
    // NaN is a legal number by type, so this path is reachable without lying
    const rows = [{ n: 1 }, { n: NaN }];
    expect(query(rows).sum("n")).toBeNaN();
    expect(query(rows).min("n")).toBeNaN();
  });

  test("aggregates never mutate the source array or its rows", () => {
    const tracks = makeTracks();
    const snapshot = structuredClone(tracks);
    query(tracks).where("plays", ">", 9).sum("plays");
    expect(tracks).toEqual(snapshot);
  });

  test("aggregates are terminal reads: no op is recorded on the receiver", () => {
    const q = query(makeTracks()).where("plays", ">", 9);
    q.count();
    q.sum("plays");
    q.avg("plays");
    q.min("plays");
    q.max("plays");
    expect(q.explain()).toEqual([{ kind: "where", key: "plays", op: ">", value: 9 }]);
    expect(q.execute()).toHaveLength(3);
  });
});

describe("empty-set aggregates through the pipeline (task 3.8, DESIGN section 7)", () => {
  const emptied = (): ReturnType<typeof query<Track>> =>
    query(makeTracks()).where("plays", ">", 1000);

  test("count() of an empty pipeline result is 0", () => {
    expect(emptied().count()).toBe(0);
    expect(query([] as Track[]).count()).toBe(0);
  });

  test("sum() of an empty pipeline result is 0", () => {
    expect(emptied().sum("plays")).toBe(0);
  });

  test("avg over an empty pipeline result throws RangeError naming aggregate and key", () => {
    expect(() => emptied().avg("plays")).toThrow(
      new RangeError('Cannot compute avg("plays") of an empty set'),
    );
  });

  test("min over an empty pipeline result throws RangeError naming aggregate and key", () => {
    expect(() => emptied().min("plays")).toThrow(
      new RangeError('Cannot compute min("plays") of an empty set'),
    );
  });

  test("max over an empty pipeline result throws RangeError naming aggregate and key", () => {
    // a different key proves the key is interpolated, not copied from a test
    expect(() => emptied().max("id")).toThrow(
      new RangeError('Cannot compute max("id") of an empty set'),
    );
  });

  test("limit(0) empties the pipeline the same way a filter does", () => {
    expect(() => query(makeTracks()).limit(0).avg("plays")).toThrow(RangeError);
  });
});

describe("groupBy(key).execute(): Map grouping (task 3.9)", () => {
  test("partitions pipeline rows into a Map keyed by the raw field value", () => {
    const groups = query(makeTracks()).groupBy("plays").execute();
    expect(groups).toBeInstanceOf(Map);
    expect(groups.size).toBe(3);
    expect(groups.get(100)?.map((track) => track.id)).toEqual([1, 4]);
    expect(groups.get(9)?.map((track) => track.id)).toEqual([2, 5]);
    expect(groups.get(20)?.map((track) => track.id)).toEqual([3]);
  });

  test("group keys appear in FIRST-SEEN order", () => {
    const groups = query(makeTracks()).groupBy("plays").execute();
    expect([...groups.keys()]).toEqual([100, 9, 20]);
  });

  test("rows keep pipeline order within a group and stay ORIGINAL references", () => {
    const tracks = makeTracks();
    const hundred = query(tracks).groupBy("plays").execute().get(100);
    expect(hundred?.[0]).toBe(tracks[0]);
    expect(hundred?.[1]).toBe(tracks[3]);
  });

  test("pipeline ops before groupBy apply first: a where filters the groups", () => {
    const groups = query(makeTracks()).where("plays", ">", 9).groupBy("plays").execute();
    expect([...groups.keys()]).toEqual([100, 20]);
    expect(groups.get(100)?.map((track) => track.id)).toEqual([1, 4]);
  });

  test("first-seen order and within-group order both follow the PIPELINE order", () => {
    // sorted desc by id, the pipeline runs 5,4,3,2,1 — so 9 is seen before
    // 100, and within each group the higher id comes first
    const groups = query(makeTracks()).sort("id", "desc").groupBy("plays").execute();
    expect([...groups.keys()]).toEqual([9, 100, 20]);
    expect(groups.get(9)?.map((track) => track.id)).toEqual([5, 2]);
    expect(groups.get(100)?.map((track) => track.id)).toEqual([4, 1]);
  });

  test("groupBy composes after select: groups hold the projected rows", () => {
    const groups = query(makeTracks()).select("title", "plays").groupBy("plays").execute();
    expect(groups.get(9)).toEqual([
      { title: "alpha", plays: 9 },
      { title: "charlie", plays: 9 },
    ]);
  });

  test("an empty pipeline result groups to an empty Map", () => {
    expect(query(makeTracks()).limit(0).groupBy("plays").execute().size).toBe(0);
    expect(query([] as Track[]).groupBy("plays").execute().size).toBe(0);
  });

  test("every execute() returns a fresh Map with fresh group arrays", () => {
    const grouped = query(makeTracks()).groupBy("plays");
    const first = grouped.execute();
    expect(first).not.toBe(grouped.execute());
    first.get(100)?.pop();
    first.delete(9);
    expect(grouped.execute().get(100)).toHaveLength(2);
    expect(grouped.execute().size).toBe(3);
  });

  test("grouped execution never mutates the source array or its rows", () => {
    const tracks = makeTracks();
    const snapshot = structuredClone(tracks);
    query(tracks).where("plays", ">", 9).groupBy("plays").execute();
    expect(tracks).toEqual(snapshot);
  });

  test("groupBy is a stage change, not a recorded op: the receiver stays reusable", () => {
    const q = query(makeTracks()).where("plays", ">", 9);
    q.groupBy("plays");
    expect(q.explain()).toEqual([{ kind: "where", key: "plays", op: ">", value: 9 }]);
    expect(q.execute()).toHaveLength(3);
  });

  test("branching: two groupBys off one shared prefix are independent", () => {
    const prefix = query(makeTracks()).where("plays", ">", 9);
    const byPlays = prefix.groupBy("plays");
    const byTitle = prefix.groupBy("title");
    expect([...byPlays.execute().keys()]).toEqual([100, 20]);
    expect([...byTitle.execute().keys()]).toEqual(["delta", "echo", "bravo"]);
  });
});

describe("groupBy key equality is SameValueZero (task 3.9, DESIGN section 7)", () => {
  test("NaN key values form ONE group", () => {
    const rows = [
      { id: 1, n: NaN },
      { id: 2, n: NaN },
    ];
    const groups = query(rows).groupBy("n").execute();
    expect(groups.size).toBe(1);
    expect(groups.get(NaN)?.map((row) => row.id)).toEqual([1, 2]);
  });

  test("+0 and -0 collide into one group", () => {
    const rows = [
      { id: 1, n: 0 },
      { id: 2, n: -0 },
    ];
    expect(query(rows).groupBy("n").execute().size).toBe(1);
  });

  test("null and undefined key values are DISTINCT groups", () => {
    const groups = query(makeTracks()).groupBy("rating").execute();
    expect(groups.size).toBe(5);
    expect(groups.get(null)?.map((track) => track.id)).toEqual([3]);
    expect(groups.get(undefined)?.map((track) => track.id)).toEqual([2]);
  });

  test("object key values group by REFERENCE, not structure (documented limitation)", () => {
    const shared = { city: "berlin" };
    const rows = [
      { id: 1, address: shared },
      { id: 2, address: shared },
      { id: 3, address: { city: "berlin" } },
    ];
    const groups = query(rows).groupBy("address").execute();
    expect(groups.size).toBe(2);
    expect(groups.get(shared)?.map((row) => row.id)).toEqual([1, 2]);
  });
});
