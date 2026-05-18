import { timeConversion } from "@hyoretsu/utils";
import { QueryClient } from "@tanstack/react-query";

export interface TanstackClientData {
	/** In `ms`. */
	staleTime?: number;
}

export const tanstackClient = ({ staleTime }: TanstackClientData = {}) =>
	new QueryClient({
		defaultOptions: {
			mutations: {
				onSuccess: (data, variables, onMutateResult, context) => {
					context.client.invalidateQueries({ queryKey: context?.mutationKey });
				},
			},
			queries: {
				refetchOnWindowFocus: false,
				staleTime: staleTime ?? timeConversion(1, "minutes", "milliseconds"),
			},
		},
	});
