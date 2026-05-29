import { describe, expect, it } from "vitest";
import { zCursorPaginationQuery, zPaginationQuery } from "@/lib/query-params";

describe("query-params schema helpers", () => {
  it("zPaginationQuery applies page/limit defaults", () => {
    const schema = zPaginationQuery(25, 50);
    const parsed = schema.parse({});

    expect(parsed).toEqual({ page: 1, limit: 25 });
  });

  it("zCursorPaginationQuery applies limit default and empty cursor", () => {
    const schema = zCursorPaginationQuery(10, 20);
    const parsed = schema.parse({});

    expect(parsed).toEqual({ limit: 10, cursor: undefined });
  });

  it("zCursorPaginationQuery clamps limit to max", () => {
    const schema = zCursorPaginationQuery(10, 20);
    const parsed = schema.parse({ limit: "999", cursor: "abc" });

    expect(parsed).toEqual({ limit: 20, cursor: "abc" });
  });
});
