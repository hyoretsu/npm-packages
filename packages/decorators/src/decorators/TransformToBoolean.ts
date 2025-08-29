import { Transform } from "class-transformer";

export const TransformToBoolean = () => {
	return Transform(({ value }) => {
		return value === "true";
	});
};
