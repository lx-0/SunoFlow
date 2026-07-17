import { describe, it, expect } from "vitest";
import {
  createJsonClient,
  HttpError,
  type FetchLike,
  type JsonRequestInit,
  type JsonResponseLike,
} from "./http-client";

/** Response fake: body === NON_JSON makes json() reject (empty 204s, HTML error pages). */
const NON_JSON = Symbol("non-json");

function jsonRes(status: number, body: unknown = NON_JSON): JsonResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === NON_JSON) throw new SyntaxError("Unexpected end of JSON input");
      return body;
    },
  };
}

function fakeFetch(...responses: JsonResponseLike[]) {
  const calls: Array<{ url: string; init?: JsonRequestInit }> = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return responses.shift() ?? jsonRes(200, {});
  };
  return { fetch, calls };
}

describe("createJsonClient success paths", () => {
  it("get returns the parsed body, prefixes baseUrl, sends no method/Content-Type", async () => {
    const { fetch, calls } = fakeFetch(jsonRes(200, { song: { id: "a" } }));
    const client = createJsonClient({ fetch, baseUrl: "https://sunoflow.app" });
    await expect(client.get("/api/songs/a")).resolves.toEqual({ song: { id: "a" } });
    expect(calls[0].url).toBe("https://sunoflow.app/api/songs/a");
    expect(calls[0].init?.method).toBeUndefined();
    expect(calls[0].init?.headers).toEqual({});
    expect(calls[0].init?.body).toBeUndefined();
  });

  it("omitted baseUrl uses the path as-is (web relative-URL style)", async () => {
    const { fetch, calls } = fakeFetch(jsonRes(200, {}));
    await createJsonClient({ fetch }).get("/api/credits");
    expect(calls[0].url).toBe("/api/credits");
  });

  it("post serializes the body and sets Content-Type + configured headers", async () => {
    const { fetch, calls } = fakeFetch(jsonRes(200, { ok: true }));
    const client = createJsonClient({ fetch, headers: { Authorization: "Bearer k" } });
    await client.post("/api/ratings", { rating: 5 });
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.body).toBe('{"rating":5}');
    expect(calls[0].init?.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer k",
    });
  });

  it("post defaults to an empty JSON object body", async () => {
    const { fetch, calls } = fakeFetch(jsonRes(200, {}));
    await createJsonClient({ fetch }).post("/api/users/u/follow");
    expect(calls[0].init?.body).toBe("{}");
    expect(calls[0].init?.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("patch sends PATCH with a serialized body", async () => {
    const { fetch, calls } = fakeFetch(jsonRes(200, { isCollaborative: true }));
    const res = await createJsonClient({ fetch }).patch<{ isCollaborative?: boolean }>(
      "/api/playlists/p/collaborative",
      {},
    );
    expect(calls[0].init?.method).toBe("PATCH");
    expect(res.isCollaborative).toBe(true);
  });

  it("del resolves void; body is only sent when provided", async () => {
    const { fetch, calls } = fakeFetch(jsonRes(200, {}), jsonRes(200, {}));
    const client = createJsonClient({ fetch });
    await expect(client.del("/api/favorites", { songId: "a" })).resolves.toBeUndefined();
    expect(calls[0].init?.method).toBe("DELETE");
    expect(calls[0].init?.body).toBe('{"songId":"a"}');
    await client.del("/api/users/u/follow");
    expect(calls[1].init?.body).toBeUndefined();
    expect(calls[1].init?.headers).toEqual({});
  });

  it("a headers provider is resolved (and awaited) per request", async () => {
    let minted = 0;
    const { fetch, calls } = fakeFetch(jsonRes(200, {}), jsonRes(200, {}));
    const client = createJsonClient({
      fetch,
      headers: async () => ({ Authorization: `Bearer k${++minted}` }),
    });
    await client.get("/a");
    await client.get("/b");
    expect(minted).toBe(2);
    expect(calls.map((c) => c.init?.headers?.Authorization)).toEqual(["Bearer k1", "Bearer k2"]);
  });

  it("an empty 204 body degrades to {} instead of throwing", async () => {
    const { fetch } = fakeFetch(jsonRes(204));
    await expect(createJsonClient({ fetch }).get("/api/void")).resolves.toEqual({});
  });
});

describe("createJsonClient failure envelope", () => {
  const cases: Array<{ name: string; res: JsonResponseLike; status: number; message: string }> = [
    { name: "{ error } envelope", res: jsonRes(400, { error: "nope" }), status: 400, message: "nope" },
    { name: "missing error key", res: jsonRes(422, {}), status: 422, message: "HTTP 422" },
    { name: "non-string error value", res: jsonRes(403, { error: 123 }), status: 403, message: "HTTP 403" },
    { name: "empty-string error value", res: jsonRes(400, { error: "" }), status: 400, message: "HTTP 400" },
    { name: "non-object JSON root", res: jsonRes(400, "oops"), status: 400, message: "HTTP 400" },
    { name: "null JSON root", res: jsonRes(404, null), status: 404, message: "HTTP 404" },
    { name: "non-JSON error body", res: jsonRes(500), status: 500, message: "HTTP 500" },
  ];
  it.each(cases)("$name → HttpError(status, message)", async ({ res, status, message }) => {
    const { fetch } = fakeFetch(res);
    const err = await createJsonClient({ fetch })
      .get("/api/x")
      .then(() => null)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(status);
    expect((err as HttpError).message).toBe(message);
  });

  it("del throws the same envelope errors", async () => {
    const { fetch } = fakeFetch(jsonRes(409, { error: "conflict" }));
    await expect(createJsonClient({ fetch }).del("/api/x")).rejects.toMatchObject({
      status: 409,
      message: "conflict",
    });
  });
});

describe("HttpError", () => {
  it("defaults the message to HTTP <status> and survives instanceof", () => {
    const err = new HttpError(500);
    expect(err.message).toBe("HTTP 500");
    expect(err.name).toBe("HttpError");
    expect(err.status).toBe(500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(HttpError);
  });
  it("uses the provided message when given", () => {
    expect(new HttpError(400, "bad").message).toBe("bad");
  });
});
