/**
 * Convert normal links to direct links.
 */
export function directLink(url: string) {
	if (url.includes("drive.google.com")) {
		return url.replace(/file\/d\/(.+?)\/view.*/g, "uc?id=$1");
	}

	return url;
}
