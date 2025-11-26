export type FolderType = {
  type: "folder"
  name: string
  children: DataType
}

export type FileType = {
  type: "file"
  name: string
  desc: string
}

export type DataType = Array<FolderType | FileType>