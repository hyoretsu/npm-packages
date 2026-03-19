export const jsonReviver = (_key: string, value: any): any => {
	if (typeof value === "string") {
		const parsedDate = new Date(value);

		if (!Number.isNaN(parsedDate.getTime())) {
			return parsedDate;
		}
	}

	return value;
};
