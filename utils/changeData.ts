import { DataType, FileType, FolderType } from "@/types/dataParms";

const changeData = (
  data: DataType,
  id: string,
  callback: ({ folder, file }: { folder: FolderType | null, file: FileType | null }) => any
): DataType => {
  return data.map(node => {
    if (node.id === id) {
      const folder = node.type === "folder" ? { ...(node as FolderType) } : null;
      const file = node.type === "file" ? { ...(node as FileType) } : null;
      return callback({ folder, file }) || node;
    }
    if (node.type === "folder") {
      return { ...node, children: changeData(node.children, id, callback) };
    }
    return node;
  });
}

export default changeData;