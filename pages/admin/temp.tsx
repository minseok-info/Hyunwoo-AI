import { Settings } from "@/components";
import styles from "@/styles/temp.module.css";
import { DataType } from "@/types/dataParms";
import clsx from "clsx";

const Temp = () => {
  const data: DataType = [
    {
      type: "folder",
      name: "first",
      children: [
        {
          type: "folder",
          name: "temp",
          children: [
            {
              type: "file",
              name: "hidden",
              desc: "first tip"
            }
          ]
        },
        {
          type: "file",
          name: "sans",
          desc: "wa"
        },
        {
          type: "file",
          name: "chicks",
          desc: "cats"
        },
        {
          type: "file",
          name: "first file?",
          desc: "oops"
        }
      ]
    },
    {
      type: "folder",
      name: "second",
      children: [
        {
          type: "file",
          name: "oh yeah",
          desc: "real?"
        }
      ]
    },
    {
      type: "file",
      name: "third",
      desc: "party"
    }
  ];

  return (
    <div className={clsx("fullScreen flex", styles.board, styles.colorAttr)}>
      <Settings data={data} />
    </div>
  );
}

export default Temp;