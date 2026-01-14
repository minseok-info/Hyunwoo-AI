import { OntologyNavigator } from "@/components";
import { loadBrainModel, loadHumanModel, loadSpaceModel } from "@/public/three/loaders";
import styles from "@/styles/main.module.css";
import { BaseSection, BRAIN_AREA_IDS, Depth, MODEL_IDS, ModelId, ModelSection, ModelTransformParams, NodeSection, Section, SectionId, SectionRelation, TransitionRange } from "@/types/modelParams";
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
};

const modelsTransformAttr: Record<ModelId, ModelTransformParams> = {
  idHuman: {
    sizeRatio: 0.01,
    posXRatio: 0,
    posYRatio: 1.925,
    posZRatio: 7.5,
  },
  idBrain: {
    sizeRatio: 0.145,
    posXRatio: 0,
    posYRatio: 2.25,
    posZRatio: 1,
  }
};

const CAEMRA_POSITION = 500;

const ZOOM_SENSITIVITY = 0.035;
const ROTATE_SENSITIVITY = 0.005;

const ZOOM_SPEED = 0.05;
const ROTATE_SPEED = 0.05;
const MOVE_SPEED = 0.05;

const START_SCALE = 1;
const MIN_SCALE = 0.1;
const MAX_SCALE = 1500;

const Main = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const isZoomingRef = useRef<boolean>(false);
  const pointerData = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const touchData = useRef<{ prevDistance: number | null }>({ prevDistance: null });

  const centerVector = new THREE.Vector3(0, 0, 0);

  const CAMERA_CONSTANTS = {
    fov: 75,
    rotateSpeed: 0.005,
    minDelta: 3.5,
    zoomSpeed: 0.15,
    startZoom: 500,
    minZoom: 0.1,
    maxZoom: 1500,
  };

  const cameraRotationRef = useRef<{
    current: { theta: number; phi: number }
    target: { theta: number; phi: number }
  }>({
    current: { theta: 0, phi: 0 },
    target: { theta: 0, phi: 0 }
  });

  const worldGroupScaleRef = useRef<{
    current: number;
    target: number
  }>({
    current: 1,
    target: 1
  });

  const worldGroupPositionRef = useRef<{
    current: THREE.Vector3,
    target: THREE.Vector3
  }>({
    current: centerVector.clone(),
    target: centerVector.clone()
  });

  const tempBox = new THREE.Box3();
  const tempVec = new THREE.Vector3();
  
  // const transitionIntentRef = useRef<"left" | "right" | "auto">("auto");

  const worldGroupRef = useRef<THREE.Group>(new THREE.Group()); // 크기 보정을 위한 Group
  const sectionsRootRef = useRef<THREE.Group>(new THREE.Group()); // 섹션 보관을 위한 Group

  const sectionIdMapRef = useRef<Map<SectionId, Section>>(new Map());
  const sectionDepthMapRef = useRef<Map<Depth, Section>>(new Map());

  const currentSectionRef = useRef<Section | undefined>(undefined);
  const [normalizedSection, setNormalizedSection] = useState<Section | undefined>(undefined);

  const targetPositionIdMapRef = useRef<Map<SectionId, THREE.Vector3>>(new Map());
  const isChasingTarget = useRef<boolean>(false);

  const prevDepthRef = useRef<number>(0);
  const currentDepthRef = useRef<number>(0);
  const normalizedDepthRef = useRef<number>(0);

  const transitionRangeByDepthRef = useRef<Array<[number, number]>>([
    [6, 7.5],
    [11, 12.5]
  ]);

  const [title, setTitle] = useState<string>("Hyunwoo.ai");

  const [tree, setTree] = useState<Tree[]>([]);
  const treeRef = useRef<Tree[]>([]);

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
    section.group.visible = false;

    sectionIdMapRef.current.set(id, section);
    sectionsRootRef.current.add(section.group);
    return section;
  };

  const createNodeSection = (
    node: Tree,
    {
      parent = undefined,
      size = [1, 3],
      distance = {},
      scalar = 1
    }: {
      parent?: THREE.Object3D | undefined,
      size?: [number, number],
      distance?: { min?: number, max?: number },
      scalar?: number
    } = {}
  ) => {
    if (!sceneRef.current) return;

    const children = node.children;
    const group = new THREE.Group();

    const minSize = size[0];
    const maxSize = size[1];
    const minDistance = size[1] + (distance.min ?? 5);
    const maxDistance = distance.max ?? 50;
    const maxTries = 50;

    const usedPositions: THREE.Vector3[] = [];

    const randomColor = (max = 0.8): THREE.Color => {
      return new THREE.Color(
        Math.random() * max,
        Math.random() * max,
        Math.random() * max
      );
    };

    const generatePosition = (
      existing: THREE.Vector3[]
    ): THREE.Vector3 => {
      let bestCandidate: THREE.Vector3 | null = null;
      let bestMinDistSq = -Infinity;

      for (let attempt = 0; attempt < maxTries; attempt++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = Math.cbrt(Math.random()) * maxDistance;

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        const position = new THREE.Vector3(x, y, z);

        let minDistSq = Infinity;

        for (const p of existing) {
          const d = p.distanceToSquared(position);
          if (d < minDistSq) minDistSq = d;
        }

        if (minDistSq >= minDistance * minDistance) {
          return position;
        }

        if (minDistSq > bestMinDistSq) {
          bestMinDistSq = minDistSq;
          bestCandidate = position;
        }
      }

      return bestCandidate ?? new THREE.Vector3();
    };

    for (const c of children) {
      const computedSize = minSize + Math.random() * (maxSize - minSize);
      const geometry = new THREE.SphereGeometry(computedSize, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: randomColor()
      });

      const position = generatePosition(usedPositions);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 100;
      mesh.name = c.nodeId;
      mesh.position.copy(position);

      usedPositions.push(position);
      group.add(mesh);
    };

    const id = node.nodeId;
    const section: NodeSection = {
      id: id,
      kind: "node",
      group: group,
    };
    connectSimilarNode(node, section);

    section.group.scale.setScalar(scalar * 0.35);
    section.group.visible = false;

    if (parent) {
      const position = parent.position.clone();
      section.group.position.copy(position);
    }

    sectionIdMapRef.current.set(id, section);
    sectionsRootRef.current.add(section.group);
    
    return section;
  };

  const connectSimilarNode = (node: Tree, section: NodeSection) => {
    const similarPoints: THREE.Vector3[] = [];
    for (let i = 0; i < node.children.length; i++) {
      for (let j = i + 1; j < node.children.length; j++) {
        const a = node.children[i];
        const b = node.children[j];

        const hasSameTag = a.tags.some(t => b.tags.includes(t));
        if (!hasSameTag) continue;

        const aMesh = section.group.getObjectByName(a.nodeId);
        const bMesh = section.group.getObjectByName(b.nodeId);
        if (!aMesh || !bMesh) return;

        const aPosition = aMesh.position.clone();
        const bPosition = bMesh.position.clone();
        similarPoints.push(aPosition, bPosition)
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(similarPoints);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
    const lines = new THREE.LineSegments(geometry, material);
    section.group.add(lines);
  };

  const computeOpacity = (
    range: TransitionRange
  ): number => {
    const currentScale = worldGroupScaleRef.current.current;

    const min = Math.min(...range);
    const max = Math.max(...range);

    return THREE.MathUtils.inverseLerp(min, max, currentScale);
  };

  const setSectionOpacity = (
    section: Section,
    opacity: number
  ) => {
    if (opacity > 1.5 || opacity < -0.5) return;

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

  const backToPrevSection = () => {
    // const prevTransition = prevTransitionMapRef.current.get(currentSectionIdRef.current);
    // if (!prevTransition) return;

    // const requireZoom = Math.max(...prevTransition.range) + 20;
    // cameraZoomRef.current.target = requireZoom;
  };

  const pushToClickedSection = (clickedSectionId: SectionId) => {
    // const currentSection = sectionMapRef.current.get(currentSectionIdRef.current);
    // if (!currentSection) return;
    
    // const SECTION_IDS = [...Object.values(MODEL_IDS), ...Object.values(BRAIN_AREA_IDS)] as SectionId[];
    // const isNodeSection = !SECTION_IDS.includes(clickedSectionId);

    // if (isNodeSection) {
    //   const clickedMesh = currentSection.group.getObjectByName(clickedSectionId);
    //   if (!clickedMesh) return;

    //   clickedMesh.getWorldPosition(tempVec);
    //   setTargetPosition(tempVec);
    // }

    // let clickedSection = sectionMapRef.current.get(clickedSectionId);
    // if (!clickedSection) return;
    
    // const prevTransition = prevTransitionMapRef.current.get(clickedSection.id);
    // if (!prevTransition) return;

    // const prevSectionId = prevTransition.section.id;
    // const prevSection = sectionMapRef.current.get(prevSectionId);

    // if (prevSection?.id === MODEL_IDS.brain) {
    //   const isLeft = clickedSectionId === BRAIN_AREA_IDS.left;
    //   transitionIntentRef.current = isLeft
    //     ? "left"
    //     : "right";

    //   const yawOffset = Math.PI / 7.5;
    //   cameraRotationRef.current.target.theta = isLeft
    //     ? -yawOffset
    //     : yawOffset;
    // }

    // const nextTransitionWithPrevSection = nextTransitionMapRef.current.get(prevSectionId);
    // if (!nextTransitionWithPrevSection) return;

    // const requireZoom = Math.min(...nextTransitionWithPrevSection.range) - 2;
    // cameraZoomRef.current.target = requireZoom;
  };

  const getDirection = (
    offset = ZOOM_SENSITIVITY
  ): "in" | "out" | "idle" => {
    const current = worldGroupScaleRef.current.current;
    const target = worldGroupScaleRef.current.target;

    if (current < target - offset) return "in";
    if (current > target + offset) return "out";
    return "idle";
  };

  const getAngle = (): "left" | "right" => {
    const direction = new THREE.Vector3().subVectors(cameraRef.current!.position, centerVector);

    direction.y = 0;
    direction.normalize();

    const angle = Math.atan2(direction.x, direction.z);
    return angle < 0 ? "left" : "right";
  };

  const onSectionEnter = (depth: Depth) => {
    const enteredSection = sectionDepthMapRef.current.get(depth)!;
    currentSectionRef.current = enteredSection;
  };

  const updateSection = () => {
    const direction = getDirection();
    if (direction === "idle") return;

    const currentScale = worldGroupScaleRef.current.current;
    const currentDepth = currentDepthRef.current;
    const currentSection = currentSectionRef.current;
    if (!currentSection) return;

    const transitionRange = transitionRangeByDepthRef.current[currentDepth] ?? undefined;
    if (transitionRange) {
      const min = Math.min(...transitionRange);
      const max = Math.max(...transitionRange);
      const t = computeOpacity(transitionRange);

      let normalizedDepth = currentDepth;
      if (currentScale >= max) normalizedDepth += 1;

      if (normalizedDepthRef.current !== normalizedDepth) {
        normalizedDepthRef.current = normalizedDepth;

        const normalizedSection = sectionDepthMapRef.current.get(normalizedDepth);
        setNormalizedSection(normalizedSection);
      }
  
      if (direction === "in") {
        if (currentScale > max) {
          currentDepthRef.current = Math.min(
            currentDepth + 1,
            sectionDepthMapRef.current.size - 1
          );
        }
      }
      else if (direction === "out") {
        if (currentScale < min) {
          currentDepthRef.current = Math.max(
            currentDepth - 1,
            0
          );
        }
      }

      setSectionOpacity(currentSection, 1 - t);
      
      const nextSection = sectionDepthMapRef.current.get(currentDepth + 1);
      if (nextSection) {
        setSectionOpacity(nextSection, t);
      }
    }

    const prevDepth = prevDepthRef.current;
    const nextDepth = currentDepthRef.current;
    
    if (prevDepth !== nextDepth) {
      onSectionEnter(nextDepth);
      prevDepthRef.current = nextDepth;
      
      return;
    }

    if (currentSection.id === MODEL_IDS.brain) {
      if (currentScale < Math.min(...transitionRange)) {
        const angle = getAngle();

        const leftOrRightId = angle === "left"
          ? BRAIN_AREA_IDS.left
          : BRAIN_AREA_IDS.right;
        const leftOrRightSection = sectionIdMapRef.current.get(leftOrRightId);
        if (!leftOrRightSection) {
          const node = treeUtils.getNode(treeRef.current, leftOrRightId);
          if (!node) return;

          createNodeSection(node);
        }
        else {
          sectionDepthMapRef.current.set(currentDepth + 1, leftOrRightSection);
          transitionRangeByDepthRef.current.push([50, 70]);
        }
      }
    }
  };

  const updateWorldGroupPosition = () => {
    const normalizedDepth = normalizedDepthRef.current;

    const prevSection = sectionDepthMapRef.current.get(normalizedDepth - 1)
    const currentSection = sectionDepthMapRef.current.get(normalizedDepth);
    if (!prevSection || !currentSection) return;

    const prevTransitionRange = transitionRangeByDepthRef.current[normalizedDepth - 1];
    const currentTransitionRange = transitionRangeByDepthRef.current[normalizedDepth];

    const targetPosition = targetPositionIdMapRef.current.get(currentSection.id);
    if (!targetPosition) return;

    const currentScale = worldGroupScaleRef.current.current;

    const minProcessScale = Math.max(...prevTransitionRange);
    const maxProcessScale = Math.min(...currentTransitionRange) * 0.75;
    const process = (currentScale - minProcessScale) / (maxProcessScale - minProcessScale);

    const from = centerVector.clone();
    const to = targetPosition.clone().multiplyScalar(-currentScale);

    const t = THREE.MathUtils.clamp(process, 0, 1);
    worldGroupPositionRef.current.target.copy(
      from.clone().lerp(to, t)
    );
  };

  const handleWheel = (event: WheelEvent) => {
    const worldGroup = worldGroupRef.current;
    if (!worldGroup) return;
    event.preventDefault();

    const delta = -event.deltaY / 100;
    
    const currentScale = worldGroupScaleRef.current.current;
    const scaleFactor = currentScale / START_SCALE;

    const normalizedDelta = delta * scaleFactor * ZOOM_SENSITIVITY;
    worldGroupScaleRef.current.target = THREE.MathUtils.clamp(
      worldGroupScaleRef.current.target + normalizedDelta,
      MIN_SCALE,
      MAX_SCALE
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

    cameraRotationRef.current.target.theta -= dx * ROTATE_SENSITIVITY;
    cameraRotationRef.current.target.phi += dy * ROTATE_SENSITIVITY;
    cameraRotationRef.current.target.phi = THREE.MathUtils.clamp(
      cameraRotationRef.current.target.phi,
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
    const worldGroup = worldGroupRef.current;
    if (!worldGroup) return;
    event.preventDefault();

    const touches = event.touches;
    if (event.touches.length === 2 && touchData.current.prevDistance) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const distance = Math.hypot(dx, dy);

      const delta = -(touchData.current.prevDistance - distance);

      const currentScale = worldGroupScaleRef.current.current;
      const scaleFactor = currentScale / START_SCALE;

      let normalizedDelta = delta* scaleFactor * (ZOOM_SENSITIVITY * 0.075);
      worldGroupScaleRef.current.target = THREE.MathUtils.clamp(
        worldGroupScaleRef.current.target + normalizedDelta,
        MIN_SCALE,
        MAX_SCALE
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
    treeRef.current = tree;
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
    camera.position.z = CAEMRA_POSITION;

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

    const setInitialSections = ({
      spaceModel,
      humanModel,
      brainModel
    }: {
      spaceModel: THREE.Group,
      humanModel: THREE.Group,
      brainModel: THREE.Group
    }) => {
      scene.add(spaceModel);

      const humanSection = createModelSection(MODEL_IDS.human, humanModel, modelsTransformAttr.idHuman);
      const brainSection = createModelSection(MODEL_IDS.brain, brainModel, modelsTransformAttr.idBrain);

      sectionDepthMapRef.current.set(0, humanSection);
      sectionDepthMapRef.current.set(1, brainSection);

      currentSectionRef.current = humanSection;
      setNormalizedSection(humanSection);

      setSectionOpacity(humanSection, 1);
    };

    const loadModels = async () => {
      try {
        const loader = new GLTFLoader();
        const [spaceModel, humanModel, brainModel] = await Promise.all([
          loadSpaceModel({ loader }),
          loadHumanModel({ loader }),
          loadBrainModel({ loader })
        ]);

        // 배경이 모두 보이도록 카메라 최대 시야 확장
        tempBox.setFromObject(spaceModel);
        tempBox.getSize(tempVec);

        camera.far = Math.max(tempVec.x, tempVec.y, tempVec.z);
        camera.updateProjectionMatrix();

        setInitialSections({ spaceModel, humanModel, brainModel });
      }
      catch (error) {
        console.error(error);
      }
    };
    loadModels();

    worldGroupRef.current.add(sectionsRootRef.current);
    scene.add(worldGroupRef.current);

    // Camera 사용을 위한 Event
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
    };
    window.addEventListener("resize", handleResize);
    
    const animate = () => {
      if (!isMounted) return;
      requestAnimationFrame(animate);

      cameraRotationRef.current.current.theta = THREE.MathUtils.lerp(
        cameraRotationRef.current.current.theta,
        cameraRotationRef.current.target.theta,
        ROTATE_SPEED
      );
      cameraRotationRef.current.current.phi = THREE.MathUtils.lerp(
        cameraRotationRef.current.current.phi,
        cameraRotationRef.current.target.phi,
        ROTATE_SPEED
      );

      const radius = CAEMRA_POSITION;
      const { theta, phi } = cameraRotationRef.current.current;

      const offset = new THREE.Vector3(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(phi),
        radius * Math.cos(theta) * Math.cos(phi)
      );
      camera.position.copy(offset);
      camera.lookAt(centerVector);

      worldGroupScaleRef.current.current = THREE.MathUtils.lerp(
        worldGroupScaleRef.current.current,
        worldGroupScaleRef.current.target,
        ZOOM_SPEED
      );
      worldGroupRef.current.scale.setScalar(worldGroupScaleRef.current.current);

      updateSection();
      updateWorldGroupPosition();

      if (isChasingTarget.current) {
        worldGroupPositionRef.current.current = worldGroupPositionRef.current.current.lerp(
          worldGroupPositionRef.current.target,
          MOVE_SPEED
        );

        const offset = worldGroupPositionRef.current.current
          .distanceTo(worldGroupPositionRef.current.target);

        if (offset < 1) {
          isChasingTarget.current = false;
          worldGroupPositionRef.current.current.copy(
            worldGroupPositionRef.current.target
          );
        }
      }
      else {
        worldGroupPositionRef.current.current.copy(
          worldGroupPositionRef.current.target
        );
      }
      worldGroupRef.current.position.copy(worldGroupPositionRef.current.current);

      renderer.render(scene, camera);
    };
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

  const sansing = () => {
    console.log("\n");
    console.log("worldGroupScale: ", worldGroupScaleRef.current.current);
    console.log("currentSection: ", currentSectionRef.current);
    console.log("currentDepth: ", currentDepthRef.current);
    console.log("currentPosition: ", worldGroupPositionRef.current);
    console.log("--- End ---");
  }

  const qwe = () => {
    const section = currentSectionRef.current;
    const firshMesh = section!.group.children[0].name;
    const mesh = section!.group.getObjectByName(firshMesh) as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material) material.color = new THREE.Color(0xffffff);

    meshing.current = mesh;

    const currentScale = worldGroupScaleRef.current.current;
    const meshWorld = new THREE.Vector3();
    mesh.getWorldPosition(meshWorld);
    meshPosition.current = meshWorld.clone().divideScalar(currentScale);

    const transitionRange = transitionRangeByDepthRef.current[currentDepthRef.current];
    const max = Math.max(...transitionRange);

    let realDepth = currentDepthRef.current;
    if (currentScale > max) realDepth += 1;

    const sansPosition = meshWorld.clone().divideScalar(currentScale);
    targetPositionIdMapRef.current.set(section!.id, sansPosition);
    isChasingTarget.current = true;
    // meshPosition.current = mesh.position.clone().divideScalar(currentScale);

    // const meshWorld = new THREE.Vector3();
    // mesh.getWorldPosition(meshWorld);
    // worldGroupRef.current.position.sub(meshWorld);

    // targetMeshDepthMapRef.current.set(currentDepthRef.current, mesh);
    // console.log(targetMeshDepthMapRef.current);
  }

  const asd = () => {
    const mesh = meshing.current;

    const vec = new THREE.Vector3();
    mesh?.getWorldPosition(vec);
    worldGroupRef.current.position.sub(vec);
  }

  const meshing = useRef<THREE.Mesh|undefined>();
  const meshPosition = useRef<THREE.Vector3|undefined>();

  const zxc = () => {
    meshing.current = undefined;
    meshPosition.current = undefined;
    worldGroupRef.current.position.copy(centerVector);
  }

  return (
    <React.Fragment>
      <OntologyNavigator tree={tree} currentSectionId={normalizedSection?.id} back={backToPrevSection} push={pushToClickedSection} />
      <div className={clsx(styles.titleContainer)}>
        <p>{ title }</p>
      </div>
      <div className={clsx(styles.socialContainer)}>
        <div onClick={() => window.open("https://github.com/hwk06023", "_blank")}>
          <Image src={githubIcon.src} alt={githubIcon.alt} />
        </div>
      </div>
      <div ref={mountRef} className={clsx(styles.fullScreen)} />
      <div className={clsx(styles.temp)}>
        <div onClick={sansing}>
          <p>sans</p>
        </div>
        <div onClick={qwe}>
          <p>qwe</p>
        </div>
        <div onClick={asd}>
          <p>asd</p>
        </div>
        <div onClick={zxc}>
          <p>zxc</p>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Main;