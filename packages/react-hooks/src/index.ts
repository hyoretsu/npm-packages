import { AxiosInstance, AxiosResponse } from "axios";
import useSWR from "swr";

// rome-ignore lint/suspicious/noEmptyInterface: <explanation>
export interface APIMapping {}

export function useFetch<Route extends keyof APIMapping, Error = any>(
    urlDeps: Route | [Route, any | any[]],
    api: AxiosInstance,
    body?: Record<string, any>,
) {
    const reqInfo = useSWR<APIMapping[Route], Error>(urlDeps, async (path: string) => {
        let res: AxiosResponse<APIMapping[Route]>;

        if (typeof urlDeps !== "string") {
            [path] = urlDeps;
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
