import { Tree } from "@/types/ontologyTypes";

const traverseTree = <R = any>(
  tree: Tree[],
  callback: (node: Tree, path: string[]) => R | undefined
): R | undefined => {
  const dfs = (nodes: Tree[], prevPath: string[] = []): R | undefined => {
    for (const n of nodes) {
      const nodeResult = callback((n as Tree), prevPath);
      if (nodeResult !== undefined) return nodeResult;

      if (n.children.length > 0) {
        const childResult = dfs(n.children, [...prevPath, n.treeId]);
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
      return { ...n, children: [...n.children, childNode] };
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
      return updater(n);
    }
    if (n.children.length > 0) {
      return { ...n, children: updateNode(n.children, nodeId, updater) };
    }
    return n;
  });
};

export default {
  traverseTree,
  insertNode,
  deleteNode,
  updateNode
};