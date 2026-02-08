import type { UserConfig } from "@commitlint/types";

export default {
	extends: ["@commitlint/config-conventional"],
	prompt: {
		questions: {
			type: {
				enum: {
					bump: {
						description: "Package updates.",
						emoji: "⬆️",
					},
					change: {
						description: "Simple changes that don't amount to a feature.",
						emoji: "🔄",
					},
					misc: {
						description: "Miscellaneous changes.",
						emoji: "🧱",
					},
				},
			},
		},
	},
	rules: {
		"body-case": [2, "always", ["camel-case", "lower-case", "pascal-case"]],
	},
} satisfies UserConfig;
