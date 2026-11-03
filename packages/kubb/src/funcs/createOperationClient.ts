import type { Options as KyOptions } from "ky";
import type { RequestConfig as LegacyRequestConfig, ResponseConfig } from "./createClient";

interface DataShape {
	body?: unknown;
	headers?: unknown;
	path?: unknown;
	query?: unknown;
}
type SuccessStatus = "200" | "201" | "202" | "203" | "204" | "205" | "206" | "207" | "208" | "226";
export type OperationRequestConfig = Omit<LegacyRequestConfig, "data" | "params"> &
	DataShape & {
		contentType?: { request?: string; response?: string };
		security?: unknown[];
		throwOnError?: true;
		timeout?: KyOptions["timeout"];
		authenticated?: boolean;
		batch?: boolean;
		client?: ReturnType<typeof createOperationClient>;
	};
export type OperationOptions<TData extends DataShape, ThrowOnError extends boolean = true> = Omit<
	OperationRequestConfig,
	keyof DataShape | "url" | "method" | "throwOnError"
> &
	TData & { throwOnError?: ThrowOnError & true };
/** This transport always rejects failures, including when called by Query mutations. */
export type RequestResult<TResponses, ThrowOnError extends boolean = true> = ThrowOnError extends false
	? never
	: ResponseConfig<TResponses[Extract<keyof TResponses, SuccessStatus>]> & { error: undefined };

type Transport = <TData, TError = unknown, TVariables = unknown>(
	config: LegacyRequestConfig<TVariables>,
	options?: KyOptions,
) => Promise<ResponseConfig<TData, TVariables>>;

/** Adapt Kubb v5's grouped request contract to an existing Ky transport. */
export function createOperationClient(transport: Transport) {
	return async (config: OperationRequestConfig) => {
		const {
			path,
			query,
			body,
			contentType,
			security: _security,
			throwOnError: _throwOnError,
			client: _client,
			...request
		} = config;
		const url = request.url.replace(/\{([^}]+)\}/g, (_match, name: string) => {
			const value = (path as Record<string, unknown> | undefined)?.[name];
			if (value === undefined || value === null) throw new Error(`Missing path parameter: ${name}`);
			return encodeURIComponent(String(value));
		});
		let data = body;
		if (contentType?.request === "multipart/form-data" && body && !(body instanceof FormData)) {
			const form = new FormData();
			for (const [key, value] of Object.entries(body)) {
				if (value === undefined || value === null) continue;
				for (const item of Array.isArray(value) ? value : [value])
					form.append(key, item instanceof Blob ? item : String(item));
			}
			data = form;
		}
		const result = await transport({ ...request, data, params: query, url });
		return { ...result, error: undefined };
	};
}
