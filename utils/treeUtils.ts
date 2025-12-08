import { Tree } from "@/types/ontologyTypes";

const traverseTree = <R = any>(
  tree: Tree[],
  callback: (node: Tree, path: Tree[]) => R | undefined
): R | undefined => {
  const dfs = (nodes: Tree[], prevNodes: Tree[] = []): R | undefined => {
    for (const n of nodes) {
      const nodeResult = callback((n as Tree), prevNodes);
      if (nodeResult !== undefined) return nodeResult;

      if (n.children.length > 0) {
        const childResult = dfs(n.children, [...prevNodes, n]);
        if (childResult !== undefined) return childResult;
      }
    }
    return undefined
  }

  return dfs(tree);
};

const insertNode = (
  tree: Tree[],
  parentId: Tree["nodeId"],
  childNode: Tree
): Tree[] => {
  return tree.map(n => {
    if (n.nodeId === parentId) {
      return { ...n, children: [...n.children, cloneWithNewTreeIds(childNode)] };
    }
    if (n.children.length > 0) {
      return { ...n, children: insertNode(n.children, parentId, childNode) };
    }
    return n;
  });
};

const deleteNode = (
  tree: Tree[],
  nodeId: Tree["nodeId"]
): Tree[] => {
  return tree
    .filter(n => n.nodeId !== nodeId)
    .map(n => ({ ...n, children: deleteNode(n.children, nodeId) }));
};

const updateNode = (
  tree: Tree[],
  nodeId: Tree["nodeId"],
  updater: (node: Tree) => Tree
): Tree[] => {
  return tree.map(n => {
    if (n.nodeId === nodeId) {
      const updated = updater(n);
      return cloneWithNewTreeIds(updated);
    }
    if (n.children.length > 0) {
      return { ...n, children: updateNode(n.children, nodeId, updater) };
    }
    return n;
  });
};

const updateParents = (
  tree: Tree[],
  nodeId: Tree["nodeId"],
  newParentIds: Tree["nodeId"][]
): Tree[] => {
  let targetNode: Tree | undefined = undefined;
  traverseTree(tree, n => {
    if (n.nodeId === nodeId) {
      targetNode = n;
      return nodeId;
    }
  });
  if (!targetNode) return tree;

  let newTree = deleteNode(tree, nodeId);
  for (const id of newParentIds) {
    newTree = insertNode(newTree, id, targetNode);
  }

  return newTree;
};

const cloneWithNewTreeIds = (node: Tree): Tree => {
  return {
    ...node,
    treeId: crypto.randomUUID(),
    children: node.children.map(c => cloneWithNewTreeIds(c))
  };
};

export default {
  traverseTree,
  insertNode,
  deleteNode,
  updateNode,
  updateParents
};