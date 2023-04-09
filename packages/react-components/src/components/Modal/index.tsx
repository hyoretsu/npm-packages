import React, { ReactNode } from "react";

import { Button } from "../Button";
import { OpacityFilter } from "../OpacityFilter";

import { Styling, ModalText } from "./styles";

export interface ModalProps {
	buttonText?: string;
	children: ReactNode;
	onConfirm: () => void;
	opacity?: number;
}

export const Modal: React.FC<ModalProps> = ({ buttonText = "Ok", children, onConfirm, opacity }) => {
	return (
		<OpacityFilter opacity={opacity}>
			<Styling>
				<ModalText>{children}</ModalText>

				<Button onClick={onConfirm}>{buttonText}</Button>
			</Styling>
		</OpacityFilter>
	);
};
