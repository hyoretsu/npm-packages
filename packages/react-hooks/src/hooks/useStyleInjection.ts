import { useEffect } from "react";

/** Injects custom CSS into the DOM without creating dupes. */
export const useStyleInjection = (style: string) => {
	useEffect(() => {
		// Check for duplicates
		const styles = document.head.querySelectorAll("style");
		for (const elem of styles) {
			if (elem.innerHTML.search(style) >= 0) {
				return;
			}
		}

		const styleElement = document.createElement("style");
		styleElement.innerHTML = style;

		document.head.appendChild(styleElement);
	}, [style]);
};
