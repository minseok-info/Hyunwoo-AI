import { Node, Ontology, Tree } from "@/types/ontologyTypes";

const ontologyToTree = (ontology: Ontology): Tree[] => {
  const nodes = ontology.nodes;
  const relations = ontology.relations;

  const nodeMap = new Map<string, Node>(nodes.map(n => [n.id, n]));

  const childrenMap = new Map<string, Node[]>();
  relations.forEach(rel => {
    if (!childrenMap.has(rel.from)) childrenMap.set(rel.from, []);
    childrenMap.get(rel.from)!.push(nodeMap.get(rel.to)!);
  });

  const rootNodes = nodes.filter(n => !relations.some(r => r.to === n.id));

  let count = 0;
  const buildTree = (node: Node): Tree => {
    const childrenNodes = childrenMap.get(node.id) || [];
    const { id, ...rest } = node;

    return {
      ...rest,
      treeId: crypto.randomUUID(),
      nodeId: id,
      children: childrenNodes.map(buildTree)
    };
  };

  return rootNodes.map(buildTree);
}

export default ontologyToTree;