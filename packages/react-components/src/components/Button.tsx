import React, { ButtonHTMLAttributes, DetailedHTMLProps, ReactNode } from "react";

export interface CustomButtonProps
	extends DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> {
	background?: string;
	border?: string;
	borderRadius?: number;
	borderWidth?: number;
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
	borderRadius = 10,
	borderWidth = border ? 4 : 0,
	children,
	color = "#fff",
	fontSize = 16,
	padding = [12, 24],
	paddingHorizontal,
	paddingVertical,
	style,
	...rest
}) => {
	return (
		<button
			type="button"
			style={{
				backgroundColor: background,
				borderColor: border,
				borderRadius,
				borderStyle: "solid",
				borderWidth,
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
