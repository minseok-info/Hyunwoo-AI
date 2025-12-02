import styles from "@/styles/explorer.module.css";
import { FileType } from "@/types/dataParms";
import clsx from "clsx";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const textIcon = {
  src: require("@/public/icons/text.svg"),
  alt: "text"
}

const File = (props: { file: FileType, uuid: string }) => {
  const router = useRouter();
  
  const file = props.file;
  const fileId = file.id;

  const [isSelected, setIsSelected] = useState<boolean>(false);

  useEffect(() => {
    if (!props.uuid) {
      setIsSelected(false);
      return;
    }
    const uuid = props.uuid;
    
    if (fileId === uuid) setIsSelected(true);
    else setIsSelected(false);
  }, [props.uuid]);

  const handleClick = () => {
    router.push(
      {
        pathname: router.pathname,
        query: { uuid: fileId }
      },
      undefined,
      { shallow: true }
    );
  }

  return (
    <div
      className={clsx("pointer flex alignCenter", styles.fileLine, { [styles.selectedFile]: isSelected })}
      onClick={handleClick}
    >
      <Image className={clsx(styles.textIcon)} src={textIcon.src} alt={textIcon.alt} />
      <p>{ file.name }</p>
    </div>
  );
}

export default File;