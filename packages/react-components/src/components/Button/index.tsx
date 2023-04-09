import React, { ButtonHTMLAttributes, DetailedHTMLProps, ReactNode } from "react";

export interface CustomButtonProps
	extends DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> {
	background?: string;
	border?: string;
	children: ReactNode;
	color?: string;
	fontSize?: number;
	padding?: [number, number];
	paddingHorizontal?: number;
	paddingVertical?: number;
}

export const Button: React.FC<CustomButtonProps> = ({
	background = "#3d6",
	border,
	children,
	color = "#fff",
	fontSize = 16,
	padding = [12, 24],
	paddingHorizontal,
	paddingVertical,
	style,
	...rest
}) => {
	const borderWidth = border ? 4 : 0;

	return (
		<button
			type="button"
			style={{
				backgroundColor: background,
				borderColor: border,
				borderWidth,
				borderRadius: 10,
				paddingBottom: (paddingVertical || padding[0]) - borderWidth,
				paddingLeft: (paddingHorizontal || padding[1]) - borderWidth,
				paddingRight: (paddingHorizontal || padding[1]) - borderWidth,
				paddingTop: (paddingVertical || padding[0]) - borderWidth,
				...style,
			}}
			{...rest}
		>
			<p style={{ color, fontSize }}>{children}</p>
		</button>
	);
};
