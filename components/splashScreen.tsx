import styles from "@/styles/splashScrren.module.css";
import Image from "next/image";
import { useEffect, useRef } from "react";

const icon = {
  src: require("@/public/favicon.ico"),
  alt: "icon",
}

const splashScreen = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      if (!containerRef.current) return;
      containerRef.current.style.setProperty("opacity", "0");
    }, 1000);
    setTimeout(() => {
      if (!containerRef.current) return;
      containerRef.current.style.setProperty("display", "none");
    }, 1000 + 500);
  }, []);

  return (
    <div ref={containerRef} className={`flex justifyCenter alignCenter ${styles.container}`}>
      <Image src={icon.src} alt={icon.alt} priority />
    </div>
  );
}

export default splashScreen;