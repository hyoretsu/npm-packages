"use client";
import { range } from "@hyoretsu/utils";
import React, { ChangeEvent, ChangeEventHandler, InputHTMLAttributes, useEffect, useState } from "react";

export interface CustomInputProps extends InputHTMLAttributes<HTMLInputElement> {
	onChange: ChangeEventHandler<HTMLInputElement>;
}

export const Input: React.FC<CustomInputProps> = ({
	type,
	value,
	max,
	min = 0,
	maxLength,
	onChange,
	...rest
}) => {
	const [internalValue, setInternalValue] = useState("");

	useEffect(() => {
		setInternalValue(String(value));
	}, [value]);

	const handleOnChange = (e: ChangeEvent<HTMLInputElement>, send = false): void => {
		if (!send) {
			setInternalValue(e.currentTarget.value);
			return;
		}

		if (type === "number") {
			if (maxLength && !max) {
				max = Number(range(0, maxLength).reduce(str => `${str}9`, ""));
			}

			// @ts-ignore
			if (Number(e.currentTarget.value) > max) {
				e.currentTarget.value = String(max);
			}
			// @ts-ignore
			if (Number(e.currentTarget.value) < min) {
				e.currentTarget.value = String(min);
			}
		} else {
			// Longer than max length
			if (maxLength && e.currentTarget.value.length >= maxLength) {
				e.currentTarget.value = e.currentTarget.value.slice(0, maxLength);
			}
		}

		setInternalValue(e.currentTarget.value);

		onChange(e);
	};

	return (
		<input
			type={type || "text"}
			value={internalValue}
			maxLength={maxLength}
			onChange={handleOnChange}
			onBlur={() =>
				internalValue !== String(value) &&
				handleOnChange(
					{ currentTarget: { value: String(internalValue) } } as ChangeEvent<HTMLInputElement>,
					true,
				)
			}
			{...rest}
		/>
	);
};
