import { Node, Ontology, OntologyDifference, Relation } from "@/types/ontologyTypes";

const ontologyCompare = (
  oldOntology: Ontology,
  newOntology: Ontology
): OntologyDifference => {
  const oldNodeMap = new Map<Node["id"], Node>(oldOntology.nodes.map(n => [n.id, n]));
  const newNodeMap = new Map<Node["id"], Node>(newOntology.nodes.map(n => [n.id, n]));

  const insertedNodes: Node[] = Array.from(newNodeMap.keys())
    .filter(id => !oldNodeMap.has(id))
    .map(id => newNodeMap.get(id)!);
  const deletedNodes: Node[] = Array.from(oldNodeMap.keys())
    .filter(id => !newNodeMap.has(id))
    .map(id => oldNodeMap.get(id)!);
  const updatedNodes: Node[] = Array.from(oldNodeMap.keys())
    .filter(id => {
      if (!newNodeMap.has(id)) return;

      const oldNode = oldNodeMap.get(id)!;
      const newNode = newNodeMap.get(id)!;

      const isNameOrDescChanged = oldNode.name !== newNode.name || oldNode.desc !== newNode.desc;
      const isTagsChanged = oldNode.tags.length !== newNode.tags.length
        || !oldNode.tags.every(t => newNode.tags.includes(t));

      return isNameOrDescChanged || isTagsChanged;
    })
    .map(id => newNodeMap.get(id)!);

    const oldRelations = oldOntology.relations;
    const newRelations = newOntology.relations;

    const insertedRelations: Relation[] = newRelations
      .filter(nRel => !oldRelations.some(oRel =>
        oRel.from === nRel.from && oRel.to === nRel.to
      ));
    const deletedRelations: Relation[] = oldRelations
      .filter(oRel => !newRelations.some(nRel =>
        nRel.from === oRel.from && nRel.to === oRel.to
      ));

  return {
    nodes: {
      inserted: insertedNodes,
      deleted: deletedNodes,
      updated: updatedNodes
    },
    relations: {
      inserted: insertedRelations,
      deleted: deletedRelations
    }
  };
};

export default ontologyCompare;