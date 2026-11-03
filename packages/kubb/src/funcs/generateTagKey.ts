import type { Transformer } from "@kubb/plugin-react-query";

export const generateTagKey: Transformer = ({ node }) => node.tags.map(tag => JSON.stringify(tag));
