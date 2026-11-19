/** Adjusts the sampling interval between windows according to how busy the process was. */
export interface AdaptiveSamplingOptionsDTO {
	/** Interval used while busy. Default: the base sample interval. */
	busyIntervalUs?: number;
	/** Fraction of expected samples that selects the busy interval. Default: 0.25. */
	busyThreshold?: number;
	enabled?: boolean;
	/** Interval used while idle. Default: five times the base sample interval. */
	idleIntervalUs?: number;
}
