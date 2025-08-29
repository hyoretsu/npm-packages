import { Transform } from "class-transformer";

export const TransformToArray = () => {
	return Transform(({ value }) => {
		if (!value) return undefined;
		if (Array.isArray(value)) return value;
		return value
			.split(",")
			.map((id: string) => id.trim())
			.filter(Boolean);
	});
};
