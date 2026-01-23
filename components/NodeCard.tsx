import styles from "@/styles/nodeCard.module.css";
import { Section } from "@/types/modelParams";
import { Tree } from "@/types/ontologyTypes";
import { treeUtils } from "@/utils";
import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
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
  desc: [
    "Explore and Get to know, Hyunwoo AI.",
    "",
    "1. Click title to expand Section's DESC",
    "2. Click left side arrow to expand Navigator",
    "3. Click chat button to use AI",
    "4. Zoom and Click Meshes to explore Hyunwoo"
  ].join("\n"),
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

const NodeCard = React.forwardRef<
  HTMLDivElement,
  {
    tree: Tree[],
    section: Section | undefined,
    onFirstClick: () => void
  }
>((props, ref) => {
  const { tree, section, onFirstClick } = props;

  const [node, setNode] = useState<Tree>(DEFAULT_TREE);
  const [isToggled, setIsToggled] = useState<boolean>(true);

  const [name, setName] = useState<Tree["name"]>("");
  const [desc, setDesc] = useState<Tree["desc"]>("");

  const isFirstClickRef = useRef<boolean>(false);

  const handleChangeToggleStatus = () => {
    if (!isFirstClickRef.current) onFirstClick();

    setIsToggled(!isToggled);
  };

  useEffect(() => {
    const element = ref && "current" in ref ? ref.current : null;
    if (!element) return;

    element.style.pointerEvents = isToggled ? "auto" : "none";
  }, [isToggled, ref]);

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
      <div ref={ref} className={clsx(styles.card, { [styles.expand]: isToggled })}>
        <div className={clsx(styles.viewerWrapper)}>
          <div className={clsx(styles.nodeDesc, styles.viewer)}>
            <ReactMarkDown remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSchema]]}>
              { desc }
            </ReactMarkDown>
          </div>
        </div>
      </div>
      <div className={clsx(styles.nodeName)} onClick={handleChangeToggleStatus}>
        <p>{ name }</p>
      </div>
    </React.Fragment>
  );
});

export default NodeCard;