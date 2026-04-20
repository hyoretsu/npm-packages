import { type Config, defineConfig, URLPath } from "@kubb/core";
import { type Exclude, pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";
import { generateTagKey } from "./generateTagKey";

const exclude: Exclude[] = [
	{
		pattern: "External",
		type: "tag",
	},
];

export type CreateConfig = (data: {
	config: {
		[url: string]: {
			docsPath: string;
			name: string;
		};
	};
}) => Config;

export const createConfig: CreateConfig = ({ config }) =>
	defineConfig(
		Object.entries(config).map(([url, { docsPath, name }]) => ({
			input: {
				path: url + docsPath,
			},
			output: {
				clean: true,
				format: "auto",
				lint: "auto",
				path: `./generated/${name}`,
			},
			plugins: [
				pluginOas(),
				pluginTs({
					dateType: "date",
					exclude,
				}),
				pluginZod({ exclude }),
				pluginReactQuery({
					client: {
						importPath: `../../../../client-${name}.ts`,
					},
					exclude,
					group: {
						type: "tag",
					},
					mutationKey: generateTagKey,
					queryKey: props => {
						const { operation, schemas } = props;

						return [
							...generateTagKey(props),
							...[
								new URLPath(operation.path).template,
								schemas.queryParams?.name && "...(params ? [params] : [])",
								schemas.request?.name && "...(data ? [data] : [])",
							].filter(Boolean),
						];
					},
				}),
			],
			root: "./src/lib/api",
		})),
	);
