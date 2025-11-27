import styles from "@/styles/search.module.css";
import { DataType } from "@/types/dataParms";
import clsx from "clsx";
import Explorer from "./explorer";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { traverseTree } from "@/utils";

const Search = ({ data }: { data: DataType }) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [tempword, setTempword] = useState<string>("");
  const [keyword, setkeyword] = useState<string | null>(null);

  const [result, setResult] = useState<DataType>([]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTempword(value);
  }

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      setkeyword(tempword);
    }, 500);
  }, [tempword]);

  useEffect(() => {
    const filteredNodes: DataType = [];
    traverseTree(data, node => {
      if (!keyword) return;
      
      if (node.name.includes(keyword)) filteredNodes.push(node);
      else if (node.type === "file" && node.desc.includes(keyword)) filteredNodes.push(node);
    });
    setResult(filteredNodes);
  }, [keyword]);

  return (
    <>
      <div className={clsx("flex justifyCenter", styles.searchBox)}>
        <input type="text" placeholder="Search" value={tempword} onChange={(event: ChangeEvent<HTMLInputElement>) => handleChange(event)} />
      </div>
      {
        result.length > 0 && <Explorer data={result} />
      }
    </>
  )
}

export default Search;