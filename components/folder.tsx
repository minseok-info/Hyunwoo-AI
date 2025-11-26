import styles from "@/styles/explorer.module.css";
import { FolderType } from "@/types/dataParms";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import File from "./file";
import { useRouter } from "next/router";

const arrowIcon = {
  src: require("@/public/icons/arrow.svg"),
  alt: "arrow"
}

const Folder = ({ folder }: { folder: FolderType }) => {
  const router = useRouter();

  const fileName = folder.name.replace(/ /g, "");

  const arrowIconRef = useRef<HTMLImageElement>(null);
  const doubleClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isActivate, setIsActivate] = useState<boolean>(false);
  const [isSelected, setIsSelected] = useState<boolean>(false);

  const handleClick = () => {
    if (doubleClickTimerRef.current) {
      clearTimeout(doubleClickTimerRef.current);
      doubleClickTimerRef.current = null;
      setIsActivate(!isActivate);
      return;
    }

    doubleClickTimerRef.current = setTimeout(() => {
      doubleClickTimerRef.current = null;
    }, 200);

    router.push(
      {
        pathname: router.pathname,
        query: { file: fileName }
      },
      undefined,
      { shallow: true }
    );
  }

  useEffect(() => {
    if (!arrowIconRef.current) return;

    if (isActivate) arrowIconRef.current.style.setProperty("transform", "");
    else arrowIconRef.current.style.setProperty("transform", "rotate(-90deg)");
  }, [isActivate]);

  useEffect(() => {
    const file = router.query["file"] || null;
    if (file === fileName) setIsSelected(true);
    else setIsSelected(false);
  }, [router.query]);

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
        (isActivate && folder.children) && (
          folder.children.map((child, idx) => {
            if (child.type === "folder") return <Folder folder={child} key={idx} />
            else if (child.type === "file") return <File file={child} key={idx} />
          })
        )
      }
    </div>
  );
}

export default Folder;