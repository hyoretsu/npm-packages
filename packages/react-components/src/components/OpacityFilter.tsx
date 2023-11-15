import React, { ReactNode } from "react";

export interface OpacityFilterProps {
	children: ReactNode;
	className?: string;
	/** Value between 0 and 1. */
	opacity?: number;
}

export const OpacityFilter: React.FC<OpacityFilterProps> = ({ children, className, opacity = 0.5 }) => {
	return (
		<div
			className={className}
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				position: "fixed",
				top: 0,
				left: 0,
				zIndex: 1000,

				width: "100%",
				height: "100%",
				backgroundColor: `rgba(0, 0, 0, ${opacity})`,
			}}
		>
			{children}
		</div>
	);
};
