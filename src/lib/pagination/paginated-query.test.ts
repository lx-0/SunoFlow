import { describe, it, expect } from "vitest";
import { paginatedQuery } from "./paginated-query";

describe("paginatedQuery", () => {
  it("returns items with offset pagination metadata", async () => {
    const result = await paginatedQuery({
      findMany: async () => [{ id: "1" }, { id: "2" }],
      count: async () => 5,
      page: 1,
      limit: 2,
    });

    expect(result.items).toEqual([{ id: "1" }, { id: "2" }]);
    expect(result.page).toBe(1);
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(3);
    expect(result.hasMore).toBe(true);
  });

  it("reports hasMore=false on last page", async () => {
    const result = await paginatedQuery({
      findMany: async () => [{ id: "5" }],
      count: async () => 5,
      page: 3,
      limit: 2,
    });

    expect(result.hasMore).toBe(false);
    expect(result.totalPages).toBe(3);
  });

  it("applies transform when provided", async () => {
    const result = await paginatedQuery({
      findMany: async () => [{ name: "Alice" }, { name: "Bob" }],
      count: async () => 2,
      page: 1,
      limit: 10,
      transform: (items) => items.map((i) => ({ label: i.name.toUpperCase() })),
    });

    expect(result.items).toEqual([{ label: "ALICE" }, { label: "BOB" }]);
  });

  it("runs findMany and count in parallel", async () => {
    const order: string[] = [];

    await paginatedQuery({
      findMany: async () => {
        order.push("findMany:start");
        await new Promise((r) => setTimeout(r, 10));
        order.push("findMany:end");
        return [];
      },
      count: async () => {
        order.push("count:start");
        await new Promise((r) => setTimeout(r, 10));
        order.push("count:end");
        return 0;
      },
      page: 1,
      limit: 10,
    });

    expect(order[0]).toBe("findMany:start");
    expect(order[1]).toBe("count:start");
  });
});
