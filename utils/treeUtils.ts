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
    return undefined;
  };

  return dfs(tree);
};

const sortTree = (
  tree: Tree[]
): Tree[] => {
  if (tree.length === 0) return tree;

  const compareNodes = (a: Tree, b: Tree) => {
    const aHasChildren = a.children && a.children.length > 0;
    const bHasChildren = b.children && b.children.length > 0;

    if (aHasChildren !== bHasChildren) {
      return aHasChildren ? -1 : 1;
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  };

  const dfs = (node: Tree): Tree => {
    if (!node.children || node.children.length === 0) {
      return { ...node };
    }

    const sortedChildren = node.children
      .map(dfs)
      .slice()
      .sort(compareNodes);

    return {
      ...node,
      children: sortedChildren
    };
  };

  return [dfs(tree[0])];
};

const getNode = (
  tree: Tree[],
  targetNodeId: Tree["nodeId"]
): Tree | undefined => {
  const targetNode = traverseTree(tree, n => {
    if (n.nodeId === targetNodeId) return n;
  });
  return targetNode;
};

const getNodeWithTag = (
  tree: Tree[],
  targetTag: Tree["tags"][number]
): Tree[] | undefined => {
  const targetNodes: Tree[] = [];
  const visitedNodes = new Set<Tree["nodeId"]>();

  traverseTree(tree, n => {
    if (visitedNodes.has(n.nodeId)) return;
    if (n.tags.includes(targetTag)) targetNodes.push(n);

    visitedNodes.add(n.nodeId);
  });

  return targetNodes;
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
  let node: Tree | null = null;
  let isExist = false;
  traverseTree(tree, n => {
    if (n.nodeId === nodeId) {
      node = n;
      isExist = true;
      return nodeId;
    }
  });
  if (!node) return tree;

  let newTree: Tree[] = tree;
  if (isExist) newTree = deleteNode(tree, nodeId);
  for (const id of newParentIds) {
    newTree = insertNode(newTree, id, node);
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
  sortTree,
  getNode,
  getNodeWithTag,
  insertNode,
  deleteNode,
  updateNode,
  updateParents
};