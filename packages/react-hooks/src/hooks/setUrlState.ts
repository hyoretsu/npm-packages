export function setUrlState(key: string[], value: any[]): string {
	const url = new URL(document.URL);

	for (let i = 0; i < key.length; i++) {
		if (url.searchParams.get(key[i]) === value[i]) {
			url.searchParams.delete(key[i]);
		} else {
			url.searchParams.set(key[i], value[i]);
		}
	}

	return url.toString();
}
