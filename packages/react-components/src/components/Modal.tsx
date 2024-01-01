import React, { CSSProperties, ReactNode } from "react";
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
	children: ReactNode | string;
	className?: string;
	onConfirm: () => void;
	opacity?: number;
	style?: CSSProperties;
	textColor?: string;
}

export function Modal({
	backgroundColor = "#c4d3f2",
	buttonBackground,
	buttonBorderColor,
	buttonBorderRadius,
	buttonBorderWidth,
	buttonPadding,
	buttonText = "Ok",
	children,
	className,
	onConfirm,
	opacity,
	style,
	textColor = "#000",
}: ModalProps) {
	return (
		<OpacityFilter opacity={opacity}>
			<div
				className={className}
				style={{
					alignItems: "center",
					backgroundColor,
					borderRadius: 15,
					display: "flex",
					flexDirection: "column",
					maxWidth: "45%",
					padding: "16px 24px",
					...style,
				}}
			>
				{typeof children === "string" ? (
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
				) : (
					children
				)}

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
}
