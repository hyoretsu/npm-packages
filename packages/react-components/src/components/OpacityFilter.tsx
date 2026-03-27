import type React from "react";
import type { CSSProperties, ReactNode } from "react";

export interface OpacityFilterProps {
	children: ReactNode;
	className?: string;
	/** Value between 0 and 1. */
	opacity?: number;
	style?: CSSProperties;
}

export const OpacityFilter: React.FC<OpacityFilterProps> = ({
	children,
	className,
	opacity = 0.5,
	style,
}) => {
	if (opacity < 0 || opacity > 1) {
		throw new Error("The only valid values for opacity are numbers between 0 and 1");
	}

	return (
		<div
			className={className}
			style={{
				alignItems: "center",
				backgroundColor: `rgba(0, 0, 0, ${opacity})`,
				display: "flex",
				height: "100%",
				justifyContent: "center",
				left: 0,
				position: "fixed",
				top: 0,

				width: "100%",
				zIndex: 1000,
				...style,
			}}
		>
			{children}
		</div>
	);
};
