import styles from "@/styles/plate.module.css";
import clsx from "clsx";

const Plate = () => {
  return (
    <div className={clsx(styles.plate)}>
      <div className={clsx(styles.canvas)}>
      </div>
    </div>
  );
}

export default Plate;