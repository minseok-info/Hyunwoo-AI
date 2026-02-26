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
    "li",
    "iframe"
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
    iframe: [
      ["src"],
      ["width"],
      ["height"],
      ["style"],
      ["allowfullscreen"],
      ["loading"],
      ["referrerpolicy"]
    ],
    ol: [
      ...(defaultSchema.attributes?.ol || []),
      ["start"]
    ]
  },
};

export default katexSchema;