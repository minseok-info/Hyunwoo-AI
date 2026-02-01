import styles from "@/styles/splashOverlay.module.css";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef } from "react";

const image = {
  src: require("@/public/favicon.ico"),
  alt: "favicon"
};

const SplashOverlay = ({ show }: { show: boolean }) => {
  const splashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    
    let duration = 0;

    duration += 750;
    setTimeout(() => {
      if (!splashRef.current) return;
      splashRef.current.style.opacity = "0";
    }, duration);

    duration += 500;
    setTimeout(() => {
      if (!splashRef.current) return;
      splashRef.current.style.display = "none";
    }, duration);
  }, [show]);

  return (
    <div ref={splashRef} className={clsx(styles.splash)}>
      <div className={clsx(styles.image)}>
        <Image className={clsx(styles.blurred)} src={image.src} alt={image.alt} />
        <Image className={clsx(styles.normal)} src={image.src} alt={image.alt} />
      </div>
      <div className={clsx(styles.text)}>
        <p>2002.06.02</p>
      </div>
    </div>
  );
};

export default SplashOverlay;