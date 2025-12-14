import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/treeStatus.module.css";
import { Node, Ontology, OntologyDifference, Relation, Tree } from "@/types/ontologyTypes";
import { ontologyCompare, ontologyToTree, treeToOntology, treeUtils } from "@/utils";
import clsx from "clsx";
import Image from "next/image";
import { useContext, useEffect, useState } from "react";

const undoIcon = {
  src: require("@/public/icons/undo.svg"),
  alt: "undo"
};

const TreeStatus = ({ tree }: { tree: Tree[] }) => {
  const { oldOntology, saveOntology, setTree } = useContext(TreeContext);

  type NodeStatus = keyof OntologyDifference["nodes"];
  type RelationStatus = keyof OntologyDifference["relations"];
  
  type NodeEntry = [Node, NodeStatus];
  type RelationEntry = [Relation, RelationStatus];
  
  const [nodeEntries, setNodeEntries] = useState<NodeEntry[]>([]);
  const [relationEntries, setRelationEntries] = useState<RelationEntry[]>([]);

  const statusColorMap: Record<NodeStatus, string> = {
    inserted: styles.inserted,
    deleted: styles.deleted,
    updated: styles.updated
  };

  const undoNode = (index: number) => {
    const latestOntology = treeToOntology(tree);

    const node = nodeEntries[index][0];
    const status = nodeEntries[index][1];

    let newTree = [ ...tree ];
    if (status === "inserted") {
      newTree = treeUtils.deleteNode(newTree, node.id);
    }
    else if (status === "deleted") {
      const nodeRelations = oldOntology.relations.filter(rel => {
        return rel.type === "parent" && rel.to === node.id;
      });

      const newOntology = { nodes: [...latestOntology.nodes], relations: [...latestOntology.relations] };
      newOntology.nodes.push(node);
      newOntology.relations.push(...nodeRelations);
      
      newTree = ontologyToTree(newOntology);
    }
    else if (status === "updated") {
      const prevInform = oldOntology.nodes.filter(n => n.id === node.id)[0];
      const prevRels = oldOntology.relations.filter(r => r.to === node.id);
      const prevParents = prevRels.map(r => r.from);
      
      newTree = treeUtils.updateNode(newTree, prevInform.id, n => {
        return { ...n, name: prevInform.name, desc: prevInform.desc, tags: prevInform.tags };
      });
      newTree = treeUtils.updateParents(newTree, prevInform.id, prevParents);
    }
    setTree(newTree);
  };
  
  useEffect(() => {
    if (!oldOntology || !tree) return;
    else if (tree.length < 1) return;

    const newOntology = treeToOntology(tree);
    const ontologyDifference = ontologyCompare(oldOntology, newOntology);
    
    const nodesDiff = ontologyDifference.nodes;
    const relsDiff = ontologyDifference.relations;

    const buildNameMap = (nodes: Ontology["nodes"]) => {
      const map: Record<Tree["nodeId"], Tree["name"]> = {};
  
      for (const n of nodes) {
        map[n.id] = n.name;
      }
  
      return map;
    };

    const nameMap = buildNameMap([...oldOntology.nodes, ...newOntology.nodes]);

    const nodeMap = Object.entries(nodesDiff).flatMap(([status, nodes]) => {
      return Object.values(nodes).map(v => [v, status] as [Node, NodeStatus]);
    });
    const relMap = Object.entries(relsDiff).flatMap(([status, relations]) => {
      return Object.values(relations).map(v => {
        return [{ ...v, from: nameMap[v.from], to: nameMap[v.to] }, status] as [Relation, RelationStatus]
      });
    });

    setNodeEntries(nodeMap);
    setRelationEntries(relMap);
  }, [oldOntology, tree]);

  return (
    <div>
      <div className={clsx(styles.save)}>
        <button onClick={saveOntology}>Save</button>
      </div>
      <div className={clsx(styles.changes)}>
        <div>
          <h5>Nodes</h5>
          <div className={styles.list}>
            {nodeEntries.map(([n, s], i) => (
              <div className={clsx(statusColorMap[s])} key={i}>
                <p>{ n.name }</p>
                <div className={clsx(styles.undo)} onClick={() => undoNode(i)}>
                  <Image src={undoIcon.src} alt={undoIcon.alt} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h5>Relations</h5>
          <div className={styles.list}>
            {relationEntries.map(([r, s], i) => (
              <div className={clsx(statusColorMap[s])} key={i}>
                <p>{r.to}</p>
                <p>into</p>
                <p>{ r.from }</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreeStatus;