import styles from "@/styles/search.module.css";
import { DataType } from "@/types/dataParms";
import clsx from "clsx";
import Explorer from "./explorer";
import { ChangeEvent, useEffect, useRef, useState } from "react";

const Search = ({ data }: { data: DataType }) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [tempword, setTempword] = useState<string>("");
  const [keyword, setkeyword] = useState<string | null>(null);

  const [result, setResult] = useState<DataType>([]);

  const searchByName = (objectList: DataType) => {
    if (!keyword) return [];

    const result: DataType = [];

    const dfs = (objects: DataType) => {
      for (const obj of objects) {
        if (obj.name.includes(keyword)) {
          result.push(obj);
        }

        if (obj.type === "file") {
          if (obj.desc.includes(keyword)) {
            result.push(obj);
          }
        }
        else if (obj.type === "folder") {
          dfs(obj.children);
        }
      }
    }

    dfs(objectList);
    return result;
  }

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
    const result = searchByName(data);
    setResult(result);
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