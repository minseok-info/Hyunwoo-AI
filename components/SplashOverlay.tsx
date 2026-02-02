import styles from "@/styles/splashOverlay.module.css";
import clsx from "clsx";
import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";

const image = {
  src: require("@/public/favicon.ico"),
  alt: "favicon"
};

const SplashOverlay = ({ show }: { show: boolean }) => {
  const splashRef = useRef<HTMLDivElement>(null);

  const tempTextP = useRef<HTMLParagraphElement>(null);
  const [toggledTempFont, settoggledTempFont] = useState<boolean>(false);
  const [tempAreaValue, setTempAreaValue] = useState<string>("");
  const fontStyleRef = useRef<HTMLStyleElement | null>(null);

  const handleToggleTempFont = () => {
    settoggledTempFont(!toggledTempFont);
  };

  const handleInputFont = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (!fontStyleRef.current || !tempTextP.current) return;

    const value = event.target.value;
    setTempAreaValue(value);

    fontStyleRef.current.innerHTML = `
      ${value}
    `;

    const rows = value.split("\n");
    let fontFamily = "";
    for (const r of rows) {
      if (r.includes("font-family:")) {
        fontFamily = r.split(/'/)[1];
        break;
      }
    }

    tempTextP.current.style.fontFamily = fontFamily;
  };

  useEffect(() => {
    const style = document.createElement("style");
    document.head.appendChild(style);
    fontStyleRef.current = style;

    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
      <div className={clsx(styles.text)} onClick={handleToggleTempFont}>
        <p ref={tempTextP}>2002.06.02</p>
      </div>
      <div className={clsx(styles.tempFont, { [styles.toggledTempFont]: toggledTempFont })}>
        <textarea value={tempAreaValue} onChange={handleInputFont} />
      </div>
    </div>
  );
};

export default SplashOverlay;