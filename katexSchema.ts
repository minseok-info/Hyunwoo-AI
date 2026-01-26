import { defaultSchema } from "rehype-sanitize";

const katexSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "math",
    "annotation",
    "semantics",
    "mrow",
    "mi",
    "mn",
    "mo",
    "msup",
    "msub",
    "mfrac",
    "sqrt",
    "span",
    "img",
    "ol",
    "li"
  ],
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span || []),
      ["className"],
      ["style"]
    ],
    math: [["xmlns"]],
    img: [
      ["src"],
      ["alt"],
      ["title"]
    ],
    ol: [
      ...(defaultSchema.attributes?.ol || []),
      ["start"]
    ]
  },
};

export default katexSchema;