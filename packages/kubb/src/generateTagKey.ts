import type { PluginReactQuery } from "@kubb/plugin-react-query";

export const generateTagKey: Required<PluginReactQuery["options"]>["mutationKey"] = ({ operation }) => {
	return operation.getTags()?.map(({ name }) => `'${name}'`) ?? [];
};
