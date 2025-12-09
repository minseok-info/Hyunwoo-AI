import TreeContext from "@/contexts/TreeContext";
import { Tree } from "@/types/ontologyTypes";
import React, { useContext, useEffect, useState } from "react";

const Path = ({ node }: { node: Tree }) => {
  const { nodePath, setId } = useContext(TreeContext);

  const [path, setPath] = useState<Tree[]>([]);

  const handleChangeNode = (newNode: Tree) => {
    if (newNode === node) return;
    setId(newNode.treeId, newNode.nodeId);
  };

  useEffect(() => {
    setPath([...nodePath, node]);
  }, [nodePath]);

  return path.map((n, i) => (
    <React.Fragment key={i}>
      <p onClick={() => handleChangeNode(n)}>{ n.name }</p>
      {i !== path.length - 1 && <p>/</p>}
    </React.Fragment>
  ));
};

export default Path;