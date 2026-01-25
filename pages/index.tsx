import { ChatBox, NodeCard, OntologyNavigator, SplashImage } from "@/components";
import { loadBrainModel, loadHumanModel, loadMilkywayModel } from "@/public/three/loaders";
import styles from "@/styles/main.module.css";
import { BRAIN_AREA_IDS, Depth, MODEL_IDS, ModelId, ModelSection, ModelTransformParams, NodeSection, Section, SectionId, SectionRelation, TransitionRange } from "@/types/modelParams";
import { Node, Ontology, Relation, Tree } from "@/types/ontologyTypes";
import { ontologyToTree, treeUtils } from "@/utils";
import clsx from "clsx";
import Head from "next/head";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer, GLTFLoader } from "three/examples/jsm/Addons.js";

const githubIcon = {
  src: require("@/public/icons/github.svg"),
  alt: "github"
};

const videoIcon = {
  src: require("@/public/icons/video.svg"),
  alt: "video"
};

const chatIcon = {
  src: require("@/public/icons/chat.svg"),
  alt: "chat"
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
  },
  idMilkyway: {
    sizeRatio: 50,
    posXRatio: 0,
    posYRatio: 0,
    posZRatio: 0,
  }
};

const CAMERA_FOV = 75;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 500000;
const CAEMRA_POSITION = 500;

const ZOOM_SENSITIVITY = 0.035;
const ROTATE_SENSITIVITY = 0.005;

const ROTATE_SPEED = 0.05;
const MOVE_SPEED = 0.05;
const ZOOM_SPEED = 0.05;
const CHASING_LOG_SPEED = 0.01;

const START_SCALE = 1;
const MIN_SCALE = 0.1;
const MAX_SCALE = Infinity;

const NODE_SECTION_RATIO = 0.01;

const Main = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const nodeCardRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const isZoomingRef = useRef<boolean>(false);
  const isProgressBarRef = useRef<boolean>(false);
  const pointerData = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const touchData = useRef<{ prevDistance: number | null }>({ prevDistance: null });

  const centerVector = new THREE.Vector3(0, 0, 0);

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

  const worldGroupRef = useRef<THREE.Group>(new THREE.Group()); // 크기 보정을 위한 Group
  const sectionsRootRef = useRef<THREE.Group>(new THREE.Group()); // 섹션 보관을 위한 Group

  const sectionIdMapRef = useRef<Map<SectionId, Section>>(new Map());
  const sectionDepthMapRef = useRef<Map<Depth, Section>>(new Map());

  const currentSectionRef = useRef<Section | undefined>(undefined);
  const [normalizedSection, setNormalizedSection] = useState<Section | undefined>(undefined);

  const targetNodeIdMapRef = useRef<Map<SectionId, Tree>>(new Map());
  const targetPositionIdMapRef = useRef<Map<SectionId, THREE.Vector3>>(new Map());
  const isChasingTarget = useRef<boolean>(false);

  const prevDepthRef = useRef<number>(0);
  const currentDepthRef = useRef<number>(0);
  const normalizedDepthRef = useRef<number>(0);

  const scaleProgressRef = useRef<number>(0);

  const transitionRangeDepthMapRef = useRef<Map<number, [number, number]>>(new Map([
    [0, [1.80, 2.00]],
    [1, [2.40, 2.75]]
  ]));

  const [tree, setTree] = useState<Tree[]>([]);
  const treeRef = useRef<Tree[]>([]);

  const [isToggleChatBox, setIsToggleChatBox] = useState<boolean>(false);
  const [showSplashImage, setShowSplashImage] = useState<boolean>(false);

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
      const baseScale = CAEMRA_POSITION * transform.sizeRatio;
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

    if (id === MODEL_IDS.milkyway) {
      model.position.copy(
        centerVector.clone().sub(tempVec)
      );
    }

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
    depth: number,
    {
      position = undefined,
      scalar = 1
    }: {
      position?: THREE.Vector3 | undefined,
      scalar?: number
    } = {}
  ) => {
    if (!sceneRef.current) return;

    const loader = new THREE.TextureLoader();
    const glowTexture = loader.load("/textures/glowTexture.png");

    const sectionId = node.nodeId;

    const children = node.children;
    const group = new THREE.Group();

    const minSize = 2;
    const maxSize = 3;
    const minDistance = maxSize + 5;
    const maxDistance = 50;
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

    const generateRotation = (
      maxX = Math.PI * 2,
      maxY = Math.PI * 2,
      maxZ = Math.PI * 2
    ): THREE.Euler => {
      const x = Math.random() * maxX;
      const y = Math.random() * maxY;
      const z = Math.random() * maxZ;

      return new THREE.Euler(x, y, z);
    };

    for (const c of children) {
      const computedSize = minSize + Math.random() * (maxSize - minSize);

      const sphereGeometry = new THREE.SphereGeometry(computedSize, 32, 32);
      const tetrahedronGeometry = new THREE.TetrahedronGeometry(computedSize, Math.floor(Math.random() * 3) + 1);

      const geometry = c.children.length > 0
        ? tetrahedronGeometry
        : sphereGeometry;

      const color = randomColor();
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.35
      });

      const meshPosition = generatePosition(usedPositions);
      const meshRotation = generateRotation();

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = c.nodeId;
      mesh.position.copy(meshPosition);
      mesh.rotation.copy(meshRotation);

      const spriteMat = new THREE.SpriteMaterial({
        map: glowTexture,
        color: color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(spriteMat);
      const spriteScale = 17.5 + computedSize;
      sprite.scale.set(spriteScale, spriteScale, spriteScale);
      mesh.add(sprite);
      
      const wrapper = document.createElement("span");
      wrapper.className = styles.marker;
      
      const nameSpan = document.createElement("span");
      nameSpan.className = styles.content;
      nameSpan.textContent = c.name;
      
      wrapper.appendChild(nameSpan);
      wrapper.addEventListener("click", () => {
        setSectionTarget(mesh);
      });
      
      const textObject = new CSS3DObject(wrapper);
      textObject.position.x += geometry.parameters.radius + 0.75;

      const placeholder = new THREE.Object3D();

      placeholder.add(textObject);
      placeholder.position.copy(meshPosition);

      mesh.userData.placeholder = placeholder;
      mesh.userData.textObject = textObject;
      
      usedPositions.push(meshPosition);
      group.add(placeholder);
      group.add(mesh);
    };

    const section: NodeSection = {
      id: sectionId,
      kind: "node",
      group: group,
    };
    connectSimilarNode(node, section);

    const maxScale = Math.max(...transitionRangeDepthMapRef.current.get(depth)!);
    const scaleFactor = START_SCALE / maxScale;
    const normalizedScale = scalar * scaleFactor;

    section.group.scale.setScalar(normalizedScale);
    section.group.visible = false;
    section.group.renderOrder = -depth;

    if (position) section.group.position.copy(position.clone());

    sectionIdMapRef.current.set(sectionId, section);
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

  const resolveSection = (
    sectionId: SectionId,
    {
      position,
      scalar
    }: {
      position?: THREE.Vector3,
      scalar?: number
    } = {}
  ): Section | undefined => {
    const section = sectionIdMapRef.current.get(sectionId);
    if (section) {
      return section;
    }

    const node = treeUtils.getNode(treeRef.current, sectionId);
    if (!node) return;

    const newSection = createNodeSection(node, normalizedDepthRef.current, { position, scalar });
    if (!newSection) return;

    return newSection;
  };

  const computeNextTransitionRange = (depth: number): { rangeStart: number, rangeEnd: number } => {
    const baseStart = 6.5;

    const rangeDelta = 4.85;
    const rangeWidth = 0.35;

    const rangeStart = baseStart + (depth - 1) * rangeDelta;
    const rangeEnd = rangeStart + rangeWidth;

    return { rangeStart, rangeEnd };
  };

  const advanceToNextDepth = (
    section: Section,
    transitionRange: TransitionRange
  ) => {
    const normalizedDepth = normalizedDepthRef.current;
    const nextDepth = normalizedDepth + 1;

    for (const depth of Array.from(sectionDepthMapRef.current.keys())) {
      if (depth >= nextDepth + 1) {
        sectionDepthMapRef.current.delete(depth);
      }
    }
    for (const depth of Array.from(transitionRangeDepthMapRef.current.keys())) {
      if (depth >= nextDepth + 1) {
        transitionRangeDepthMapRef.current.delete(depth);
      }
    }

    sectionDepthMapRef.current.set(nextDepth, section);
    transitionRangeDepthMapRef.current.set(nextDepth, transitionRange);
  };

  const setNextNodeSection = () => {
    const normalizedDepth = normalizedDepthRef.current;
    const normalizedSection = sectionDepthMapRef.current.get(normalizedDepth);
    if (!normalizedSection) return;

    const targetNode = targetNodeIdMapRef.current.get(normalizedSection.id);
    if (!targetNode) return;

    const targetPosition = targetPositionIdMapRef.current.get(normalizedSection.id);
    if (!targetPosition) return;
    
    const nextScale = Math.pow(NODE_SECTION_RATIO, normalizedDepth - 1);
    const nextSection = resolveSection(targetNode.nodeId, { position: targetPosition, scalar: nextScale });
    if (!nextSection) return;

    const { rangeStart, rangeEnd } = computeNextTransitionRange(normalizedDepth);

    advanceToNextDepth(nextSection, [rangeStart, rangeEnd]);
  }

  const computeOpacity = (
    range: TransitionRange
  ): number => {
    const scaleProgress = scaleProgressRef.current;

    const min = Math.min(...range);
    const max = Math.max(...range);

    return THREE.MathUtils.inverseLerp(min, max, scaleProgress);
  };

  const setSectionOpacity = (
    section: Section,
    opacity: number
  ) => {
    if (opacity > 1.5 || opacity < -0.5) return;

    section.group.visible = opacity > 0;
    section.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
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
      else if (child instanceof THREE.LineSegments) {
        const line = child as THREE.LineSegments;
        const mat = line.material as any;

        if (mat) {
          mat.opacity = opacity;
          mat.transparent = opacity < 1;
          mat.needsUpdate = true;
        }
      }
      else if (child instanceof THREE.Sprite) {
        const sprite = child as THREE.Sprite;
        const mat = sprite.material as THREE.SpriteMaterial;

        mat.opacity = opacity;
        mat.transparent = opacity < 1;
        mat.needsUpdate = true;
      }
      else if (child instanceof CSS3DObject) {
        const element = child.element as HTMLElement;

        element.style.opacity = opacity.toString();
      }
    });
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

  const setSectionTarget = (mesh: THREE.Mesh) => {
    const normalizedDepth = normalizedDepthRef.current;
    const normalizedSection = sectionDepthMapRef.current.get(normalizedDepth);
    if (!normalizedSection) return;

    const sectionId = normalizedSection.id;
    const nodeId = mesh.name;

    const meshWorldPos = new THREE.Vector3();
    mesh.getWorldPosition(meshWorldPos);

    meshWorldPos.sub(worldGroupRef.current.position);

    const meshNode = treeUtils.getNode(treeRef.current, nodeId);
    targetNodeIdMapRef.current.set(sectionId, meshNode!);

    const normalizedPosition = meshWorldPos
      .clone()
      .divideScalar(worldGroupScaleRef.current.current);

    targetPositionIdMapRef.current.set(sectionId, normalizedPosition);

    const { rangeEnd } = computeNextTransitionRange(normalizedDepth - 1);
    const margin = 0.15;

    const targetLog = rangeEnd + margin;
    worldGroupScaleRef.current.target = START_SCALE * Math.exp(targetLog);

    setNextNodeSection();
    isChasingTarget.current = true;
  };

  const backPreviousSection = () => {
    const normalizedDepth = normalizedDepthRef.current;

    const prevTransitionRange = transitionRangeDepthMapRef.current.get(normalizedDepth - 1);
    if (!prevTransitionRange) return;

    const rangeStart = Math.min(...prevTransitionRange);
    const margin = 0.15;

    const targetLog = rangeStart - margin;
    worldGroupScaleRef.current.target = START_SCALE * Math.exp(targetLog);
  };

  const pushNextSection = (node: Tree) => {
    const normalizedDepth = normalizedDepthRef.current;
    const normalizedSection = sectionDepthMapRef.current.get(normalizedDepth);
    if (!normalizedSection) return;

    const mesh = normalizedSection.group.getObjectByName(node.nodeId) as THREE.Mesh;
    if (!mesh) return;

    setSectionTarget(mesh);
  };

  const onSectionEnter = (depth: Depth) => {
    const enteredSection = sectionDepthMapRef.current.get(depth)!;
    currentSectionRef.current = enteredSection;
    isChasingTarget.current = false;
  };

  const updateSection = () => {
    const direction = getDirection();
    if (direction === "idle") return;

    const currentScale = worldGroupScaleRef.current.current;
    const scaleProgress = Math.log(currentScale / START_SCALE);

    scaleProgressRef.current = scaleProgress;

    const currentDepth = currentDepthRef.current;
    const currentSection = currentSectionRef.current;
    if (!currentSection) return;

    const transitionRange = transitionRangeDepthMapRef.current.get(currentDepth) ?? undefined;
    if (transitionRange) {
      const min = Math.min(...transitionRange);
      const max = Math.max(...transitionRange);
      const t = computeOpacity(transitionRange);

      let normalizedDepth = currentDepth;
      if (scaleProgress >= min) normalizedDepth += 1;

      if (normalizedDepthRef.current !== normalizedDepth) {
        normalizedDepthRef.current = normalizedDepth;

        const normalizedSection = sectionDepthMapRef.current.get(normalizedDepth);
        setNormalizedSection(normalizedSection);
      }
  
      if (direction === "in") {
        if (scaleProgress > max) {
          currentDepthRef.current = Math.min(
            currentDepth + 1,
            sectionDepthMapRef.current.size - 1
          );
        }
      }
      else if (direction === "out") {
        if (scaleProgress < min) {
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
      if (scaleProgress < Math.min(...transitionRange!)) {
        const angle = getAngle();

        const leftOrRightId = angle === "left"
          ? BRAIN_AREA_IDS.left
          : BRAIN_AREA_IDS.right;
        const leftOrRightSection = resolveSection(leftOrRightId, { scalar: 0.5 });
        if (leftOrRightSection) {
          advanceToNextDepth(leftOrRightSection, [6.50, 6.80]);
        }
      }
    }

    if (currentSection.kind === "node") {
      setNextNodeSection();
    }
  };

  const updateTextObject = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    
    const normalizedDepth = normalizedDepthRef.current;
    const normalizedSection = sectionDepthMapRef.current.get(normalizedDepth);
    if (!normalizedSection || normalizedSection.kind !== "node") return;

    const prevTransitionRange = transitionRangeDepthMapRef.current.get(normalizedDepth - 1);
    const currentTransitionRange = transitionRangeDepthMapRef.current.get(normalizedDepth);
    if (!prevTransitionRange || !currentTransitionRange) return;

    const scaleProgress = scaleProgressRef.current;

    const minScaleProgress = Math.min(...prevTransitionRange);
    const maxScaleProgress = Math.min(...currentTransitionRange);

    const maxProcess = (maxScaleProgress - minScaleProgress);
    const process = (scaleProgress - minScaleProgress) / maxProcess;

    const inverseProcess = 1 - process;
    const isInteractive = inverseProcess > 0.25;

    normalizedSection.group.traverse(obj => {
      if (!(obj instanceof THREE.Mesh) || !obj.userData.textObject) return;

      const placeholder: THREE.Object3D = obj.userData.placeholder;
      const textObject: CSS3DObject = obj.userData.textObject;

      textObject.element.style.pointerEvents = isInteractive ? "auto" : "none";
      textObject.element.style.setProperty("--inverseProcess", inverseProcess.toString());

      placeholder.quaternion.copy(camera.quaternion);
    });
  };

  const updateWorldGroupPosition = () => {
    const normalizedDepth = normalizedDepthRef.current;

    const prevSection = sectionDepthMapRef.current.get(normalizedDepth - 1)
    const currentSection = sectionDepthMapRef.current.get(normalizedDepth);
    if (!prevSection || !currentSection) return;

    const prevTransitionRange = transitionRangeDepthMapRef.current.get(normalizedDepth - 1);
    const currentTransitionRange = transitionRangeDepthMapRef.current.get(normalizedDepth);
    if (!prevTransitionRange || !currentTransitionRange) return;

    const prevTargetPosition = targetPositionIdMapRef.current.get(prevSection.id);
    const currentTargetPosition = targetPositionIdMapRef.current.get(currentSection.id);

    const scaleProgress = scaleProgressRef.current;

    const minScaleProgress = Math.min(...prevTransitionRange);
    const maxScaleProgress = Math.min(...currentTransitionRange);

    const maxProcess = (maxScaleProgress - minScaleProgress) * 0.5;
    const process = (scaleProgress - minScaleProgress) / maxProcess;

    let from = centerVector.clone();
    let to = centerVector.clone();

    if (!prevTargetPosition && currentTargetPosition) {
      to = currentTargetPosition.clone();
    }
    else if (prevTargetPosition && !currentTargetPosition) {
      from = prevTargetPosition.clone();
      to = prevTargetPosition.clone();
    }
    else if (prevTargetPosition && currentTargetPosition) {
      from = prevTargetPosition.clone();
      to = currentTargetPosition.clone();
    }

    const t = THREE.MathUtils.clamp(process, 0, 1);
    worldGroupPositionRef.current.target.copy(
      from.clone().lerp(to, t)
    );
  };

  const handleStartExplore = () => {
    if (showSplashImage) return;
    setShowSplashImage(true);

    window.addEventListener("wheel", handleWheel, { passive: false });

    window.addEventListener("pointerdown", handlePointerDown, { passive: false });
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);

    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleWheel = (event: WheelEvent) => {
    if (isChasingTarget.current) return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (nodeCardRef.current?.contains(target)) return;

    const worldGroup = worldGroupRef.current;
    if (!worldGroup) return;
    event.preventDefault();

    const deltaY = -event.deltaY
    let delta = Math.sign(deltaY);

    const trackPadMax = 40;
    if (Math.abs(deltaY) < trackPadMax) {
      const limitedDeltaY = THREE.MathUtils.clamp(deltaY, -1.5, 2);
      delta = limitedDeltaY / 2;
    }
    
    const currentScale = worldGroupScaleRef.current.current;
    const scaleFactor = currentScale / START_SCALE;
    
    const normalizedDelta = delta * scaleFactor * ZOOM_SENSITIVITY;
    worldGroupScaleRef.current.target = THREE.MathUtils.clamp(
      worldGroupScaleRef.current.target + normalizedDelta,
      MIN_SCALE,
      MAX_SCALE
    );
  };

  const handlePointerDown = (event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (nodeCardRef.current?.contains(target)) return;

    if (isZoomingRef.current) return;
    event.preventDefault();

    pointerData.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (isZoomingRef.current || isProgressBarRef.current) return;
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
    isProgressBarRef.current = false;
    pointerData.current = { x: null, y: null };
  };

  const handleTouchStart = (event: TouchEvent) => {
    const touches = event.touches;
    if (touches.length === 2) {
      event.preventDefault();
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
      CAMERA_FOV,
      width / height,
      CAMERA_NEAR,
      CAMERA_FAR
    );
    camera.position.z = CAEMRA_POSITION;

    const pixelRatio = Math.min(window.devicePixelRatio, 2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(pixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(width, height);
    cssRenderer.domElement.style.position = "absolute";
    cssRenderer.domElement.style.top = "0";
    cssRenderer.domElement.style.pointerEvents = "none";
    mountRef.current.appendChild(cssRenderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambientLight);

    const setInitialSections = ({
      humanModel,
      brainModel,
      milkywayModel
    }: {
      humanModel: THREE.Group,
      brainModel: THREE.Group,
      milkywayModel: THREE.Group
    }) => {
      const humanSection = createModelSection(MODEL_IDS.human, humanModel, modelsTransformAttr.idHuman);
      const brainSection = createModelSection(MODEL_IDS.brain, brainModel, modelsTransformAttr.idBrain);
      const milkywaySection = createModelSection(MODEL_IDS.milkyway, milkywayModel, modelsTransformAttr.idMilkyway);

      sectionDepthMapRef.current.set(0, humanSection);
      sectionDepthMapRef.current.set(1, brainSection);

      currentSectionRef.current = humanSection;
      setNormalizedSection(humanSection);

      setSectionOpacity(humanSection, 1);
      setSectionOpacity(milkywaySection, 1);
    };

    const loadModels = async () => {
      try {
        const loader = new GLTFLoader();
        const [humanModel, brainModel, milkywayModel] = await Promise.all([
          loadHumanModel({ loader }),
          loadBrainModel({ loader }),
          loadMilkywayModel({ loader })
        ]);

        setInitialSections({ humanModel, brainModel, milkywayModel });
      }
      catch (error) {
        console.error(error);
      }
    };
    loadModels();

    worldGroupRef.current.add(sectionsRootRef.current);
    scene.add(worldGroupRef.current);

    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      cssRenderer.setSize(width, height);
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

      if (isChasingTarget.current) {
        const currentLog = Math.log(worldGroupScaleRef.current.current / START_SCALE);
        const targetLog = Math.log(worldGroupScaleRef.current.target / START_SCALE);

        const diff = targetLog - currentLog;
        const step = CHASING_LOG_SPEED * Math.sign(diff);

        const nextLog = Math.abs(step) > Math.abs(diff)
          ? targetLog
          : currentLog + step;

        worldGroupScaleRef.current.current = START_SCALE * Math.exp(nextLog);
      }
      else {
        worldGroupScaleRef.current.current = THREE.MathUtils.lerp(
          worldGroupScaleRef.current.current,
          worldGroupScaleRef.current.target,
          ZOOM_SPEED
        );
      }
      worldGroupRef.current.scale.setScalar(worldGroupScaleRef.current.current);

      updateSection();
      updateTextObject();
      updateWorldGroupPosition();

      if (isChasingTarget.current) {
        worldGroupPositionRef.current.current = worldGroupPositionRef.current.current.lerp(
          worldGroupPositionRef.current.target,
          MOVE_SPEED
        );

        const offset = worldGroupPositionRef.current.current
          .distanceTo(worldGroupPositionRef.current.target);
        const logicalEpsilon = 1 / Math.max(worldGroupScaleRef.current.current, 0.001);

        if (offset < logicalEpsilon) {
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
      worldGroupRef.current.position.copy(
        worldGroupPositionRef.current.current
          .clone()
          .multiplyScalar(-worldGroupScaleRef.current.current)
      );

      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
    };
    animate();

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      if (mountRef.current) {
        window.removeEventListener("wheel", handleWheel);

        window.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);

        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      }
      if (rendererRef.current && mountRef.current?.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    }
  }, []);

  return (
    <React.Fragment>
      <Head>
        <title>Hyunwoo AI</title>
      </Head>
      <SplashImage show={showSplashImage} />
      <OntologyNavigator tree={tree} currentSectionId={normalizedSection?.id} back={backPreviousSection} push={pushNextSection} />
      <ChatBox isToggled={isToggleChatBox} />
      <div className={clsx(styles.socialContainer)}>
        <div onClick={() => window.open("https://github.com/hwk06023", "_blank")}>
          <Image src={githubIcon.src} alt={githubIcon.alt} />
        </div>
      </div>
      <div className={clsx(styles.chatContainer)}>
        {/* <div>
          <Image src={videoIcon.src} alt={videoIcon.alt} />
        </div> */}
        <div onClick={() => setIsToggleChatBox(!isToggleChatBox)}>
          <Image src={chatIcon.src} alt={chatIcon.alt} />
        </div>
      </div>
      <div ref={mountRef} className={clsx(styles.fullScreen)} />
      <NodeCard ref={nodeCardRef} tree={tree} section={normalizedSection} onFirstClick={handleStartExplore} />
    </React.Fragment>
  );
};

export default Main;