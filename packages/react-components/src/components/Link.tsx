import type { UrlObject } from "node:url";
import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import type { CSSProperties, ReactNode } from "react";

export interface LinkProps extends NextLinkProps {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
}

export function Link({
	as,
	children,
	href,
	passHref,
	replace,
	scroll = false,
	shallow,
	style,
	...props
}: LinkProps) {
	if (!href) {
		return <></>;
	}

	let hrefObj: UrlObject = {};

	if (typeof href !== "string") {
		hrefObj = { ...hrefObj, ...href };

		href = href.pathname as string;
		if (hrefObj.query) {
			Object.entries(hrefObj.query).forEach(([query, value], index) => {
				href += `${index === 0 ? "?" : "&"}${query}="${value}"`;
			});
		}
	}

	if (href.includes("http") || href.includes("https") || href.includes("png")) {
		return (
			<a href={href} rel="noopener noreferrer" target="_blank" {...props}>
				{children}
			</a>
		);
	}

	if (href.includes("mailto:")) {
		return (
			<a href={href} {...props}>
				{children}
			</a>
		);
	}

	return (
		<NextLink
			as={as}
			href={href}
			passHref={passHref}
			replace={replace}
			scroll={scroll}
			shallow={shallow}
			style={style}
			{...props}
		>
			{children}
		</NextLink>
	);
}
