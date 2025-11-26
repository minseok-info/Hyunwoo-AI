import { DataType } from "@/types/dataParms";
import Folder from "./folder";
import File from "./file";

const Explorer = ({ data }: { data: DataType }) => {
  return data.map((d, idx) => {
    if (d.type === "folder") return <Folder folder={d} key={idx} />
    else return <File file={d} key={idx} />
  })
}

export default Explorer;