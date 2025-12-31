import { loadBrainModel, loadHumanModel, loadSpaceModel } from "@/public/three/loaders";
import styles from "@/styles/main.module.css";
import { BaseSection, ModelId, ModelSection, ModelTransformParams, NodeSection, Section, SectionId, TransitionSection } from "@/types/modelParams";
import { Node, Ontology, Relation, Tree } from "@/types/ontologyTypes";
import { ontologyToTree, treeUtils } from "@/utils";
import clsx from "clsx";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

const githubIcon = {
  src: require("@/public/icons/github.svg"),
  alt: "github"
}

const Main = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  const modelsTransformAttr: Record<ModelId, ModelTransformParams> = {
    human: {
      sizeRatio: 0.01,
      posXRatio: 0,
      posYRatio: 1.925,
      posZRatio: 7.5,
    },
    brain: {
      sizeRatio: 0.145,
      posXRatio: 0,
      posYRatio: 2.25,
      posZRatio: 1,
    }
  };

  const isZoomingRef = useRef<boolean>(false);
  const pointerData = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const touchData = useRef<{ prevDistance: number | null }>({ prevDistance: null });

  const CAMERA_CONSTANTS = {
    fov: 75,
    rotateSpeed: 0.005,
    zoomSpeed: 0.15,
    startZoom: 500,
    minZoom: 0.1,
    maxZoom: 1500,
  };

  const MOBILE_CONSTANTS = {
    zoomSpeed: 1
  };

  const cameraZoomRef = useRef<{
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

  const sectionsRef = useRef<Map<SectionId, Section>>(new Map());
  const currentSectionIdRef = useRef<SectionId>("");

  const [title, setTitle] = useState<string>("Hyunwoo.ai");
  const [tree, setTree] = useState<Tree[]>([]);

  const getOntology = async ()  => {
    let newOntology: Ontology = { nodes: [], relations: [] };

    try {
      const serverUrl = "https://hyunwoo-ai-backend.fly.dev/";
      const response = await fetch(`${serverUrl}ontology`, {
        method: "GET"
      });
      if (!response.ok) return;

      await response.json().then(j => {
        const resOnt = j["ontology"] as Ontology;

        const resNodes: Node[] = resOnt["nodes"].map((r: any) => ({ ...r, desc: r.description }));
        const resRels: Relation[] = resOnt["relations"].map((r: any) => ({ from: r.from_, to: r.to_, type: r.type }));

        newOntology = { nodes: resNodes, relations: resRels };
      });
    }
    catch (error) {
      console.error(error);
      setTitle("Error");
    }
    finally {
      setTree(ontologyToTree(newOntology));
    }
  };

  const createModelSection = (
    id: ModelId,
    model: THREE.Group,
    transform: ModelTransformParams,
  ): ModelSection => {
    sceneRef.current!.add(model);
    model.visible = false;

    if (transform.sizeRatio !== undefined) {
      const baseScale = CAMERA_CONSTANTS.startZoom * transform.sizeRatio;
      model.scale.setScalar(baseScale);
    }

    tempBox.setFromObject(model);
    tempBox.getCenter(tempVec);

    const position = tempVec.clone();
    position.x *= transform.posXRatio;
    position.y *= transform.posYRatio;
    position.z *= transform.posZRatio;

    const { x, y, z } = position;
    model.position.set(x, -y, z);

    const section: ModelSection = {
      id: id,
      kind: "model",
      group: model,
      transform: transform
    };

    sectionsRef.current.set(id, section);
    return section;
  };

  const createNodeSection = (node: Tree) => {
    if (!sceneRef.current) return;

    const children = node.children;
    const group = new THREE.Group();

    const randomColor = (max = 0.8): THREE.Color => {
      return new THREE.Color(
        Math.random() * max,
        Math.random() * max,
        Math.random() * max
      );
    };

    for (const c of children) {
      const geometry = new THREE.SphereGeometry(500, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: randomColor()
      });

      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * 2500;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = c.nodeId;
      mesh.position.set(x, y, z);

      group.add(mesh);
    };

    const id = node.nodeId;
    const section: NodeSection = {
      id: id,
      kind: "node",
      group: group
    };
    sectionsRef.current.set(id, section);
    group.scale.setScalar(0.01);

    sceneRef.current.add(section.group);
  };

  const setSectionOpacity = (
    section: Section,
    opacity: number
  ) => {
    if (opacity > 1 || opacity < 0) return;

    section.group.visible = opacity > 0;
    section.group.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        materials.forEach(mat => {
          if (!("opacity" in mat)) return;

          mat.opacity = opacity;
          mat.transparent = opacity < 1;
          mat.needsUpdate = true;
        });
      }
      else if ((child as THREE.LineSegments).isLineSegments) {
        const line = child as THREE.LineSegments;
        const mat = line.material as any;

        if (mat) {
          mat.opacity = opacity;
          mat.transparent = opacity < 1;
          mat.needsUpdate = true;
        }
      }
    });
  };

  const getOpacity = (distance: number, section: TransitionSection): number => {
    if (!section) return 1;

    const min = section.range[0];
    const max = section.range[1];

    const t = THREE.MathUtils.inverseLerp(min, max, distance);
    return t;
  }

  const updateSection = () => {
    const currentZoom = cameraZoomRef.current.current;
    const targetZoom = cameraZoomRef.current.target;
    const zoomOffset = 1;

    const currentSectionId = currentSectionIdRef.current;
    const currentSection = sectionsRef.current.get(currentSectionId);
    if (!currentSection) return;

    const next = currentSection.next;
    const prev = currentSection.prev;

    if ((currentZoom > targetZoom + zoomOffset) || (currentZoom < targetZoom - zoomOffset)) {
      if (next) {
        const t = getOpacity(currentZoom, next);
        setSectionOpacity(currentSection, t);

        console.log(t);
      }
      if (prev) {
        const t = getOpacity(currentZoom, prev);
        setSectionOpacity(prev.section, t);
      }
    }
  };

  const handleWheel = (event: WheelEvent) => {
    if (!cameraRef.current) return;
    event.preventDefault();

    const factor = cameraZoomRef.current.current / CAMERA_CONSTANTS.startZoom;
    const delta = event.deltaY;
    const normalizedDelta = delta * factor * CAMERA_CONSTANTS.zoomSpeed;

    cameraZoomRef.current.target = THREE.MathUtils.clamp(
      cameraZoomRef.current.target + normalizedDelta,
      CAMERA_CONSTANTS.minZoom,
      CAMERA_CONSTANTS.maxZoom
    );
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (isZoomingRef.current) return;
    event.preventDefault();

    pointerData.current = { x: event.clientX, y: event.clientY };
  };

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
  };

  const handlePointerUp = () => {
    pointerData.current = { x: null, y: null };
  };

  const handleTouchStart = (event: TouchEvent) => {
    event.preventDefault();

    const touches = event.touches;
    if (touches.length === 2) {
      isZoomingRef.current = true;

      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      touchData.current.prevDistance = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (event: TouchEvent) => {
    event.preventDefault();

    const touches = event.touches;
    if (event.touches.length === 2 && touchData.current.prevDistance) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const distance = Math.hypot(dx, dy);

      const factor = cameraZoomRef.current.current / CAMERA_CONSTANTS.startZoom;
      const delta = (touchData.current.prevDistance - distance);
      const normalizedDelta = delta * factor * MOBILE_CONSTANTS.zoomSpeed;

      cameraZoomRef.current.target = THREE.MathUtils.clamp(
        cameraZoomRef.current.target + normalizedDelta,
        CAMERA_CONSTANTS.minZoom,
        CAMERA_CONSTANTS.maxZoom
      );

      touchData.current.prevDistance = distance;
    }
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const touches = event.touches;
    if (touches.length < 2) {
      isZoomingRef.current = false;
      touchData.current.prevDistance = null;
    }
  };

  useEffect(() => {
    if (tree.length < 1) return;

    const left = treeUtils.getNode(tree, "idLeft");
    if (!left) return;

    createNodeSection(left);
  }, [tree]);

  useEffect(() => {
    if (!mountRef.current) return;
    let isMounted = true;

    getOntology();

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

    const createIntialSections = ({
      spaceModel,
      humanModel,
      brainModel
    }: {
      spaceModel: THREE.Group,
      humanModel: THREE.Group,
      brainModel: THREE.Group
    }) => {
      scene.add(spaceModel);

      const humanSection = createModelSection("human", humanModel, modelsTransformAttr.human);
      const brainSection = createModelSection("brain", brainModel, modelsTransformAttr.brain);

      humanSection.next = {
        section: brainSection,
        range: [70, 90]
      };
      brainSection.prev = {
        section: humanSection,
        range: [700, 800]
      };

      brainModel.visible = true;
      humanModel.visible = true;
      currentSectionIdRef.current = "human";

      setSectionOpacity(humanSection, 1);
      setSectionOpacity(brainSection, 1);
    };

    const loadModels = async () => {
      try {
        const loader = new GLTFLoader();
        const [spaceModel, humanModel, brainModel] = await Promise.all([
          loadSpaceModel({ loader }),
          loadHumanModel({ loader }),
          loadBrainModel({ loader })
        ]);

        const boundingBox = tempBox.setFromObject(spaceModel);
        boundingBox.getSize(tempVec);
        camera.far = Math.max(tempVec.x, tempVec.y, tempVec.z);
        camera.updateProjectionMatrix();

        createIntialSections({ spaceModel, humanModel, brainModel });
      }
      catch (error) {
        console.error(error);
      }
    };
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
      updateSection();
      
      const zoomDampingFactor = 0.075;
      cameraZoomRef.current.current = THREE.MathUtils.lerp(
        cameraZoomRef.current.current,
        cameraZoomRef.current.target,
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
      
      const radius = cameraZoomRef.current.current;
      const { theta, phi } = cameraRotation.current.current;

      const offsetX = radius * Math.sin(theta) * Math.cos(phi);
      const offsetY = radius * Math.sin(phi);
      const offsetZ = radius * Math.cos(theta) * Math.cos(phi);
      camera.position.set(
        cameraTargetRef.current.x + offsetX,
        cameraTargetRef.current.y + offsetY,
        cameraTargetRef.current.z + offsetZ
      );
      camera.lookAt(cameraTargetRef.current);

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
    <React.Fragment>
      <div className={clsx(styles.titleContainer)}>
        <p>{ title }</p>
      </div>
      <div className={clsx(styles.socialContainer)}>
        <div onClick={() => window.open("https://github.com/hwk06023", "_blank")}>
          <Image src={githubIcon.src} alt={githubIcon.alt} />
        </div>
      </div>
      <div ref={mountRef} className={clsx(styles.fullScreen)} />
    </React.Fragment>
  );
};

export default Main;