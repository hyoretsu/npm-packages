/**
 * Flat string-to-string labels attached to a profile or to individual samples.
 * Keys must match `[a-zA-Z_][a-zA-Z0-9_]*`; values must be non-empty single-line strings.
 */
export type ProfileLabelsDTO = Record<string, string>;
