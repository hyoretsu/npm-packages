import { AxiosInstance, AxiosResponse } from "axios";
import useSWR from "swr";

// rome-ignore lint/suspicious/noEmptyInterface:
export interface APIMapping {}

interface FetchOpts {
	body?: Record<string, any>;
	query?: Record<string, any>;
}

export function useFetch<Route extends keyof APIMapping, Error = any>(
	urlDeps: Route | [Route, any | any[]],
	api: AxiosInstance,
	{ body, query }: FetchOpts = {},
) {
	const reqInfo = useSWR<APIMapping[Route], Error>(urlDeps, async (path: string) => {
		let res: AxiosResponse<APIMapping[Route]>;

		if (typeof urlDeps !== "string") {
			[path] = urlDeps;
		}

		if (query) {
			path = `${path}?${Object.entries(query).reduce(
				([key, value], str, index, arr) =>
					// rome-ignore lint/style/useTemplate:
					str + key + "=" + JSON.stringify(value) + (index !== arr.length - 1 ? "¨&" : ""),
				"",
			)}`;
		}

		if (body) {
			res = await api.post(path, body);
		} else {
			res = await api.get(path);
		}

		return res.data;
	});

	return reqInfo;
}
