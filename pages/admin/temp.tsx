import { Settings } from "@/components";
import Plate from "@/components/plate";
import styles from "@/styles/temp.module.css";
import { DataType } from "@/types/dataParms";
import clsx from "clsx";
import { useEffect, useState } from "react";

const Temp = () => {
  const [data, setData] = useState<DataType>([]);

  useEffect(() => {
    setData([{
      id: "f1",
      type: "folder",
      name: "brain",
      children: [
        {
          id: "f2",
          type: "folder",
          name: "neuron1",
          children: [
            {
              id: "f3",
              type: "folder",
              name: "sans",
              children: [
                {
                  id: "f4",
                  type: "file",
                  name: "sansing",
                  desc: "holly molly"
                }
              ]
            },
            {
              id: "f5",
              type: "file",
              name: "tony moly",
              desc: "chicks"
            },
            {
              id: "f6",
              type: "file",
              name: "chicks",
              desc: "yeah"
            }
          ]
        },
        {
          id: "f7",
          type: "folder",
          name: "neuron2",
          children: []
        },
        {
          id: "f8",
          type: "file",
          name: "neuron3",
          desc: "sans"
        },
        {
          id: "f9",
          type: "file",
          name: "oh yeah",
          desc: "temp"
        },
        {
          id: "f10",
          type: "file",
          name: "chicks",
          desc: "oops"
        },
        {
          id: "f11",
          type: "file",
          name: "neuron2",
          desc: "file?"
        }
      ]
    }]);
  }, []);

  return (
    <div className={clsx("fullScreen flex", styles.board, styles.colorAttr)}>
      <Settings data={data} />
      <Plate data={data} />
    </div>
  );
}

export default Temp;