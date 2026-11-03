import { expect, test } from "bun:test";
import type { RequestConfig, ResponseConfig } from "../src/funcs/createClient";
import { createOperationClient } from "../src/funcs/createOperationClient";

function transportReturning(data: unknown, requests: RequestConfig[]) {
	return async <TData, TError = unknown, TVariables = unknown>(
		config: RequestConfig<TVariables>,
	): Promise<ResponseConfig<TData, TVariables>> => {
		requests.push(config);
		return { data: data as TData, status: 200, statusText: "OK" };
	};
}

test("grouped options preserve transport context and encode path segments", async () => {
	const requests: RequestConfig[] = [];
	const signal = new AbortController().signal;
	const client = createOperationClient(transportReturning({ id: "one" }, requests));
	const result = await client({
		batch: false,
		body: { name: "changed" },
		method: "PATCH",
		path: { id: "a/b ?" },
		query: { page: 2 },
		signal,
		timeout: false,
		url: "/records/{id}",
	});
	expect(result.data).toEqual({ id: "one" });
	expect(requests[0]).toMatchObject({
		batch: false,
		data: { name: "changed" },
		params: { page: 2 },
		signal,
		timeout: false,
		url: "/records/a%2Fb%20%3F",
	});
	await expect(client({ method: "GET", url: "/records/{id}" })).rejects.toThrow(
		"Missing path parameter: id",
	);
	expect(requests).toHaveLength(1);
});

test("multipart files reach existing transport as FormData", async () => {
	const requests: RequestConfig[] = [];
	const client = createOperationClient(transportReturning({}, requests));
	const file = new File(["statement"], "statement.pdf");
	await client({
		body: { accountId: "one", files: [file] },
		contentType: { request: "multipart/form-data" },
		method: "POST",
		url: "/imports",
	});
	const form = requests[0]?.data as FormData;
	expect(form.get("accountId")).toBe("one");
	expect((form.get("files") as File).name).toBe("statement.pdf");
});

test("errors reject by default and never retry", async () => {
	let calls = 0;
	const error = { data: { error: "busy" }, status: 429, statusText: "Too Many Requests" };
	const client = createOperationClient(async () => {
		calls++;
		throw error;
	});
	await expect(client({ body: {}, method: "POST", url: "/records" })).rejects.toBe(error);
	expect(calls).toBe(1);
});
