import { loadBrainModel, loadHumanModel, loadSpaceModel } from "@/public/three/loaders";
import styles from "@/styles/main.module.css";
import { ModelType } from "@/types/modelParams";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

const Main = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const spaceModelRef = useRef<ModelType>(null);
  const humanModelRef = useRef<ModelType>(null);
  const brainModelRef = useRef<ModelType>(null);

  const isZoomingRef = useRef<boolean>(false);
  const pointerData = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const touchData = useRef<{ prevDistance: number | null }>({ prevDistance: null });

  const CAMERA_CONSTANTS = {
    fov: 75,
    minFov: 5,
    maxFov: 100,
    rotateSpeed: 0.005,
    zoomSpeed: 0.075,
    startZoom: 500,
    minZoom: 0.1,
    maxZoom: 1000,
  }

  const cameraFov = useRef<number>(CAMERA_CONSTANTS.fov);
  const cameraZoom = useRef<number>(CAMERA_CONSTANTS.startZoom);
  const cameraRotation = useRef<{
    current: { theta: number; phi: number };
    target: { theta: number; phi: number }
  }>({
    current: { theta: 0, phi: 0 },
    target: { theta: 0, phi: 0 }
  });

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

    const dx = (event.clientX - pointerData.current.x) * window.devicePixelRatio;
    const dy = (event.clientY - pointerData.current.y) * window.devicePixelRatio;

    cameraRotation.current.target.theta -= dx * CAMERA_CONSTANTS.rotateSpeed;
    cameraRotation.current.target.phi += dy * CAMERA_CONSTANTS.rotateSpeed;
    cameraRotation.current.target.phi = THREE.MathUtils.clamp(
      cameraRotation.current.target.phi,
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
      const dy = touches[0].clientY - touches[1].clientY;
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambientLight);
    
    const loadModels = async () => {
      try {
        const loader = new GLTFLoader();
        const [spaceModel, humanModel, brainModel] = await Promise.all([
          loadSpaceModel({ loader: loader, scene: scene, distance: CAMERA_CONSTANTS.startZoom }),
          loadHumanModel({ loader: loader, scene: scene, distance: CAMERA_CONSTANTS.startZoom }),
          loadBrainModel({ loader: loader, scene: scene, distance: CAMERA_CONSTANTS.startZoom })
        ]);
  
        spaceModelRef.current = spaceModel;
        humanModelRef.current = humanModel;
        brainModelRef.current = brainModel;

        const boundingBox = new THREE.Box3().setFromObject(spaceModel!);
        const sizeVector = new THREE.Vector3();
        boundingBox.getSize(sizeVector);

        const maxSize = Math.max(sizeVector.x, sizeVector.y, sizeVector.z);
        camera.far = maxSize;
        camera.updateProjectionMatrix();
      }
      catch (error) {
        console.error(error);
      }
    }
    loadModels();

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
    
    const animate = () => {
      requestAnimationFrame(animate);

      camera.fov = THREE.MathUtils.lerp(
        camera.fov,
        cameraFov.current,
        CAMERA_CONSTANTS.zoomSpeed
      );
      camera.updateProjectionMatrix();

      const dampingFactor = CAMERA_CONSTANTS.rotateSpeed * 10;
      cameraRotation.current.current.theta = THREE.MathUtils.lerp(
        cameraRotation.current.current.theta,
        cameraRotation.current.target.theta,
        dampingFactor
      );
      cameraRotation.current.current.phi = THREE.MathUtils.lerp(
        cameraRotation.current.current.phi,
        cameraRotation.current.target.phi,
        dampingFactor
      );
      
      const radius = cameraZoom.current;
      const { theta, phi } = cameraRotation.current.current;
      camera.position.x = radius * Math.sin(theta) * Math.cos(phi);
      camera.position.y = radius * Math.sin(phi);
      camera.position.z = radius * Math.cos(theta) * Math.cos(phi);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
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