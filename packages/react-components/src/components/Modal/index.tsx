import React, { ReactNode } from "react";

import { Button } from "../Button";
import { OpacityFilter } from "../OpacityFilter";

import { Styling, ModalText } from "./styles";

export interface ModalProps {
	backgroundColor?: string;
	buttonText?: string;
	children: ReactNode;
	onConfirm: () => void;
	opacity?: number;
	textColor?: string;
}

export const Modal: React.FC<ModalProps> = ({
	backgroundColor = "#c4d3f2",
	buttonText = "Ok",
	children,
	onConfirm,
	opacity,
	textColor = "#000",
}) => {
	return (
		<OpacityFilter opacity={opacity}>
			<Styling style={{ backgroundColor }}>
				<ModalText style={{ color: textColor }}>{children}</ModalText>

				<Button onClick={onConfirm}>{buttonText}</Button>
			</Styling>
		</OpacityFilter>
	);
};
