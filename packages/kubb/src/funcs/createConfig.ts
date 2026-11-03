import path from "node:path";
import { adapterOas } from "@kubb/adapter-oas";
import { pluginClient } from "@kubb/plugin-client";
import { pluginReactQuery, queryKeyTransformer } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";
import { defineConfig } from "kubb/config";
import { ast } from "kubb/kit";
import { generateTagKey } from "./generateTagKey";

export interface CreateConfigParams {
	config: Record<
		string,
		{ name: string; output?: string; clientImportPath?: string } & (
			{ docsPath: string; jsonPath?: never } | { jsonPath: string; docsPath?: never }
		)
	>;
	exclude?: NonNullable<Parameters<typeof pluginTs>[0]>["exclude"];
	dateType?: "date" | "string";
}

export const createConfig = ({
	config,
	exclude,
	dateType = "date",
}: CreateConfigParams): ReturnType<typeof defineConfig>[] =>
	Object.entries(config).map(
		([url, { docsPath, jsonPath, name, output = "./src/lib/api", clientImportPath }]) =>
			defineConfig({
				adapter: adapterOas({
					dateType,
					emptySchemaType: "unknown",
					integerType: "number",
					unknownType: "unknown",
				}),
				input: jsonPath ?? url + docsPath,
				output: {
					barrel: { type: "named" as const },
					clean: true,
					format: false,
					lint: false,
					path: path.resolve(output, "generated", name),
				},
				plugins: [
					pluginTs({ enum: { type: "inlineLiteral" }, exclude }),
					pluginZod({
						exclude,
						macros: [
							ast.defineMacro({
								name: "drop-binary-defaults",
								schema(node) {
									return node.type === "blob" && node.default !== undefined
										? { ...node, default: undefined }
										: undefined;
								},
							}),
						],
					}),
					pluginClient({
						exclude,
						importPath: clientImportPath ?? `@/lib/api/client-${name}`,
						output: { barrel: { type: "named" }, path: "clients" },
					}),
					pluginReactQuery({
						client: "client",
						exclude,
						group: { type: "tag" },
						hooks: true,
						mutationKey: generateTagKey,
						queryKey: props => [...generateTagKey(props), ...queryKeyTransformer(props)],
						suspense: {},
					}),
				],
			}),
	);
