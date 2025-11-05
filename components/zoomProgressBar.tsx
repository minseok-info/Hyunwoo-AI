import styles from "@/styles/zoomProgressBar.module.css";
import { PointerEvent, useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  distance: number;
  minDistance: number;
  maxDistance: number;
  onZoomUpdate: (value: number) => void;
}

const zoomProgressBar = ({
  distance,
  minDistance,
  maxDistance,
  onZoomUpdate,
}: Props) => {
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    handlePointerMove(event.nativeEvent);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  const handlePointerMove = (event: globalThis.PointerEvent) => {
    if (!barRef.current || !progressRef.current) return;

    const barRect = barRef.current.getBoundingClientRect();
    const barTop = barRect.top;
    const barHeight = barRect.height;

    const movedY = event.clientY;
    const limitY = Math.min(Math.max(movedY, barTop), (barTop + barHeight));

    const progress = THREE.MathUtils.clamp(((limitY - barTop + 0.1) / barHeight), 0, 1);
    progressRef.current.style.setProperty("top", `${progress * 100}%`);
    
    const distance = maxDistance * progress;
    const limitDistacne = Math.max(distance, minDistance);
    onZoomUpdate(limitDistacne);
  }

  const handlePointerUp = () => {
    window.removeEventListener("pointermove", handlePointerMove);
  }

  useEffect(() => {
    if (!progressRef.current) return;

    const progress = THREE.MathUtils.clamp(((distance - minDistance) / (maxDistance - minDistance)), 0, 1);
    progressRef.current.style.setProperty("top", `${progress * 100}%`);
  }, [distance]);

  useEffect(() => {
    return () => {
      handlePointerUp;
    }
  }, []);

  return (
    <div
      ref={barRef}
      className={`flex justifyCenter ${styles.bar}`}
      onPointerDown={handlePointerDown}
    >
      <hr />
      <div ref={progressRef} />
    </div>
  );
}

export default zoomProgressBar;