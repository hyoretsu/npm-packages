import { type Config, defineConfig, URLPath } from "@kubb/core";
import { type Exclude, pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";
import { generateTagKey } from "./generateTagKey";
import path from "node:path";

export interface CreateConfigParams {
	config: {
		[url: string]: {
			name: string;
			/** Will contain a `generated` folder with each config's folder. */
			output?: string;
		} & (
			| {
					docsPath: string;
					jsonPath?: never;
			  }
			| {
					jsonPath: string;
					docsPath?: never;
			  }
		);
	};
	exclude?: Exclude[];
}

export const createConfig = ({ config, exclude }: CreateConfigParams): Config =>
	defineConfig(
		Object.entries(config).map(([url, { docsPath, jsonPath, name, output = "./src/lib/api" }]) => ({
			input: {
				path: jsonPath ?? url + docsPath,
			},
			output: {
				clean: true,
				format: "auto",
				lint: "auto",
				path: path.resolve(output, "generated", name),
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
		})),
	);
