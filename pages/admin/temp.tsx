import { Settings } from "@/components";
import styles from "@/styles/temp.module.css";
import { DataType } from "@/types/dataParms";
import clsx from "clsx";

const Temp = () => {
  const data: DataType = [{
    type: "folder",
    name: "brain",
    children: [
      {
        type: "folder",
        name: "neuron1",
        children: [
          {
            type: "folder",
            name: "sans",
            children: [
              {
                type: "file",
                name: "sansing",
                desc: "holly molly"
              }
            ]
          },
          {
            type: "file",
            name: "tony moly",
            desc: "chicks"
          },
          {
            type: "file",
            name: "chikcs",
            desc: "yeah"
          }
        ]
      },
      {
        type: "folder",
        name: "neuron2",
        children: []
      },
      {
        type: "file",
        name: "neuron3",
        desc: "sans"
      },
      {
        type: "file",
        name: "oh yeah",
        desc: "temp"
      }
    ]
  }]

  return (
    <div className={clsx("fullScreen flex", styles.board, styles.colorAttr)}>
      <Settings data={data} />
    </div>
  );
}

export default Temp;