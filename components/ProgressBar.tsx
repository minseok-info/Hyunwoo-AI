import styles from "@/styles/progressBar.module.css";
import clsx from "clsx";
import { PointerEvent, useEffect, useRef } from "react";
import * as THREE from "three";

const ProgressBar = ({ progress, onChangeProgress }: { progress: number, onChangeProgress: (progress: number) => void }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const dragStateRef = useRef<{
    lastY: number;
    baseProgress: number
  } | null>(null);

  const isDraggingRef = useRef<boolean>(false);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    isDraggingRef.current = true;

    dragStateRef.current = {
      lastY: event.clientY,
      baseProgress: progress
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  const handlePointerMove = (event: globalThis.PointerEvent) => {
    if (!barRef.current || !dragStateRef.current) return;

    const rect = barRef.current.getBoundingClientRect();

    const deltaY = event.clientY - dragStateRef.current.lastY;
    dragStateRef.current.lastY = event.clientY;

    const deltaProgress = -deltaY / rect.height;

    dragStateRef.current.baseProgress = THREE.MathUtils.clamp(
      dragStateRef.current.baseProgress + deltaProgress,
      0,
      1
    );

    onChangeProgress(dragStateRef.current.baseProgress);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    window.removeEventListener("pointermove", handlePointerMove);
  };

  useEffect(() => {
    if (!thumbRef.current) return;

    const inverseProgress = 1 - progress;
    thumbRef.current.style.top = `${inverseProgress * 100}%`;
  }, [progress]);

  return (
    <div ref={barRef} className={clsx(styles.bar)} onPointerDown={handlePointerDown}>
      <div className={clsx(styles.track)} />
      <div ref={thumbRef} className={clsx(styles.thumb)} />
    </div>
  );
};

export default ProgressBar;