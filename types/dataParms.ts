export type FolderType = {
  id: string
  type: "folder"
  name: string
  children: DataType
}

export type FileType = {
  id: string
  type: "file"
  name: string
  desc: string
}

export type DataType = Array<FolderType | FileType>