import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/treeStatus.module.css";
import { Node, Ontology, OntologyDifference, Relation, Tree } from "@/types/ontologyTypes";
import { ontologyCompare, treeToOntology } from "@/utils";
import clsx from "clsx";
import { useContext, useEffect, useState } from "react";

const TreeStatus = ({ tree }: { tree: Tree[] }) => {
  const { oldOntology, saveOntology } = useContext(TreeContext);

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

  const buildNameMap = (nodes: Ontology["nodes"]) => {
    const map: Record<Tree["nodeId"], Tree["name"]> = {};

    for (const n of nodes) {
      map[n.id] = n.name;
    }

    return map;
  }

  useEffect(() => {
    if (!oldOntology || !tree) return;

    const treeCopied = [ ...tree ];
    if (treeCopied.length < 1) return;

    const newOntology = treeToOntology(treeCopied);
    const ontologyDifference = ontologyCompare(oldOntology, newOntology);

    const nodesDiff = ontologyDifference.nodes;
    const relsDiff = ontologyDifference.relations;

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