import styles from "@/styles/explorer.module.css";
import { FolderType } from "@/types/dataParms";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import File from "./file";
import { useRouter } from "next/router";
import checkDoubleClick from "@/utils/checkDoubleClick";

const arrowIcon = {
  src: require("@/public/icons/arrow.svg"),
  alt: "arrow"
}

const Folder = (props: { folder: FolderType, path: string[], uuid: string }) => {
  const router = useRouter();

  const folder = props.folder;
  const folderId = folder.id;

  const arrowIconRef = useRef<HTMLImageElement>(null);

  const uuidRef = useRef<string | null>(null);
  const doubleClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isActive, setIsActive] = useState<boolean>(false);
  const [isSelected, setIsSelected] = useState<boolean>(false);

  const handleClick = () => {
    const isDoubleClick = checkDoubleClick(doubleClickTimerRef);
    if (isDoubleClick) {
      setIsActive(!isActive);
      return;
    }

    if (folderId !== uuidRef.current) {
      router.push(
        {
          pathname: router.pathname,
          query: { uuid: folderId }
        },
        undefined,
        { shallow: true }
      );
    }
  }

  useEffect(() => {
    if (!arrowIconRef.current) return;

    if (isActive) arrowIconRef.current.style.setProperty("transform", "");
    else arrowIconRef.current.style.setProperty("transform", "rotate(-90deg)");
  }, [isActive]);

  useEffect(() => {
    if (!props.uuid) {
      setIsSelected(false);
      return;
    }
    const uuid = props.uuid;

    if (uuid === folderId) setIsSelected(true);
    else setIsSelected(false);

    if (props.path.includes(folderId)) setIsActive(true);
  }, [props]);

  return (
    <div className={clsx(styles.folder)}>
      <div
        className={clsx("flex alignCenter pointer", styles.folderLine, { [styles.selectedFile]: isSelected })}
        onClick={handleClick}
      >
        <Image ref={arrowIconRef} className={clsx(styles.arrowIcon)} src={arrowIcon.src} alt={arrowIcon.alt} />
        <p>{ folder.name }</p>
      </div>
      {
        (isActive && folder.children) && (
          folder.children.map((child, idx) => {
            if (child.type === "folder") return <Folder folder={child} path={props.path} uuid={props.uuid} key={idx} />
            else if (child.type === "file") return <File file={child} uuid={props.uuid} key={idx} />
          })
        )
      }
    </div>
  );
}

export default Folder;