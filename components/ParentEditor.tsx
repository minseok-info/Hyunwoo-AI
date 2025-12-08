import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/nodeEditor.module.css";
import { Tree } from "@/types/ontologyTypes";
import { debounceTimer, treeUtils } from "@/utils";
import clsx from "clsx";
import { ChangeEvent, useContext, useEffect, useRef, useState } from "react";

const List = ({ nodes, parentIds, onClick }: { nodes: Tree[], parentIds: Tree["nodeId"][], onClick: (id: Tree["nodeId"]) => void }) => {
  return (
    <div className={clsx(styles.parentsList)}>
      {nodes.map((n, i) => (
        <div className={clsx({ [styles.selectedParent]: parentIds.includes(n.nodeId) })} onClick={() => onClick(n.nodeId)} key={i}>
          <p>{ n.name }</p>
        </div>
      ))}
    </div>
  );
};

const ParentEditor = ({ tree, node }: { tree: Tree[], node: Tree | null }) => {
  const { setTree } = useContext(TreeContext);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [nodeId, setNodeId] = useState<string>("");
  const [parentIds, setParentIds] = useState<Tree["nodeId"][]>([]);

  const [searchingByName, setSearchingByName] = useState<string>("");
  const [searchedParents, setSearchedParents] = useState<Tree[]>([]);

  const handleChangeSearchingByName = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchingByName(value);
  }
  const handleSearchParents = () => {
    const childrenIds: Tree["nodeId"][] = [];
    treeUtils.traverseTree(node!.children, n => {
      if (!childrenIds.includes(n.nodeId)) childrenIds.push(n.nodeId);
    });

    const filteredParents: Tree[] = [];
    treeUtils.traverseTree(tree, n => {
      const parentName = n.name.toLowerCase();
      const searchingName = searchingByName.toLowerCase();

      if (filteredParents.some(p => p.nodeId === n.nodeId)) return;
      else if (n.nodeId === nodeId) return;
      else if (childrenIds.includes(n.nodeId)) return;

      if (parentName.includes(searchingName)) {
        filteredParents.push(n);
      }
    });

    setSearchedParents(filteredParents);
  };
  const handleUpdateParent = (id: Tree["nodeId"]) => {
    let tempIds = [...parentIds];
    if (parentIds.includes(id)) tempIds = tempIds.filter(ti => ti !== id);
    else tempIds.push(id);
    setParentIds(tempIds);

    const newTree = treeUtils.updateParents(tree, nodeId, [...tempIds]);
    setTree(newTree);
  };

  useEffect(() => {
    if (!node) return;
    setNodeId(node.nodeId);
  }, [node]);

  useEffect(() => {
    if (nodeId === "") return;

    const tempParentIds: Tree["nodeId"][] = [];
    treeUtils.traverseTree(tree, n => {
      if (tempParentIds.includes(n.nodeId)) return;
      if (n.children.some(c => c.nodeId === nodeId)) tempParentIds.push(n.nodeId);
    });
    setParentIds(tempParentIds);
    handleSearchParents();
  }, [nodeId]);

  useEffect(() => {
    if (nodeId === "") return;
    debounceTimer(timerRef, handleSearchParents);
  }, [searchingByName]);

  return (
    <div className={clsx(styles.parentEditor)}>
      <h4>PARENTS</h4>
      <input type="text" placeholder="Search by Name" value={searchingByName} onChange={handleChangeSearchingByName} />
      <List nodes={searchedParents} parentIds={parentIds} onClick={handleUpdateParent} />
    </div>
  );
};

export default ParentEditor;