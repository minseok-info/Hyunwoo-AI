import styles from "@/styles/splashImage.module.css";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef } from "react";

const image = {
  src: require("@/public/favicon.ico"),
  alt: "favicon"
};

const SplashImage = ({ isMounted }: { isMounted: boolean }) => {
  const splashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMounted || !splashRef.current) return;
    splashRef.current.style.opacity = "1";

    setTimeout(() => {
      if (!splashRef.current) return;
      splashRef.current.style.opacity = "0";
    }, 1000);
    setTimeout(() => {
      if (!splashRef.current) return;
      splashRef.current.style.display = "none";
    }, 1000 + 500);
  }, [isMounted]);

  return (
    <div ref={splashRef} className={clsx(styles.splash)}>
      <Image className={clsx(styles.blurred)} src={image.src} alt={image.alt} />
      <Image className={clsx(styles.normal)} src={image.src} alt={image.alt} />
    </div>
  );
};

export default SplashImage;