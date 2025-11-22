import { loadBrainModel, loadHumanModel, loadSpaceModel } from "@/public/three/loaders";
import styles from "@/styles/main.module.css";
import { ModelNames, ModelTransformParams, ModelType, SectionConfigParams, SectionNames, SectionType } from "@/types/modelParams";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

const Main = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const modelsRef = useRef<Record<ModelNames, ModelType>>({
    space: null,
    human: null,
    brain: null
  });
  const modelsTransformAttr: Record<ModelNames, ModelTransformParams> = {
    space: {
      posYRatio: 1,
      posZRatio: 1,
      visualSizeRatio: 1
    },
    human: {
      posYRatio: 1.925,
      posZRatio: 7.5,
      visualSizeRatio: 0.85
    },
    brain: {
      posYRatio: 2,
      posZRatio: 1,
      visualSizeRatio: 1
    }
  }

  const isZoomingRef = useRef<boolean>(false);
  const pointerData = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const touchData = useRef<{ prevDistance: number | null }>({ prevDistance: null });

  const CAMERA_CONSTANTS = {
    fov: 75,
    rotateSpeed: 0.005,
    zoomSpeed: 0.15,
    startZoom: 500,
    minZoom: 0.1,
    maxZoom: 1000,
  }

  const MOBILE_CONSTANTS = {
    zoomSpeed: 1
  }

  const sectionsRef = useRef<Partial<Record<SectionNames, SectionType>>>({});
  const sectionsConfig: SectionConfigParams = {
    human: {
      minDistance: 10,
      maxDistance: CAMERA_CONSTANTS.maxZoom,
      prev: null,
      next: "brain"
    },
    brain: {
      minDistance: 10,
      maxDistance: 750,
      prev: "human",
      next: null
    },
    temp: {
      minDistance: 0,
      maxDistance: 0,
      prev: null,
      next: null
    }
  }

  const prevDistanceRef = useRef<number>(0);
  const currentSectionRef = useRef<SectionNames>("human");

  const cameraZoom = useRef<{
    current: number;
    target: number
  }>({
    current: CAMERA_CONSTANTS.startZoom,
    target: CAMERA_CONSTANTS.startZoom
  });

  const cameraRotation = useRef<{
    current: { theta: number; phi: number }
    target: { theta: number; phi: number }
  }>({
    current: { theta: 0, phi: 0 },
    target: { theta: 0, phi: 0 }
  });

  const tempBox = new THREE.Box3();
  const tempVec = new THREE.Vector3();

  const updateSections = () => {
    const sectionName = currentSectionRef.current;
    if (!cameraRef.current || !sectionsRef.current[sectionName]) return;

    const camera = cameraRef.current;

    const section = sectionsRef.current[sectionName];
    const isModel = section instanceof THREE.Group;

    const attr = isModel
      ? modelsTransformAttr[sectionName as ModelNames]
      : null;
    const config = sectionsConfig[sectionName];

    tempBox.setFromObject(section);
    const closestPoint = tempBox.clampPoint(camera.position, tempVec);
    const adjustedPoint = attr
      ? closestPoint.clone().multiplyScalar(attr.visualSizeRatio)
      : closestPoint;

    const modelDistance = camera.position.distanceTo(adjustedPoint);
    const currentDistance = cameraZoom.current.current;

    if (modelDistance < config.minDistance) {
      if (!config.next) return;
      const nextConfig = sectionsConfig[config.next];
      console.log("next");

      const zoomScaleFactor = nextConfig.maxDistance / currentDistance;
      const currentScale = section.scale.x;
      const adjustedScale = zoomScaleFactor * currentScale;
      section.scale.setScalar(adjustedScale);

      tempBox.setFromObject(section);
      tempBox.getCenter(tempVec);

      const position = tempVec.clone().sub(section.position);
      position.y *= attr?.posYRatio ?? 1;
      position.z *= attr?.posZRatio ?? 1;
      
      const { x, y, z } = position;
      section.position.set(x, -y, z);

      const nextSection = sectionsRef.current[config.next];
      if (nextSection) {
        nextSection.visible = true;
        currentSectionRef.current = config.next;
      }

      prevDistanceRef.current = currentDistance;

      const remainDistance = currentDistance - cameraZoom.current.target;
      cameraZoom.current.current = nextConfig.maxDistance;
      cameraZoom.current.target = nextConfig.maxDistance - remainDistance;
    }
    else if (currentDistance > config.maxDistance) {
      if (!config.prev) return;
      const prevSection = sectionsRef.current[config.prev]!;
      const prevIsModel = prevSection instanceof THREE.Group;
      const prevAttr = prevIsModel
        ? modelsTransformAttr[config.prev as ModelNames]
        : null;
      const prevDistance = prevDistanceRef.current;
      console.log("prev");

      const zoomScaleFactor = prevDistance / currentDistance;
      const currentScale = prevSection.scale.x;
      const adjustedScale = zoomScaleFactor * currentScale;
      prevSection.scale.setScalar(adjustedScale);

      tempBox.setFromObject(prevSection);
      tempBox.getCenter(tempVec);

      const position = tempVec.clone().sub(prevSection.position);
      position.y *= prevAttr?.posYRatio ?? 1;
      position.z *= prevAttr?.posZRatio ?? 1;

      const { x, y, z } = position;
      prevSection.position.set(x, -y , z);

      section.visible = false;
      currentSectionRef.current = config.prev;

      const remainDistance = currentDistance - cameraZoom.current.target;
      cameraZoom.current.current = prevDistance;
      cameraZoom.current.target = prevDistance - remainDistance;
    }
  }

  const handleWheel = (event: WheelEvent) => {
    if (!cameraRef.current) return;
    event.preventDefault();

    const factor = cameraZoom.current.current / CAMERA_CONSTANTS.startZoom;
    const delta = event.deltaY;
    const normalizedDelta = delta * factor * CAMERA_CONSTANTS.zoomSpeed;

    cameraZoom.current.target = THREE.MathUtils.clamp(
      cameraZoom.current.target + normalizedDelta,
      CAMERA_CONSTANTS.minZoom,
      CAMERA_CONSTANTS.maxZoom
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

      const factor = cameraZoom.current.current / CAMERA_CONSTANTS.startZoom;
      const delta = (touchData.current.prevDistance - distance);
      const normalizedDelta = delta * factor * MOBILE_CONSTANTS.zoomSpeed;

      cameraZoom.current.target = THREE.MathUtils.clamp(
        cameraZoom.current.target + normalizedDelta,
        CAMERA_CONSTANTS.minZoom,
        CAMERA_CONSTANTS.maxZoom
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
    let isMounted = true;

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
  
        modelsRef.current = {
          space: spaceModel,
          human: humanModel,
          brain: brainModel
        };

        sectionsRef.current = {
          human: humanModel,
          brain: brainModel
        };

        const boundingBox = tempBox.setFromObject(spaceModel!);
        boundingBox.getSize(tempVec);

        const maxSize = Math.max(tempVec.x, tempVec.y, tempVec.z);
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
      if (!isMounted) return;
      requestAnimationFrame(animate);
      updateSections();
      
      const zoomDampingFactor = 0.075;
      cameraZoom.current.current = THREE.MathUtils.lerp(
        cameraZoom.current.current,
        cameraZoom.current.target,
        zoomDampingFactor
      );

      const rotateDampingFactor = CAMERA_CONSTANTS.rotateSpeed * 10;
      cameraRotation.current.current.theta = THREE.MathUtils.lerp(
        cameraRotation.current.current.theta,
        cameraRotation.current.target.theta,
        rotateDampingFactor
      );
      cameraRotation.current.current.phi = THREE.MathUtils.lerp(
        cameraRotation.current.current.phi,
        cameraRotation.current.target.phi,
        rotateDampingFactor
      );
      
      const radius = cameraZoom.current.current;
      const { theta, phi } = cameraRotation.current.current;
      camera.position.x = radius * Math.sin(theta) * Math.cos(phi);
      camera.position.y = radius * Math.sin(phi);
      camera.position.z = radius * Math.cos(theta) * Math.cos(phi);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      isMounted = false;
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