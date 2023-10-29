import React, { ReactNode } from "react";
import { Button } from "./Button";
import { OpacityFilter } from "./OpacityFilter";

export interface ModalProps {
	backgroundColor?: string;
	buttonBackground?: string;
	buttonBorderColor?: string;
	buttonBorderRadius?: number;
	buttonBorderWidth?: number;
	buttonPadding?: [number, number];
	buttonText?: string;
	children: ReactNode;
	onConfirm: () => void;
	opacity?: number;
	textColor?: string;
}

export const Modal: React.FC<ModalProps> = ({
	backgroundColor = "#c4d3f2",
	buttonBackground,
	buttonBorderColor,
	buttonBorderRadius,
	buttonBorderWidth,
	buttonPadding,
	buttonText = "Ok",
	children,
	onConfirm,
	opacity,
	textColor = "#000",
}) => {
	return (
		<OpacityFilter opacity={opacity}>
			<div
				style={{
					alignItems: "center",
					backgroundColor,
					borderRadius: 15,
					display: "flex",
					flexDirection: "column",
					maxWidth: "45%",
					padding: "16px 24px",
				}}
			>
				<p
					style={{
						color: textColor,
						fontSize: "1rem",
						marginBottom: 10,
						textAlign: "center",
					}}
				>
					{children}
				</p>

				<Button
					background={buttonBackground}
					border={buttonBorderColor}
					borderRadius={buttonBorderRadius}
					borderWidth={buttonBorderWidth}
					padding={buttonPadding}
					onClick={onConfirm}
				>
					{buttonText}
				</Button>
			</div>
		</OpacityFilter>
	);
};
