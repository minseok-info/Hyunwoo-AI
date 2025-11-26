import styles from "@/styles/explorer.module.css";
import { DataType, FolderType } from "@/types/dataParms";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import File from "./file";
import { useRouter } from "next/router";

const arrowIcon = {
  src: require("@/public/icons/arrow.svg"),
  alt: "arrow"
}

const Folder = (props: { folder: FolderType, path: string[] }) => {
  const router = useRouter();

  const folderId = props.folder.id;

  const arrowIconRef = useRef<HTMLImageElement>(null);
  const doubleClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isActive, setIsActive] = useState<boolean>(false);
  const [isSelected, setIsSelected] = useState<boolean>(false);

  const handleClick = () => {
    if (doubleClickTimerRef.current) {
      clearTimeout(doubleClickTimerRef.current);
      doubleClickTimerRef.current = null;
      setIsActive(!isActive);
      return;
    }

    doubleClickTimerRef.current = setTimeout(() => {
      doubleClickTimerRef.current = null;
    }, 200);

    router.push(
      {
        pathname: router.pathname,
        query: { uuid: folderId }
      },
      undefined,
      { shallow: true }
    );
  }

  useEffect(() => {
    if (!arrowIconRef.current) return;

    if (isActive) arrowIconRef.current.style.setProperty("transform", "");
    else arrowIconRef.current.style.setProperty("transform", "rotate(-90deg)");
  }, [isActive]);

  useEffect(() => {
    const query = router.query["uuid"] || null;
    if (!query) return;

    const uuid = Array.isArray(query)
      ? query[0]
      : query

    if (uuid === folderId) setIsSelected(true);
    else setIsSelected(false);
  }, [router.query]);

  useEffect(() => {
    if (props.path.length < 1) return;
    else if (props.path.includes(folderId)) setIsActive(true);
  }, [props.path]);

  return (
    <div className={clsx(styles.folder)}>
      <div
        className={clsx("flex alignCenter pointer", styles.folderLine, { [styles.selectedFile]: isSelected })}
        onClick={handleClick}
      >
        <Image ref={arrowIconRef} className={clsx(styles.arrowIcon)} src={arrowIcon.src} alt={arrowIcon.alt} />
        <p>{ props.folder.name }</p>
      </div>
      {
        (isActive && props.folder.children) && (
          props.folder.children.map((child, idx) => {
            if (child.type === "folder") return <Folder folder={child} path={props.path} key={idx} />
            else if (child.type === "file") return <File file={child} key={idx} />
          })
        )
      }
    </div>
  );
}

export default Folder;