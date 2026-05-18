import { QueryClient } from "@tanstack/react-query";
import { timeConversion } from "@hyoretsu/utils";

export const tanstackClient = new QueryClient({
	defaultOptions: {
		mutations: {
			onSuccess: (data, variables, onMutateResult, context) => {
				context.client.invalidateQueries({ queryKey: context?.mutationKey });
			},
		},
		queries: {
			refetchOnWindowFocus: false,
			staleTime: timeConversion(1, "minutes", "milliseconds"),
		},
	},
});
