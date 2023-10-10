import React, { PropsWithChildren } from "react";
import NextLink, { LinkProps } from "next/link";
import { UrlObject } from "url";

export const Link: React.FC<PropsWithChildren & LinkProps> = ({
	as,
	children,
	href,
	passHref,
	replace,
	scroll = false,
	shallow,
	...props
}) => {
	let hrefObj: UrlObject = {};

	if (href && typeof href !== "string") {
		hrefObj = { ...hrefObj, ...href };

		href = href.pathname as string;
		if (hrefObj.query) {
			Object.entries(hrefObj.query).forEach(([query, value], index) => {
				href += `${index === 0 ? "?" : "&"}${query}="${value}"`;
			});
		}
	}

	if (href?.includes("http") || href?.includes("https") || href?.includes("png")) {
		return (
			<a href={href} target="_blank" rel="noopener noreferrer" {...props}>
				{children}
			</a>
		);
	}

	if (href?.includes("mailto:")) {
		return <a href={href}>{children}</a>;
	}

	return (
		<NextLink as={as} href={href} passHref={passHref} replace={replace} scroll={scroll} shallow={shallow}>
			{children}
		</NextLink>
	);
};
