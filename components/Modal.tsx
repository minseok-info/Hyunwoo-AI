import styles from "@/styles/modal.module.css";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

const Modal = ({ data, trigger, duration }: { data: { message: string, status: boolean, loading?: boolean }, trigger: number, duration?: number }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!trigger) return

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setIsVisible(true);

    if (!data.loading) {
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, duration ?? 1500);
    }
  }, [trigger]);

  return (
    <div className={clsx(styles.modal, data.loading ? styles.loading : data.status ? styles.log : styles.error, { [styles.visible]: isVisible })}>
      {data.loading && <span className={styles.spinner} />}
      <p>{ data.message }</p>
    </div>
  );
};

export default Modal;