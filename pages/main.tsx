import styles from "@/styles/main.module.css";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const Main = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const isZoomingRef = useRef<boolean>(false);
  const pointerData = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const touchData = useRef<{ prevDistance: number | null }>({ prevDistance: null });

  const CAMERA_CONSTANTS = {
    fov: 75,
    minFov: 5,
    maxFov: 100,
    rotateSpeed: 0.0075,
    zoomSpeed: 0.075,
    startZoom: 25,
    minZoom: 0.1,
    maxZoom: 1000
  }

  const cameraFov = useRef<number>(CAMERA_CONSTANTS.fov);
  const cameraZoom = useRef<number>(CAMERA_CONSTANTS.startZoom);
  const cameraRotation = useRef<{ theta: number; phi: number }>({ theta: 0, phi: 0 });

  const MOBILE_CONSTANTS = {
    zoomSpeed: 0.1
  }
 
  const handleWheel = (event: WheelEvent) => {
    if (!cameraRef.current) return;
    event.preventDefault();

    const fovDelta = event.deltaY * 0.05;
    cameraFov.current = THREE.MathUtils.clamp(
      cameraRef.current.fov + fovDelta,
      CAMERA_CONSTANTS.minFov,
      CAMERA_CONSTANTS.maxFov
    );
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (isZoomingRef.current) return;
    event.preventDefault();

    pointerData.current = { x: event.clientX, y: event.clientY };
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (isZoomingRef.current) return;
    else if (pointerData.current.x === null || pointerData.current.y === null) return;
    event.preventDefault();

    const dx = event.clientX - pointerData.current.x;
    const dy = event.clientY - pointerData.current.y;

    cameraRotation.current.theta -= dx * CAMERA_CONSTANTS.rotateSpeed;
    cameraRotation.current.phi += dy * CAMERA_CONSTANTS.rotateSpeed;
    cameraRotation.current.phi = THREE.MathUtils.clamp(
      cameraRotation.current.phi,
      -Math.PI / 2 + 0.01,
      Math.PI / 2 - 0.01
    );

    pointerData.current = { x: event.clientX, y: event.clientY };
  }

  const handlePointerUp = () => {
    pointerData.current = { x: null, y: null };
  }

  const handleTouchStart = (event: TouchEvent) => {
    event.preventDefault();

    const touches = event.touches;
    if (touches.length === 2) {
      isZoomingRef.current = true;

      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      touchData.current.prevDistance = Math.hypot(dx, dy);
    }
  }

  const handleTouchMove = (event: TouchEvent) => {
    event.preventDefault();

    const touches = event.touches;
    if (event.touches.length === 2 && touchData.current.prevDistance) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[0].clientY;
      const distance = Math.hypot(dx, dy);
      const delta = touchData.current.prevDistance - distance;

      cameraFov.current = THREE.MathUtils.clamp(
        cameraFov.current + delta * MOBILE_CONSTANTS.zoomSpeed,
        CAMERA_CONSTANTS.minFov,
        CAMERA_CONSTANTS.maxFov
      );

      touchData.current.prevDistance = distance;
    }
  }

  const handleTouchEnd = (event: TouchEvent) => {
    const touches = event.touches;
    if (touches.length < 2) {
      isZoomingRef.current = false;
      touchData.current.prevDistance = null;
    }
  }

  const animate = () => {
    requestAnimationFrame(animate);

    if (cameraRef.current) {
      const camera = cameraRef.current;

      camera.fov = THREE.MathUtils.lerp(
        camera.fov,
        cameraFov.current,
        CAMERA_CONSTANTS.zoomSpeed
      );
      cameraRef.current.updateProjectionMatrix();

      const radius = cameraZoom.current;
      const { theta, phi } = cameraRotation.current;
      camera.position.x = radius * Math.sin(theta) * Math.cos(phi);
      camera.position.y = radius * Math.sin(phi);
      camera.position.z = radius * Math.cos(theta) * Math.cos(phi);
      camera.lookAt(0, 0, 0);
    }

    if (rendererRef.current && sceneRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current!);
    }
  }

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(
      CAMERA_CONSTANTS.fov,
      width / height,
      CAMERA_CONSTANTS.minZoom,
      CAMERA_CONSTANTS.maxZoom
    );
    camera.position.z = CAMERA_CONSTANTS.startZoom;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    mountRef.current.addEventListener("wheel", handleWheel, { passive: false });
    mountRef.current.addEventListener("pointerdown", handlePointerDown, { passive: false });
    mountRef.current.addEventListener("pointermove", handlePointerMove, { passive: false });
    mountRef.current.addEventListener("pointerup", handlePointerUp);
    mountRef.current.addEventListener("touchstart", handleTouchStart, { passive: false });
    mountRef.current.addEventListener("touchmove", handleTouchMove, { passive: false });
    mountRef.current.addEventListener("touchend", handleTouchEnd);

    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener("resize", handleResize);

    const qwe = new THREE.BoxGeometry(1, 1, 1);
    const asd = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const zxc = new THREE.Mesh(qwe, asd);
    zxc.lookAt(camera.position);
    scene.add(zxc);
    
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current) {
        mountRef.current.removeEventListener("wheel", handleWheel);
        mountRef.current.removeEventListener("pointerdown", handlePointerDown);
        mountRef.current.removeEventListener("pointermove", handlePointerMove);
        mountRef.current.removeEventListener("pointerup", handlePointerUp);
        mountRef.current.removeEventListener("touchstart", handleTouchStart);
        mountRef.current.removeEventListener("touchmove", handleTouchMove);
        mountRef.current.removeEventListener("touchend", handleTouchEnd);
      }
      if (rendererRef.current && mountRef.current?.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    }
  }, []);

  return (
    <div ref={mountRef} className={clsx(styles.fullScreen)} />
  );
}

export default Main;