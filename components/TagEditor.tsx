import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/nodeEditor.module.css";
import { Tree } from "@/types/ontologyTypes";
import { treeUtils } from "@/utils";
import clsx from "clsx";
import React, { ChangeEvent, KeyboardEvent, useContext, useEffect, useRef, useState } from "react";

const Tag = ({ name, onClick }: { name: string, onClick?: () => void }) => {
  return (
    <div className={clsx(styles.tag)} onClick={onClick}>
      <p>{ name }</p>
    </div>
  );
};

const TagExplorer = ({ tags, upsertTag }: { tags: Tree["tags"], upsertTag: (newTag: Tree["tags"][number]) => void }) => {
  return (
    <div className={clsx(styles.list, styles.tagExplorer)}>
      {tags.map((t, i) => (
        <div key={i}>
          <Tag name={t} onClick={() => upsertTag(t)} />
        </div>
      ))}
    </div>
  );
};

const TagEditor = ({ tree, node }: { tree: Tree[], node: Tree }) => {
  const { setTree } = useContext(TreeContext);

  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [allTags, setAllTags] = useState<Tree["tags"]>([]);
  const [filteredTags, setFilteredTags] = useState<Tree["tags"]>([]);
  const [nodeTags, setNodeTags] = useState<Tree["tags"]>([]);

  const [inputValue, setInputValue] = useState<Tree["tags"][number]>("");
  const [isFocusedInput, setIsFocusedInput] = useState<boolean>(false);

  const upsertTag = (newTag: Tree["tags"][number]) => {
    if (nodeTags.includes(newTag)) return;
    setInputValue("");

    const newTree = treeUtils.updateNode(tree, node.nodeId, n => {
      return { ...n, tags: [ ...n.tags, newTag ] };
    });
    setTree(newTree);
  }

  const handleRemoveTag = (targetTag: Tree["tags"][number]) => {
    const newTags = [...nodeTags.filter(t => t !== targetTag)];
    const newTree = treeUtils.updateNode(tree, node.nodeId, n => {
      return { ...n, tags: [ ...newTags ] };
    });
    setTree(newTree);
  }

  const handleFocusInputElement = () => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    setIsFocusedInput(true);
    window.addEventListener("click", handleCheckFocus, { once: true });
  }

  const handleCheckFocus = (event: MouseEvent) => {
    if (!editorRef.current || !inputRef.current) return;

    const target = event.target as Node | null;

    if (!target || !editorRef.current.contains(target)) {
      setIsFocusedInput(false);
    }
    else {
      window.addEventListener("click", handleCheckFocus, { once: true });
    }
  }

  const handleChangeInput = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
  }

  const handlePressEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    if (inputValue.replace(/ /g, "") === "") return;
    upsertTag(inputValue);
  }

  useEffect(() => {
    const temp: Tree["tags"] = [];
    allTags.forEach(t => {
      if (nodeTags.includes(t)) return;
      if (t.includes(inputValue)) temp.push(t);
    });
    setFilteredTags(temp);
  }, [allTags, nodeTags, inputValue]);
  
  useEffect(() => {
    if (!node) return;
    setNodeTags(node.tags);
  }, [node]);

  useEffect(() => {
    if (tree.length < 1) return;
    
    const tempTags: Tree["tags"] = [];
    const checkedNodes: Tree["nodeId"][] = [];
    treeUtils.traverseTree(tree, n => {
      if (checkedNodes.includes(n.nodeId)) return;
      n.tags.forEach(nt => {
        if (!tempTags.includes(nt)) tempTags.push(nt);
      });
      checkedNodes.push(n.nodeId);
    });
    setAllTags(tempTags);
  }, [tree]);

  return (
    <div ref={editorRef} className={clsx(styles.tagEditor)}>
      <h4>TAGS</h4>
      <div className={clsx(styles.list, styles.tagList)} onClick={handleFocusInputElement}>
        {nodeTags.map((t, i) => (
          <Tag name={t} onClick={() => handleRemoveTag(t)} key={i} />
        ))}
        <div className={clsx(styles.tagInput)}>
          <input ref={inputRef} type="text" value={inputValue} onChange={handleChangeInput} onKeyDown={handlePressEnter} />
        </div>
      </div>
      {isFocusedInput && (
        <div className={clsx(styles.tagInputPanel)}>
          <div className={clsx(styles.additionalText)}>
            <p>옵션 선택 또는 생성</p>
          </div>
          {filteredTags.length > 0 && <TagExplorer tags={filteredTags} upsertTag={upsertTag} />}
          {inputValue !== "" && !allTags.some(t => t === inputValue) && (
            <div className={clsx(styles.generateTag)}>
              <p>생성</p>
              <p>{ inputValue }</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagEditor;