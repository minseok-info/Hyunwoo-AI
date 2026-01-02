import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/nodeEditor.module.css";
import { Tree } from "@/types/ontologyTypes";
import { debounceTimer, treeUtils } from "@/utils";
import clsx from "clsx";
import { ChangeEvent, useContext, useEffect, useRef, useState } from "react";
import ParentEditor from "./ParentEditor";
import TagEditor from "./TagEditor";
import ChildrenEditor from "./ChildrenEditor";
import Path from "./Path";
import ReactMarkDown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";

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

const NodeEditor = ({ tree }: { tree: Tree[] }) => {
  const { nodeId, setTree } = useContext(TreeContext);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [node, setNode] = useState<Tree | null>(null);

  const [name, setName] = useState<Tree["name"]>("");
  const [desc, setDesc] = useState<Tree["desc"]>("");

  const [descMode, setDescMode] = useState<"md" | "viewer">("md");

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;

    setDesc(prev =>
      prev.slice(0, selectionStart)
      + text
      + prev.slice(selectionEnd)
    );

    requestAnimationFrame(() => {
      textarea.selectionStart =
        textarea.selectionEnd =
          selectionStart + text.length;
    });
  };

  const handleChangeDescMode = (mode: "md" | "viewer") => {
    setDescMode(mode);
  };

  const handleChangeName = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setName(value);
  };

  const handleChangeDesc = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setDesc(value);
  };

  const handleChangeTree = () => {
    const newTree = treeUtils.updateNode(tree, nodeId, n => {
      return { ...n, name, desc };
    });
    setTree(newTree);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData("text/plain");
    const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([^/]+)/;

    if (text.includes("drive.google.com/file/d/")) {
      const match = text.match(driveRegex);
      const fileId = match?.[1];

      if (fileId) {
        event.preventDefault();

        const  markdownIMG = "![image name]";
        const googleDrvieCDN = "https://lh3.googleusercontent.com/d/";
        const normalizedText = `${markdownIMG}(${googleDrvieCDN}${fileId}=w1200)`;
        insertAtCursor(normalizedText);
      }
    }
  };

  useEffect(() => {
    if (!node) return;
    else if (node.name === name && node.desc === desc) return;
    debounceTimer(timerRef, handleChangeTree, 250);
  }, [name, desc]);

  useEffect(() => {
    if (nodeId === "") {
      setNode(null);
      return;
    }
    
    treeUtils.traverseTree(tree, n => {
      if (n.nodeId === nodeId) {
        setNode(n);
        return true;
      }
    });
  }, [tree, nodeId]);

  useEffect(() => {
    if (!node) return;
    setName(node.name);
    setDesc(node.desc);
  }, [node]);

  if (!node) {
    return (
      <div className={clsx(styles.editor)}>
        <div className={clsx(styles.nothingWrapper)}>
          <p>{`Select Any :D`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(styles.editor)}>
      <div className={clsx(styles.path)}>
        <Path node={node} />
      </div>
      <div className={clsx(styles.wrapper)}>
        <div className={clsx(styles.name)}>
          <input type="text" placeholder="New Page" value={name} onChange={handleChangeName} />
        </div>
        <div className={clsx(styles.meta)}>
          <ParentEditor tree={tree} node={node} />
          <TagEditor tree={tree} node={node} />
        </div>
        <div className={clsx(styles.desc)}>
          <div className={clsx(styles.descTool)}>
            <p className={clsx({ [styles.descToolSelected]: descMode === "md" })} onClick={() => handleChangeDescMode("md")}>MD</p>
            <p className={clsx({ [styles.descToolSelected]: descMode === "viewer" })} onClick={() => handleChangeDescMode("viewer")}>VIEWER</p>
          </div>
          {descMode === "md" && (
            <textarea ref={textareaRef} placeholder="New Description" value={desc} onChange={handleChangeDesc} onPaste={handlePaste} />
          )}
          {descMode === "viewer" && (
            <div className={clsx(styles.descViewer)}>
              <ReactMarkDown remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSchema]]}>
                { desc }
              </ReactMarkDown>
            </div>
          )}
        </div>
        <div className={clsx(styles.children)}>
          <ChildrenEditor tree={tree} node={node} />
        </div>
      </div>
    </div>
  );
};

export default NodeEditor;