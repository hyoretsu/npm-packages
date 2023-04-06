import React, { FormEventHandler, InputHTMLAttributes } from "react";

export type CustomInputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<CustomInputProps> = ({ type, value, max, min = 0, maxLength, ...rest }) => {
    const handleOnChange: FormEventHandler<HTMLInputElement> = (e): void => {
        if (type === "number") {
            if (maxLength && !max) {
                max = Number(Array.from({ length: maxLength }, () => 9).join(""));
            }

            // @ts-ignore
            if (Number(e.currentTarget.value) > max) {
                e.currentTarget.value = String(max);
            }
            // @ts-ignore
            if (Number(e.currentTarget.value) < min) {
                e.currentTarget.value = String(min);
            }

            return;
        }

        // Longer than max length
        if (maxLength && e.currentTarget.value.length >= maxLength) {
            e.currentTarget.value = e.currentTarget.value.slice(0, maxLength);
        }
    };

    return (
        <input type={type || "text"} value={value} maxLength={maxLength} onInput={handleOnChange} {...rest} />
    );
};

