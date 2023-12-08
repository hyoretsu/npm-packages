import { AxiosInstance, AxiosResponse, Method } from "axios";
import useSWR from "swr";

// biome-ignore lint/suspicious/noEmptyInterface:
export interface APIMapping {}

interface FetchOpts {
	body?: Record<string, any>;
	method?: Method;
	query?: Record<string, any>;
}

export function useFetch<Route extends keyof APIMapping, Error = any>(
	urlDeps: Route | [Route, any | any[]],
	api: AxiosInstance | null,
	{ body, method, query }: FetchOpts = {},
) {
	const reqInfo = useSWR<APIMapping[Route], Error>(urlDeps, async (path: string) => {
		if (typeof urlDeps !== "string") {
			[path] = urlDeps;
		}

		if (query) {
			path = `${path}?${Object.entries(query).reduce(
				([key, value], str, index, arr) =>
					// biome-ignore lint/style/useTemplate:
					str + key + "=" + JSON.stringify(value) + (index !== arr.length - 1 ? "¨&" : ""),
				"",
			)}`;
		}

		if (api) {
			let res: AxiosResponse<APIMapping[Route]>;

			if (body) {
				res = await api.post(path, body);
			} else {
				res = await api.get(path);
			}

			return res.data;
		}

		let res: Response;

		if (body) {
			res = await fetch(path, {
				body: body.toString(),
				method: method?.toUpperCase() || "POST",
			});
		} else {
			res = await fetch(path);
		}

		return res.json();
	});

	return reqInfo;
}
