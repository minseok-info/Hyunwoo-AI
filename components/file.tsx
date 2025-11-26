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

const File = ({ file }: { file: FileType }) => {
  const router = useRouter();
  
  const fileId = file.id;

  const [isSelected, setIsSelected] = useState<boolean>(false);

  useEffect(() => {
    const uuid = router.query["uuid"] || null;
    if (uuid === fileId) setIsSelected(true);
    else setIsSelected(false);
  }, [router.query]);

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