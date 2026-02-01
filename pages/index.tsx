import { EnergyHandleLeft, EnergyHandleRight, EnergyHandleTop, SplashOverlay } from "@/components";
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
import { CSS3DRenderer, GLTFLoader } from "three/examples/jsm/Addons.js";

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
  },
  idMilkyway: {
    sizeRatio: 50,
    posXRatio: 0,
    posYRatio: 0,
    posZRatio: 0,
  }
};

const DEFAULT_NODE: Tree = {
  treeId: "Hyunwoo AI",
  nodeId: "Hyunwoo AI",
  name: "Hyunwoo AI",
  desc: [
    "Explore and Get to know, Hyunwoo AI.",
    "",
    "1. Angular nodes hold hidden paths. Smooth nodes are complete.",
    "2. Energy cores are active above and at your sides.",
    "3. Deactivate the upper core to begin your journey."
  ].join("\n"),
  tags: [],
  children: []
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
const CHASING_LOG_SPEED = 1.35;

const START_SCALE = 1;
const MIN_SCALE = 0.1;
const MAX_SCALE = Infinity;

const NODE_SECTION_RATIO = 0.01;

const BASE_SCALE = 1.0;
const HOVER_SCALE = 3.5;

const Main = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const descViewerRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const isZoomingRef = useRef<boolean>(false);
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

  const worldGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sectionsRootRef = useRef<THREE.Group>(new THREE.Group());

  const sectionByIdRef = useRef<Map<SectionId, Section>>(new Map());
  const sectionByDepthRef = useRef<Map<Depth, Section>>(new Map());

  const currentSectionRef = useRef<Section | undefined>(undefined);
  const [normalizedSection, setNormalizedSection] = useState<Section | undefined>(undefined);
  const [normalizedNode, setNormalizedNode] = useState<Tree>(DEFAULT_NODE);

  const targetNodeByIdRef = useRef<Map<SectionId, Tree>>(new Map());
  const targetPositionByIdRef = useRef<Map<SectionId, THREE.Vector3>>(new Map());

  const isChasingTargetRef = useRef<boolean>(false);
  const intentDirectionRef = useRef<"left" | "right" | undefined>(undefined);

  const prevDepthRef = useRef<number>(0);
  const currentDepthRef = useRef<number>(0);
  const normalizedDepthRef = useRef<number>(0);

  const scaleProgressRef = useRef<number>(0);

  const transitionRangeByDepthRef = useRef<Map<number, [number, number]>>(new Map([
    [0, [1.80, 2.00]],
    [1, [2.40, 2.75]]
  ]));
  
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseNDCRef = useRef<THREE.Vector2>(new THREE.Vector2());
  
  const currentMeshesRef = useRef<THREE.Mesh[]>([]);
  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);
  const pressedMeshRef = useRef<THREE.Mesh | null>(null);

  const lastTimeRef = useRef<number>(performance.now());

  const [tree, setTree] = useState<Tree[]>([]);
  const treeRef = useRef<Tree[]>([]);

  const [showSplashOverlay, setshowSplashOverlay] = useState<boolean>(false);

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

    sectionByIdRef.current.set(id, section);
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

    const generateTextTexture = (text: string) => {
      const DPR = Math.min(window.devicePixelRatio, 2);

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;

      const fontSize = 32;
      const paddingX = 8;
      const paddingY = 8;

      context.font = `${fontSize}px Noto Sans KR`;
      const metrics = context.measureText(text);

      const width = Math.ceil(metrics.width + paddingX * 2);
      const height = Math.ceil(fontSize + paddingY * 2);

      canvas.width = width * DPR;
      canvas.height = height * DPR;

      context.scale(DPR, DPR);
      context.font = `${fontSize}px Noto Sans KR`;
      context.textBaseline = "middle";
      context.fillStyle = "white";

      context.fillText(text, paddingX, height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;

      return { texture, width, height };
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

      const { texture, width, height } = generateTextTexture(c.name);

      const aspect = width / height;
      const textHeight = 2.0;
      const textWidth = textHeight * aspect;

      const textGeometry = new THREE.PlaneGeometry(textWidth, textHeight);
      const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
      });

      textGeometry.computeBoundingBox();
      const box = textGeometry.boundingBox!;

      textGeometry.translate(-box.min.x, 0, 0);

      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(
        geometry.parameters.radius + 0.75,
        0,
        0
      );

      textMesh.userData.isLabel = true;
      textMesh.userData.ownerMesh = mesh;

      const placeholder = new THREE.Object3D();

      placeholder.add(textMesh);
      placeholder.position.copy(meshPosition);

      mesh.userData.isNodeMesh = true;
      mesh.userData.textMesh = textMesh;
      mesh.userData.placeholder = placeholder;
      
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

    const maxScale = Math.max(...transitionRangeByDepthRef.current.get(depth)!);
    const scaleFactor = START_SCALE / maxScale;
    const normalizedScale = scalar * scaleFactor;

    section.group.scale.setScalar(normalizedScale);
    section.group.visible = false;
    section.group.renderOrder = -depth;

    if (position) section.group.position.copy(position.clone());

    sectionByIdRef.current.set(sectionId, section);
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
    const section = sectionByIdRef.current.get(sectionId);
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

    for (const depth of Array.from(sectionByDepthRef.current.keys())) {
      if (depth >= nextDepth + 1) {
        sectionByDepthRef.current.delete(depth);
      }
    }
    for (const depth of Array.from(transitionRangeByDepthRef.current.keys())) {
      if (depth >= nextDepth + 1) {
        transitionRangeByDepthRef.current.delete(depth);
      }
    }

    sectionByDepthRef.current.set(nextDepth, section);
    transitionRangeByDepthRef.current.set(nextDepth, transitionRange);
  };

  const setNextNodeSection = () => {
    const normalizedDepth = normalizedDepthRef.current;
    const normalizedSection = sectionByDepthRef.current.get(normalizedDepth);
    if (!normalizedSection) return;

    const targetNode = targetNodeByIdRef.current.get(normalizedSection.id);
    if (!targetNode) return;

    const targetPosition = targetPositionByIdRef.current.get(normalizedSection.id);
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
        if (child.userData.isLabel) return;

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
    const normalizedSection = sectionByDepthRef.current.get(normalizedDepth);
    if (!normalizedSection) return;

    const sectionId = normalizedSection.id;
    const nodeId = mesh.name;

    const meshWorldPos = new THREE.Vector3();
    mesh.getWorldPosition(meshWorldPos);

    meshWorldPos.sub(worldGroupRef.current.position);

    const meshNode = treeUtils.getNode(treeRef.current, nodeId);
    targetNodeByIdRef.current.set(sectionId, meshNode!);

    const normalizedPosition = meshWorldPos
      .clone()
      .divideScalar(worldGroupScaleRef.current.current);

    targetPositionByIdRef.current.set(sectionId, normalizedPosition);

    const { rangeEnd } = computeNextTransitionRange(normalizedDepth - 1);
    const margin = 0.15;

    const targetLog = rangeEnd + margin;
    worldGroupScaleRef.current.target = START_SCALE * Math.exp(targetLog);

    setNextNodeSection();
    isChasingTargetRef.current = true;
  };

  const backPreviousSection = () => {
    const normalizedDepth = normalizedDepthRef.current;

    const prevTransitionRange = transitionRangeByDepthRef.current.get(normalizedDepth - 1);
    if (!prevTransitionRange) return;

    const rangeStart = Math.min(...prevTransitionRange);
    const margin = 0.15;

    const targetLog = rangeStart - margin;
    worldGroupScaleRef.current.target = START_SCALE * Math.exp(targetLog);
  };

  const pushNextSection = (node: Tree) => {
    const normalizedDepth = normalizedDepthRef.current;
    const normalizedSection = sectionByDepthRef.current.get(normalizedDepth);
    if (!normalizedSection) return;

    const mesh = normalizedSection.group.getObjectByName(node.nodeId) as THREE.Mesh;
    if (!mesh) {
      const nextTransitionRange = transitionRangeByDepthRef.current.get(normalizedDepth);
      if (!nextTransitionRange) return;
      
      const rangeEnd = Math.max(...nextTransitionRange);
      const margin = 0.05;
      
      const targetLog = rangeEnd + margin;
      worldGroupScaleRef.current.target = START_SCALE * Math.exp(targetLog);

      if (node.nodeId === BRAIN_AREA_IDS.left) {
        cameraRotationRef.current.target.theta = -(Math.PI / 10);
        intentDirectionRef.current = "left";
      }
      else if (node.nodeId === BRAIN_AREA_IDS.right) {
        cameraRotationRef.current.target.theta = (Math.PI / 10);
        intentDirectionRef.current = "right";
      }

      isChasingTargetRef.current = true;
      return;
    }

    setSectionTarget(mesh);
  };

  const onSectionEnter = (depth: Depth) => {
    const enteredSection = sectionByDepthRef.current.get(depth)!;
    currentSectionRef.current = enteredSection;
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

    const transitionRange = transitionRangeByDepthRef.current.get(currentDepth) ?? undefined;
    if (transitionRange) {
      const min = Math.min(...transitionRange);
      const max = Math.max(...transitionRange);
      const t = computeOpacity(transitionRange);

      let normalizedDepth = currentDepth;
      if (scaleProgress >= min) normalizedDepth += 1;

      if (normalizedDepthRef.current !== normalizedDepth) {
        normalizedDepthRef.current = normalizedDepth;
        
        const normalizedSection = sectionByDepthRef.current.get(normalizedDepth);
        if (!normalizedSection) return;

        currentMeshesRef.current = [];
        normalizedSection.group.traverse(obj => {
          if (!(obj instanceof THREE.Mesh) || !obj.userData.textMesh) return;
          currentMeshesRef.current.push(obj);
        });

        setNormalizedSection(normalizedSection);
      }
  
      if (direction === "in") {
        if (scaleProgress > max) {
          currentDepthRef.current = Math.min(
            currentDepth + 1,
            sectionByDepthRef.current.size - 1
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
      
      const nextSection = sectionByDepthRef.current.get(currentDepth + 1);
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
        const angle: "left" | "right" = intentDirectionRef.current ?? getAngle();

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

  const updateTextMesh = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    
    const normalizedDepth = normalizedDepthRef.current;
    const normalizedSection = sectionByDepthRef.current.get(normalizedDepth);
    if (!normalizedSection || normalizedSection.kind !== "node") return;

    const prevTransitionRange = transitionRangeByDepthRef.current.get(normalizedDepth - 1);
    const currentTransitionRange = transitionRangeByDepthRef.current.get(normalizedDepth);
    if (!prevTransitionRange || !currentTransitionRange) return;

    const scaleProgress = scaleProgressRef.current;

    const minScaleProgress = Math.min(...prevTransitionRange);
    const maxScaleProgress = Math.min(...currentTransitionRange);

    const maxProcess = (maxScaleProgress - minScaleProgress);
    const process = (scaleProgress - minScaleProgress) / maxProcess;

    const inverseProcess = 1 - process;

    currentMeshesRef.current.forEach(m => {
      const placeholder: THREE.Object3D = m.userData.placeholder;
        const textMesh: THREE.Mesh = m.userData.textMesh;
  
        placeholder.quaternion.copy(camera.quaternion);
  
        const opacity = THREE.MathUtils.clamp(
          (inverseProcess - 0.25) / 0.25,
          0,
          1
        );
  
        const material = textMesh.material as THREE.MeshBasicMaterial;
        material.opacity = opacity;
        material.transparent = true;
  
        textMesh.visible = opacity > 0.001;
    });
  };

  const updateWorldGroupPosition = () => {
    const normalizedDepth = normalizedDepthRef.current;

    const prevSection = sectionByDepthRef.current.get(normalizedDepth - 1)
    const currentSection = sectionByDepthRef.current.get(normalizedDepth);
    if (!prevSection || !currentSection) return;

    const prevTransitionRange = transitionRangeByDepthRef.current.get(normalizedDepth - 1);
    const currentTransitionRange = transitionRangeByDepthRef.current.get(normalizedDepth);
    if (!prevTransitionRange || !currentTransitionRange) return;

    const prevTargetPosition = targetPositionByIdRef.current.get(prevSection.id);
    const currentTargetPosition = targetPositionByIdRef.current.get(currentSection.id);

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

  const updateRaycast = () => {
    const camera = cameraRef.current;
    if (!camera) return;

    raycasterRef.current.setFromCamera(
      mouseNDCRef.current,
      camera
    );

    const candidates: THREE.Object3D[] = [];
    currentMeshesRef.current.forEach(mesh => {
      if (mesh.visible) candidates.push(mesh);

      const textMesh = mesh.userData.textMesh as THREE.Mesh | undefined;
      if (textMesh?.visible) candidates.push(textMesh);
    });
    
    const intersects = raycasterRef.current.intersectObjects(candidates, false);

    const prevHovered = hoveredMeshRef.current;
    let nextHovered: THREE.Mesh | null = null;

    if (intersects.length > 0) {
      const object = intersects[0].object as THREE.Mesh;

      if (object.userData.isLabel) {
        nextHovered = object.userData.ownerMesh;
      }
      else if (object.userData.isNodeMesh) {
        nextHovered = object;
      }
    }

    if (prevHovered !== nextHovered) {
      hoveredMeshRef.current = nextHovered;
      document.body.style.cursor = nextHovered
        ? "pointer"
        : "default";
    }
  };

  const updateMeshScale = () => {
    const candidates = currentMeshesRef.current
      .map(m => m.userData.textMesh as THREE.Mesh)
      .filter(m => m.visible);
    
    for (const label of candidates) {
      const ownerMesh = label.userData.ownerMesh as THREE.Mesh;
      const target = ownerMesh === hoveredMeshRef.current
        ? HOVER_SCALE
        : BASE_SCALE;

      label.scale.lerp(
        new THREE.Vector3(target, target, target),
        0.15
      );
    }
  };

  const updateMouseNDCFromClient = (clientX: number, clientY: number) => {
    if (!rendererRef.current) return;
    const rect = rendererRef.current.domElement.getBoundingClientRect();

    mouseNDCRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDCRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  };

  const handleStartExplore = () => {
    if (showSplashOverlay) return;
    setshowSplashOverlay(true);

    window.addEventListener("wheel", handleWheel, { passive: false });

    window.addEventListener("pointerdown", handlePointerDown, { passive: false });
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);

    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  };

  const pickByNDC = (): THREE.Mesh | null => {
    const camera = cameraRef.current;
    if (!camera) return null;

    raycasterRef.current.setFromCamera(
      mouseNDCRef.current,
      camera
    );

    const candidates: THREE.Object3D[] = [];
    currentMeshesRef.current.forEach(mesh => {
      if (mesh.visible) candidates.push(mesh);

      const textMesh = mesh.userData.textMesh as THREE.Mesh | undefined;
      if (textMesh?.visible) candidates.push(textMesh);
    });

    const intersects = raycasterRef.current.intersectObjects(candidates, false);
    if (intersects.length === 0) return null;

    const object = intersects[0].object as THREE.Mesh;
    
    if (object.userData.isLabel) {
      return object.userData.ownerMesh ?? null;
    }

    if (object.userData.isNodeMesh) {
      return object;
    }

    return null;
  };

  const handleWheel = (event: WheelEvent) => {
    if (isChasingTargetRef.current) return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (descViewerRef.current?.contains(target)) return;

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
    if (descViewerRef.current?.contains(target)) return;

    if (isZoomingRef.current) return;
    event.preventDefault();

    updateMouseNDCFromClient(event.clientX, event.clientY);
    pressedMeshRef.current = pickByNDC();

    pointerData.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: PointerEvent) => {
    updateMouseNDCFromClient(event.clientX, event.clientY);
    
    if (isZoomingRef.current) return;
    else if (pointerData.current.x === null || pointerData.current.y === null) return;
    event.preventDefault();

    pressedMeshRef.current = null;

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

    const mesh = pressedMeshRef.current;
    if (!mesh) return;

    pressedMeshRef.current = null;
    setSectionTarget(mesh);
  };

  const handleTouchStart = (event: TouchEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (descViewerRef.current?.contains(target)) return;

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
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (descViewerRef.current?.contains(target)) return;

    const worldGroup = worldGroupRef.current;
    if (!worldGroup) return;
    event.preventDefault();

    const touches = event.touches;
    if (event.touches.length === 2 && touchData.current.prevDistance) {
      pressedMeshRef.current = null;

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
    if (tree.length === 0 || !normalizedSection) return;
    isChasingTargetRef.current = false;
    intentDirectionRef.current = undefined;

    const normalizedNode = treeUtils.getNode(tree, normalizedSection.id);
    setNormalizedNode(normalizedNode ?? DEFAULT_NODE);
  }, [tree, normalizedSection]);

  useEffect(() => {
    if (tree.length === 0) return;

    treeRef.current = tree;
    normalizedNode.children.push(tree[0]);
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

      sectionByDepthRef.current.set(0, humanSection);
      sectionByDepthRef.current.set(1, brainSection);

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
    
    const animate = (time: number) => {
      if (!isMounted) return;
      requestAnimationFrame(animate);

      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

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

      if (isChasingTargetRef.current) {
        const currentLog = Math.log(worldGroupScaleRef.current.current / START_SCALE);
        const targetLog = Math.log(worldGroupScaleRef.current.target / START_SCALE);

        const diff = targetLog - currentLog;
        const step = CHASING_LOG_SPEED * deltaTime * Math.sign(diff);

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
      updateTextMesh();
      updateWorldGroupPosition();

      if (isChasingTargetRef.current) {
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

      updateRaycast();
      updateMeshScale();

      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
    };
    requestAnimationFrame(animate);

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
      <div ref={mountRef} className={clsx(styles.fullScreen)} />
      <SplashOverlay show={showSplashOverlay} />
      <div className={clsx(styles.nodeName)}>
        <p>{ normalizedNode?.name }</p>
      </div>
      <div className={clsx(styles.socialContainer)}>
        <div onClick={() => window.open("https://github.com/hwk06023", "_blank")}>
          <Image src={githubIcon.src} alt={githubIcon.alt} />
        </div>
      </div>
      <EnergyHandleLeft node={normalizedNode} back={backPreviousSection} push={pushNextSection} />
      <EnergyHandleRight />
      <EnergyHandleTop ref={descViewerRef} tree={tree} node={normalizedNode} onFirstClick={handleStartExplore} />
    </React.Fragment>
  );
};

export default Main;