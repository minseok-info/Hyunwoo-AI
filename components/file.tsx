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
  const fileName = file.name.replace(/ /g, "");

  const [isSelected, setIsSelected] = useState<boolean>(false);

  useEffect(() => {
    const file = router.query["file"] || null;
    if (file === fileName) setIsSelected(true);
    else setIsSelected(false);
  }, [router.query]);

  const handleClick = () => {
    router.push(
      {
        pathname: router.pathname,
        query: { file: fileName }
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