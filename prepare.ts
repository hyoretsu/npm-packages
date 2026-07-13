import { $ } from "bun";

// Lefthook manages the git hooks (see lefthook.yml). Clear any legacy hooksPath
// override so Lefthook's own .git/hooks shims are used.
await Promise.all([
	$`git config --local --unset core.hooksPath`.nothrow().quiet(),
	$`bunx lefthook install`.quiet(),
]);
