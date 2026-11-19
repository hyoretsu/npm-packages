/** Resolve frames of bundled JavaScript back to their original sources. */
export interface SourceMapsOptionsDTO {
	/** Number of parsed source maps kept in memory. Default: 64. */
	cacheSize?: number;
	enabled?: boolean;
}
