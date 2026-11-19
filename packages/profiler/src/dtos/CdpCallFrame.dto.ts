/** Call frame of a Chrome DevTools Protocol (`Profiler.*`) profile node. */
export interface CdpCallFrameDTO {
	columnNumber: number;
	functionName: string;
	lineNumber: number;
	scriptId: string;
	url: string;
}
