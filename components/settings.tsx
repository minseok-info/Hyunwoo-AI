import styles from "@/styles/settings.module.css";
import { DataType } from "@/types/dataParms";
import { useState } from "react";
import clsx from "clsx";
import Explorer from "./explorer";
import Search from "./search";
import Image from "next/image";

const explorerIcon = {
  src: require("@/public/icons/file.svg"),
  alt: "explorer"
}

const searchIcon = {
  src: require("@/public/icons/search.svg"),
  alt: "search"
}

const Settings = ({ data }: { data: DataType }) => {
  type SettingTypes = "explorer" | "search";

  const [setting, setSetting] = useState<SettingTypes>("explorer");
  const settings: Record<SettingTypes, React.ReactNode> = {
    explorer: <Explorer data={data} />,
    search: <Search data={data} />
  }

  return (
    <>
      <div className={clsx("alignCenter", styles.settingList)}>
        <div className={clsx({ [styles.selected]: setting === "explorer" })} onClick={() => setSetting("explorer")}>
          <Image src={explorerIcon.src} alt={explorerIcon.alt} />
        </div>
        <div className={clsx({ [styles.selected]: setting === "search" })} onClick={() => setSetting("search")}>
          <Image src={searchIcon.src} alt={searchIcon.alt} />
        </div>
      </div>
      <div className={clsx(styles.setting)}>
        <div>
          <h4>{ setting.toUpperCase() }</h4>
        </div>
        { settings[setting] }
      </div>
    </>
  )
}

export default Settings;