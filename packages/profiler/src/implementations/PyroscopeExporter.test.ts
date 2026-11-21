import { afterEach, describe, expect, it } from "bun:test";
import { gunzipSync } from "node:zlib";
import { ExporterError } from "../errors/ExporterError";
import { decodePprof } from "../pprof";
import { makeProfile, makeWindow } from "../test-utils";
import { PyroscopeExporter, pyroscopeExporter } from "./PyroscopeExporter";

interface Hit {
	body: Uint8Array;
	headers: Headers;
	method: string;
	url: URL;
}

let server: ReturnType<typeof Bun.serve> | undefined;
afterEach(() => {
	server?.stop(true);
	server = undefined;
});

function serve(respond: (hit: Hit, attempt: number) => Response | Promise<Response>) {
	const hits: Hit[] = [];
	server = Bun.serve({
		fetch: async request => {
			const hit = {
				body: new Uint8Array(await request.arrayBuffer()),
				headers: request.headers,
				method: request.method,
				url: new URL(request.url),
			};
			hits.push(hit);
			return respond(hit, hits.length);
		},
		port: 0,
	});
	return { hits, url: `http://127.0.0.1:${server.port}` };
}

const window = makeWindow(
	makeProfile([
		["main", "work"],
		["main", "work"],
	]),
	{
		folded: "main;work 2",
		labels: { env: "prod", service_name: "svc" },
		sampleLabels: {
			indices: Int32Array.from([0, 0]),
			sets: [{ route: "/x", span_id: "a".repeat(16), trace_id: "b".repeat(32) }],
		},
	},
);

describe("PyroscopeExporter", () => {
	it("posts gzip pprof with per-sample labels, bearer auth and tenant header (default format)", async () => {
		const { hits, url } = serve(() => new Response("ok"));
		const exporter = pyroscopeExporter({
			authToken: "secret",
			headers: { "X-Extra": "1" },
			tenantId: "t1",
			url,
		});
		const result = await exporter.export(window);
		expect(result).toMatchObject({ bytes: expect.any(Number) });
		const [hit] = hits;
		expect(hit?.method).toBe("POST");
		expect(hit?.url.pathname).toBe("/ingest");
		expect(Object.fromEntries(hit?.url.searchParams ?? [])).toEqual({
			format: "pprof",
			from: "1700000000",
			name: "test-app{env=prod,service_name=svc}",
			spyName: "nodespy",
			until: "1700000015",
		});
		expect(hit?.headers.get("authorization")).toBe("Bearer secret");
		expect(hit?.headers.get("x-scope-orgid")).toBe("t1");
		expect(hit?.headers.get("x-extra")).toBe("1");
		expect(hit?.headers.get("content-type")).toBe("application/octet-stream");
		expect(hit?.headers.get("content-encoding")).toBe("gzip");
		const decoded = decodePprof(hit?.body as Uint8Array);
		expect(decoded.samples[0]?.labels).toEqual({
			route: "/x",
			span_id: "a".repeat(16),
			trace_id: "b".repeat(32),
		});
		expect(decoded.samples[0]?.stack).toEqual(["work", "main"]);
		expect(decoded.durationNanos).toBe("15000000000");
		expect(decoded.timeNanos).toBe("1700000015000000000");
	});

	it("posts folded text with sampleRate for format=folded, optionally gzipped, with basic auth", async () => {
		const { hits, url } = serve(() => new Response("ok"));
		await new PyroscopeExporter({
			basicAuth: { password: "p", username: "u" },
			format: "folded",
			url,
		}).export(window);
		await new PyroscopeExporter({ compress: true, format: "folded", url }).export(window);
		expect(hits[0]?.url.searchParams.get("format")).toBe("folded");
		expect(hits[0]?.url.searchParams.get("sampleRate")).toBe("100");
		expect(hits[0]?.url.searchParams.get("name")).toBe("test-app.cpu{env=prod,service_name=svc}");
		expect(hits[0]?.headers.get("authorization")).toBe(`Basic ${btoa("u:p")}`);
		expect(hits[0]?.headers.get("content-type")).toBe("text/plain");
		expect(new TextDecoder().decode(hits[0]?.body)).toBe("main;work 2");
		expect(hits[1]?.headers.get("content-encoding")).toBe("gzip");
		expect(new TextDecoder().decode(gunzipSync(hits[1]?.body as Uint8Array))).toBe("main;work 2");
	});

	it("sends wall windows as folded even in pprof mode, under the .wall name", async () => {
		const { hits, url } = serve(() => new Response("ok"));
		await new PyroscopeExporter({ url }).export({ ...window, type: "wall" });
		expect(hits[0]?.url.searchParams.get("format")).toBe("folded");
		expect(hits[0]?.url.searchParams.get("name")).toStartWith("test-app.wall{");
	});

	it("treats 4xx as non-retryable and 5xx/429 as retryable, honouring Retry-After", async () => {
		const bad = serve(() => new Response("nope", { status: 400 }));
		const error400 = await new PyroscopeExporter({ url: bad.url }).export(window).catch(error => error);
		expect(error400).toBeInstanceOf(ExporterError);
		expect(error400).toMatchObject({ message: "HTTP 400: nope", retryable: false, status: 400 });
		server?.stop(true);

		const unavailable = serve(
			() => new Response("later", { headers: { "Retry-After": "3" }, status: 503 }),
		);
		const error503 = await new PyroscopeExporter({ url: unavailable.url })
			.export(window)
			.catch(error => error);
		expect(error503).toMatchObject({ retryAfterMs: 3_000, retryable: true, status: 503 });
		server?.stop(true);

		const limited = serve(() => new Response("slow down", { status: 429 }));
		expect(
			await new PyroscopeExporter({ url: limited.url }).export(window).catch(error => error),
		).toMatchObject({ retryable: true, status: 429 });
	});

	it("turns timeouts and abort signals into ExporterErrors", async () => {
		const { url } = serve(() => new Promise<Response>(() => undefined));
		const timeout = await new PyroscopeExporter({ timeoutMs: 50, url })
			.export(window)
			.catch(error => error);
		expect(timeout).toMatchObject({ message: "export timed out after 50ms", retryable: true });
		const controller = new AbortController();
		const pending = new PyroscopeExporter({ url })
			.export(window, controller.signal)
			.catch(error => error);
		controller.abort();
		expect(await pending).toMatchObject({ message: "export aborted", retryable: false });
	});

	it("turns connection errors into retryable ExporterErrors", async () => {
		const error = await new PyroscopeExporter({ timeoutMs: 1_000, url: "http://127.0.0.1:1" })
			.export(window)
			.catch(e => e);
		expect(error).toBeInstanceOf(ExporterError);
		expect(error.retryable).toBe(true);
	});

	it("validates its options", () => {
		expect(() => pyroscopeExporter({ url: "" })).toThrow(/URL is required/);
		expect(() =>
			pyroscopeExporter({
				authToken: "t",
				basicAuth: { password: "p", username: "u" },
				url: "http://x",
			}),
		).toThrow(/mutually exclusive/);
		expect(() => pyroscopeExporter({ timeoutMs: 0, url: "http://x" })).toThrow(/timeoutMs/);
		expect(() => pyroscopeExporter({ format: "jfr" as never, url: "http://x" })).toThrow(/format/);
		expect(pyroscopeExporter({ name: "custom", url: "http://x" }).name).toBe("custom");
	});
});
