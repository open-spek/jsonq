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
