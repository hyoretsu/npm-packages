import { jsonReviver } from "@hyoretsu/utils";
import dayjs from "dayjs";
import { isHTTPError, type KyInstance, type Options } from "ky";
import type { z } from "zod";

export interface RequestConfig<TVariables = unknown> {
	data?: TVariables | FormData;
	headers?: HeadersInit;
	method: "GET" | "PUT" | "PATCH" | "POST" | "DELETE";
	params?: any;
	responseType?: "arraybuffer" | "blob" | "document" | "json" | "text" | "stream";
	responseValidator?: z.ZodSchema<TVariables>;
	signal?: AbortSignal;
	url: string;
}

export interface ResponseConfig<TData = unknown, TVariables = Record<string, unknown>> {
	data: TData;
	errors?: TVariables;
	status: number;
	statusText: string;
}

export interface ResponseErrorConfig<TError = unknown> {
	data: TError;
	status: number;
	statusText: string;
}

export type Client = typeof fetch;

/** Kubb custom client with Zod Validation */
export const createClient =
	(api: KyInstance) =>
	async <TData, TError = unknown, TVariables = unknown>(
		{
			data: json,
			headers,
			method,
			params: searchParams,
			responseType,
			responseValidator,
			url,
		}: RequestConfig<TVariables>,
		options?: Options,
	): Promise<ResponseConfig<TData, TVariables>> => {
		try {
			if (json && !(json instanceof FormData)) {
				json = Object.fromEntries(
					Object.entries(json).map(([key, value]) => {
						if (value instanceof Date) {
							value = value.toISOString();
						}

						return [key, value];
					}),
				) as TVariables;
			}
			if (searchParams) {
				searchParams = Object.fromEntries(
					Object.entries(searchParams).map(([key, value]) => {
						if (value instanceof Date) {
							value = dayjs(value).format("YYYY-MM-DDTHH:mm:ssZ[Z]");
						}
						return [key, value];
					}),
				) as TVariables;
			}

			const isFormData = json instanceof FormData;
			const response = await api(url.replace(/^\/?/, ""), {
				headers,
				...(isFormData ? { body: json as FormData } : { json }),
				method,
				searchParams,
				...options,
			} as Options);

			let data: TData;
			if (responseType === "text") {
				data = (await response.text()) as TData;
			} else {
				data = JSON.parse(await response.text(), jsonReviver) as TData;
			}

			if (responseValidator) {
				responseValidator.parse(data);
			}

			return {
				data,
				status: response.status,
				statusText: response.statusText,
			};
		} catch (error) {
			if (isHTTPError(error)) {
				const errorData = (await error.response.json().catch(() => ({}))) as TError;

				// We throw the error so TanStack Query (useMutation) can catch it

				throw {
					data: errorData,
					status: error.response.status,
					statusText: error.response.statusText,
				};
			}
			throw error;
		}
	};
