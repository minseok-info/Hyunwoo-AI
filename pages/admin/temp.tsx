import { NodeEditor, SidebarNavigator } from "@/components";
import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/temp.module.css";
import { Node, Ontology, Relation, Tree } from "@/types/ontologyTypes";
import { ontologyToTree, treeUtils } from "@/utils";
import clsx from "clsx";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

const Temp = () => {
  const { query, pathname, push } = useRouter();

  const [treeId, setTreeId] = useState<Tree["treeId"]>("");
  const [nodePath, setNodePath] = useState<Tree[]>([]);
  const [tree, setTree] = useState<Tree[]>([]);

  const [nodeId, setNodeId] = useState<Tree["nodeId"]>("");

  const idBrain = crypto.randomUUID();
  const idLeft = crypto.randomUUID();
  const idRight = crypto.randomUUID();
  const idNeuron1 = crypto.randomUUID();
  const idNeuron2 = crypto.randomUUID();
  const idSynapse1 = crypto.randomUUID();
  const idSynapse2 = crypto.randomUUID();

  const nodes: Node[] = [
    { id: idBrain, name: "Brain", desc: "first" },
    { id: idLeft, name: "Left", desc: "second" },
    { id: idRight, name: "Right", desc: "third" },
    { id: idNeuron1, name: "Neuron1", desc: "fourth" },
    { id: idNeuron2, name: "Neuron2", desc: "fifth" },
    { id: idSynapse1, name: "Synapse1", desc: "sixth" },
    { id: idSynapse2, name: "Synapse2", desc: "seventh" }
  ];

  const relations: Relation[] = [
    { from: idBrain, to: idLeft, type: "parent" },
    { from: idBrain, to: idRight, type: "parent" },
    { from: idLeft, to: idNeuron1, type: "parent" },
    { from: idRight, to: idNeuron1, type: "parent" },
    { from: idRight, to: idNeuron2, type: "parent" },
    { from: idNeuron1, to: idSynapse2, type: "parent" },
    { from: idNeuron2, to: idSynapse1, type: "parent" },
    { from: idNeuron2, to: idSynapse2, type: "parent" }
  ];

  const handleSetTree = (newTree: Tree[]) => {
    setTree(newTree);
  };

  const handleSetId = (newTreeId: Tree["treeId"], newNodeId: Tree["nodeId"]) => {
    setTreeId(newTreeId);
    setNodeId(newNodeId);

    push({
      pathname: pathname,
      query: { ...query, treeId: newTreeId, nodeId: newNodeId }
    }, undefined, { shallow: true });
  };

  useEffect(() => {
    if (typeof query.treeId === "string") setTreeId(query.treeId);

    const tempPath = treeUtils.traverseTree<Tree[]>(tree, (node, prevNode) => {
      if (node.treeId === query.treeId) return prevNode;
    }) || [];
    setNodePath(tempPath);
  }, [query.treeId]);

  useEffect(() => {
    if (typeof query.nodeId === "string") setNodeId(query.nodeId);
  }, [query.nodeId]);

  useEffect(() => {
    const ontology: Ontology = {
      nodes: nodes,
      relations: relations
    };

    setTree(ontologyToTree(ontology));
  }, []);

  return (
    <div className={clsx("fullScreen flex", styles.board, styles.colorAttr)}>
      <TreeContext.Provider value={{ treeId: treeId, nodePath: nodePath, nodeId: nodeId, setTree: handleSetTree, setId: handleSetId }}>
        <SidebarNavigator tree={tree} />
        <NodeEditor tree={tree} />
      </TreeContext.Provider>
    </div>
  );
}

export default Temp;