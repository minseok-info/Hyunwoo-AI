import styles from "@/styles/options.module.css";
import { DataType } from "@/types/dataParms";
import { useState } from "react";
import clsx from "clsx";
import Explorer from "./explorer";
import Search from "./search";
import Image from "next/image";
import { useRouter } from "next/router";

const explorerIcon = {
  src: require("@/public/icons/file.svg"),
  alt: "explorer"
}

const searchIcon = {
  src: require("@/public/icons/search.svg"),
  alt: "search"
}

const exitIcon = {
  src: require("@/public/icons/door.svg"),
  alt: "exit"
}

const Options = ({ data }: { data: DataType }) => {
  type OptionTypes = "explorer" | "search";

  const router = useRouter();

  const [option, setOption] = useState<OptionTypes>("explorer");
  const options: Record<OptionTypes, React.ReactNode> = {
    explorer: <Explorer data={data} />,
    search: <Search data={data} />
  }

  return (
    <>
      <div className={clsx("alignCenter", styles.category)}>
        <div className={clsx({ [styles.selected]: option === "explorer" })} onClick={() => setOption("explorer")}>
          <Image src={explorerIcon.src} alt={explorerIcon.alt} />
        </div>
        <div className={clsx({ [styles.selected]: option === "search" })} onClick={() => setOption("search")}>
          <Image src={searchIcon.src} alt={searchIcon.alt} />
        </div>
        <div onClick={() => router.push("/")}>
          <Image src={exitIcon.src} alt={exitIcon.alt} />
        </div>
      </div>
      <div className={clsx(styles.option)}>
        <div>
          <h4>{ option.toUpperCase() }</h4>
        </div>
        { options[option] }
      </div>
    </>
  )
}

export default Options;