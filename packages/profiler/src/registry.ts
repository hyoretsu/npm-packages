/** Process-wide slot guaranteeing a single inspector sampler (shared by every bundle of this package). */
const ACTIVE = Symbol.for("@hyoretsu/profiler.active-sampler");
const slot = globalThis as typeof globalThis & { [ACTIVE]?: object };

export const samplerRegistry = {
	acquire(owner: object): boolean {
		if (slot[ACTIVE] && slot[ACTIVE] !== owner) return false;
		slot[ACTIVE] = owner;
		return true;
	},
	isHeldByOther(owner?: object): boolean {
		return slot[ACTIVE] !== undefined && slot[ACTIVE] !== owner;
	},
	release(owner: object): void {
		if (slot[ACTIVE] === owner) delete slot[ACTIVE];
	},
};
