export function setUrlState(statesToSet: Record<string, any>): string {
	const url = new URL(document.URL);

	for (const [key, value] of Object.entries(statesToSet)) {
		if (!value) {
			url.searchParams.delete(key);
		} else {
			url.searchParams.set(key, value);
		}
	}

	return url.toString();
}
