const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

export const jsonReviver = (_key: string, value: any): any => {
	if (typeof value === "string") {
		if (isoDateRegex.test(value)) {
			return new Date(value);
		}
	}

	return value;
};
