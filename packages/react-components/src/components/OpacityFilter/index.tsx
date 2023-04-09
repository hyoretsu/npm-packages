import React, { ReactNode } from "react";

import { Styling } from "./styles";

export interface OpacityFilterProps {
	children: ReactNode;
	/** Value between 0 and 1. */
	opacity?: number;
}

export const OpacityFilter: React.FC<OpacityFilterProps> = ({ children, opacity }) => {
	return <Styling opacity={opacity}>{children}</Styling>;
};
