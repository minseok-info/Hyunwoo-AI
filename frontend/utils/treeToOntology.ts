import { Ontology, Tree } from "@/types/ontologyTypes";
import treeUtils from "./treeUtils";

const treeToOntology = (tree: Tree[]): Ontology => {
  const ontology: Ontology = {nodes: [], relations: []};
  treeUtils.traverseTree(tree, n => {
    if (ontology.nodes.some(o => o.id === n.nodeId)) return;
    ontology.nodes.push({ id: n.nodeId, name: n.name, desc: n.desc, tags: n.tags });
    n.children.forEach(child => {
      ontology.relations.push({ from: n.nodeId, to: child.nodeId, type: "parent" });
    });
  });

  return ontology;
};

export default treeToOntology;