import { ValidateIf, ValidationOptions } from "class-validator";

/**
 * Validates if the value isn't `null`, `undefined` or an empty string.
 */
export function IsOptional(validationOptions?: ValidationOptions) {
	return ValidateIf((obj, value) => {
		return value !== null && value !== undefined && value !== "";
	}, validationOptions);
}
