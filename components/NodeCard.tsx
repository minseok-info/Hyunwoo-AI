import styles from "@/styles/nodeCard.module.css";
import { Section } from "@/types/modelParams";
import { Tree } from "@/types/ontologyTypes";
import { treeUtils } from "@/utils";
import clsx from "clsx";
import React, { useEffect, useState } from "react";
import ReactMarkDown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const DEFAULT_TREE: Tree = {
  treeId: "Hyunwoo AI",
  nodeId: "Hyunwoo AI",
  name: "Hyunwoo AI",
  desc: "Hyunwoo AI를 클릭해서 진행하세요",
  tags: [],
  children: []
};

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

const NodeCard = ({ tree, section }: { tree: Tree[], section: Section | undefined }) => {
  const [node, setNode] = useState<Tree>(DEFAULT_TREE);
  const [isToggled, setIsToggled] = useState<boolean>(false);

  const [name, setName] = useState<Tree["name"]>("");
  const [desc, setDesc] = useState<Tree["desc"]>("");

  useEffect(() => {
    if (!tree || !section) return;

    const currentNode = treeUtils.getNode(tree, section.id);
    if (!currentNode) {
      setNode(DEFAULT_TREE);
      return;
    }

    setNode(currentNode);
  }, [tree, section]);

  useEffect(() => {
    setName(node.name);
    setDesc(node.desc);
  }, [node]);

  return (
    <React.Fragment>
      <div className={clsx(styles.card, { [styles.expand]: isToggled })}>
        <div className={clsx(styles.nodeDesc, styles.viewer)}>
          <ReactMarkDown remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSchema]]}>
            { desc }
          </ReactMarkDown>
        </div>
      </div>
      <div className={clsx(styles.nodeName)} onClick={() => setIsToggled(!isToggled)}>
        <p>{ name }</p>
      </div>
    </React.Fragment>
  );
};

export default NodeCard;