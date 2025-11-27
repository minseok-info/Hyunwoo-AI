import { DataType } from "@/types/dataParms";

const traverseTree = <R = any>(
  data: DataType,
  callback: (node: DataType[number], path: string[]) => R | undefined
): R | undefined => {
  const dfs = (nodes: DataType, prevPath: string[] = []): R | undefined => {
    for (const n of nodes) {
      const result = callback(n, prevPath);
      if (result !== undefined) return result;

      if (n.type === "folder") {
        const childResult = dfs(n.children, [...prevPath, n.id]);
        if (childResult !== undefined) return childResult;
      }
    }
    return undefined
  }

  return dfs(data);
}

export default traverseTree;