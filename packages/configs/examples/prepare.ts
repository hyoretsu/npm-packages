const prepare = async () => {
	const { $ } = await import("bun");

	try {
		await Promise.all([$`git config --local core.hooksPath .githooks`.quiet()]);
	} catch {}
};

prepare();
