import { expect, test } from "bun:test";
import { PACKAGE_NAME } from "./index";

test("toolchain seed: public module loads and exports the package name", () => {
  expect(PACKAGE_NAME).toBe("jsonq");
});
