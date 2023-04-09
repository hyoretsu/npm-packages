import React, { ReactNode } from "react";
import NextLink, { LinkProps as NextLinkProps } from "next/link";

export interface LinkProps extends NextLinkProps {
	children: ReactNode;
	href: string;
}

export const Link: React.FC<LinkProps> = ({
	as,
	children,
	href,
	passHref,
	replace,
	scroll = false,
	shallow,
	...props
}) => {
	if (href.includes("http") || href.includes("png")) {
		return (
			<a href={href} target="_blank" rel="noopener noreferrer" {...props}>
				{children}
			</a>
		);
	}

	if (href.includes("mailto:")) {
		return <a href={href}>{children}</a>;
	}

	return (
		<NextLink as={as} href={href} passHref={passHref} replace={replace} scroll={scroll} shallow={shallow}>
			{children}
		</NextLink>
	);
};
