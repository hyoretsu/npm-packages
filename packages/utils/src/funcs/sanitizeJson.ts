export function sanitizeJson(json: Record<any, any>) {
	return JSON.parse(JSON.stringify(json));
}
