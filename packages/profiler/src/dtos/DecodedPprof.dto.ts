/** A pprof profile decoded by `decodePprof`, with names resolved through the string table. */
export interface DecodedPprofDTO {
	durationNanos: string;
	functions: Array<{ filename: string; id: number; name: string; startLine: number; systemName: string }>;
	locations: Array<{ id: number; lines: Array<{ column: number; functionId: number; line: number }> }>;
	period: string;
	periodType?: { type: string; unit: string };
	sampleTypes: Array<{ type: string; unit: string }>;
	samples: Array<{
		/** Per-sample labels (string labels only). */
		labels: Record<string, string>;
		locationIds: number[];
		/** Function names, leaf first. */
		stack: string[];
		values: number[];
	}>;
	stringTable: string[];
	timeNanos: string;
}
