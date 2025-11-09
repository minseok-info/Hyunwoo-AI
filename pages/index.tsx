import { SplashScreen, ZoomProgressBar } from "@/components";
import styles from "@/styles/home.module.css";
import Head from "next/head";
import Image from "next/image";
import { PointerEvent, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer, GLTFLoader, OrbitControls, RenderPass, UnrealBloomPass } from "three/examples/jsm/Addons.js";

const githubIcon = {
  src: require("@/public/icons/github.svg"),
  alt: "githubIcon",
}

const Home = () => {
  type ItemType = {
    id?: number,
    title: string,
    content: string,
  }
  type MeshInfo = {
    mesh: THREE.Mesh,
    data: DataType,
  }
  type GroupInfo = MeshInfo & {
    position: THREE.Vector3,
    velocity: THREE.Vector3,
  }

  type DataType = { type: "leftNeuron" | "rightNeuron" } & ItemType
  type ModelType = THREE.Object3D | null

  const [siteReady, setSiteReady] = useState<boolean>(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);

  const spaceModelRef = useRef<ModelType>(null);
  const humanModelRef = useRef<ModelType>(null);
  const brainModelRef = useRef<ModelType>(null);
  const planetModelRef = useRef<ModelType>(null);

  const brainModelCenterRef = useRef<number>(0);
  const brainPosition = useRef<"left" | "right" | null>(null);

  const centerVector = new THREE.Vector3(0, 0, 0);
  const leftBrainVector = new THREE.Vector3(-3000, 0, 0);
  const rightBrainVector = new THREE.Vector3(3000, 0, 0);

  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.Camera>();
  const orbitControlsRef = useRef<OrbitControls>();

  const cameraTargetRef = useRef<THREE.Vector3>(centerVector);

  const isZoomingRef = useRef<boolean>(false);
  const explorationModeRef = useRef<boolean>(false);

  const zoomListenerRef = useRef<() => void>();
  const intersectTargetZoomListenerRef = useRef<() => void>();

  const downIntersectRef = useRef<THREE.Mesh | null>(null);
  const intersectTargetRef = useRef<THREE.Mesh | null>(null);

  const leftGroupInfosRef = useRef<GroupInfo[]>([]);
  const rightGroupInfosRef = useRef<GroupInfo[]>([]);

  const leftLinesRef = useRef<THREE.LineSegments | null>(null);
  const rightLinesRef = useRef<THREE.LineSegments | null>(null);

  const deepPhaseObjects = useRef<(THREE.DirectionalLight | THREE.Mesh | THREE.Mesh[])[]>([]);

  const [data, setData] = useState<DataType[]>([]);
  const [title, setTitle] = useState<string>("Hyunwoo Kim");

  const zoom = {
    speed: 0.5,
    minDistance: 0,
    maxDistance: 400000,
    startDistance: 125000,
  }
  const [zoomDistance, setZoomDistance] = useState<number>(zoom.startDistance);

  const modelSizes = {
    space: 5000,
    human: 1500,
    brain: 17500,
    planet: 75,
  }

  const group = {
    maxDistance: 3000,
    minSize: 250,
    maxSize: 300,
    minSpeed: 0.15,
    maxSpeed: 0.25,
  }

  const loadSpaceModel = (
    loader: GLTFLoader,
    scene: THREE.Scene,
    ref: React.MutableRefObject<ModelType>
  ) => {
    loader.load("/models/space.glb", (gltf) => {
      const model = gltf.scene;
      const size = modelSizes.space;

      model.scale.set(size, size, size);

      ref.current = model;
      scene.add(ref.current);
    });
  }

  const loadHumanModel = (
    loader: GLTFLoader,
    scene: THREE.Scene,
    ref: React.MutableRefObject<ModelType>
  ) => {
    loader.load("/models/human.glb", (gltf) => {
      const model = gltf.scene;
      const size = modelSizes.human;

      model.scale.set(size, size, size);
      model.position.set(0, -235000, 5000);

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;

          const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 15);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 1,
            linewidth: 1,
          });
          const lineSegments = new THREE.LineSegments(edgesGeometry, lineMaterial);
          mesh.add(lineSegments);

          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            const m = mat as THREE.MeshStandardMaterial;
            m.color.set(new THREE.Color(1, 1, 1));

            if (m.roughness === undefined) m.roughness = 0.5;
            if (m.metalness === undefined) m.metalness = 0.5;
            m.needsUpdate = true;
          });
        }
      });

      ref.current = model;
      scene.add(ref.current);
    });
  }

  const loadBrainModel = (
    loader: GLTFLoader,
    scene: THREE.Scene,
    ref: React.MutableRefObject<ModelType>
  ) => {
    loader.load("/models/brain.glb", (gltf) => {
      const model = gltf.scene;
      const size = modelSizes.brain;

      model.scale.set(size, size, size);
      model.rotation.set(0, (Math.PI - 0.4), 0);
      model.position.set(0, -2500, 0);

      const centerOffset = -229.219;
      const modelBox = new THREE.Box3().setFromObject(model);
      const modelCenter = (modelBox.min.x + modelBox.max.x) / 2 + centerOffset;
      brainModelCenterRef.current = modelCenter;

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          
          mesh.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.25,
            metalness: 0.25,
          });

          const geometry = mesh.geometry as THREE.BufferGeometry;
          const position = geometry.attributes.position;
          let color = geometry.attributes.color as THREE.BufferAttribute;

          if (!color) {
            color = new THREE.BufferAttribute(new Float32Array(position.count * 3), 3);
            geometry.setAttribute("color", color);
          }

          for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);

            if (x < modelCenter) color.setXYZ(i, 0.8, 0.139, 0.139);
            else color.setXYZ(i, 0.139, 0.139, 0.8);
          }
          color.needsUpdate = true;
        }
      });

      ref.current = model;
      scene.add(ref.current);
    });
  }

  const loadPlanetModel = (
    loader: GLTFLoader,
    scene: THREE.Scene,
    ref: React.MutableRefObject<ModelType>
  ) => {
    loader.load("/models/planet.glb", (gltf) => {
      const model = gltf.scene;
      const size = modelSizes.planet;

      model.scale.set(size, size, size);

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.visible = false;
        }
      });

      ref.current = model;
      scene.add(ref.current);
    });
  }

  const createTextSprite = (text: string, scale = 1024, fontSize = 64, color = "#ffffff") => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;

    context.font = `${fontSize}px Arial`;
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    const size = Math.pow(2, Math.ceil(Math.log2(Math.max(textWidth, textHeight))));
    canvas.width = size;
    canvas.height = size;

    context.font = `${fontSize}px Arial`;
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(scale, scale, scale);
    sprite.raycast = () => {};
    return sprite;
  }

  const createGroups = (scene: THREE.Scene, vector: THREE.Vector3, groups: DataType[]) => {
    if (groups.length < 1) return;

    const isLeft = vector === leftBrainVector;
    const groupInfosRef = isLeft ? leftGroupInfosRef : rightGroupInfosRef;
    groupInfosRef.current = [];

    const maxDistance = group.maxDistance;
    const minSize = group.minSize;
    const maxSize = group.maxSize;
    const minSpeed = group.minSpeed;
    const maxSpeed = group.maxSpeed;

    groups.forEach((g, index) => {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * maxDistance;

      const x = r * Math.sin(phi) * Math.cos(theta) + vector.x;
      const y = r * Math.sin(phi) * Math.sin(theta) + vector.y;
      const z = r * Math.cos(phi) + vector.z;

      const radius = minSize + Math.random() * (maxSize - minSize);

      const velocity = new THREE.Vector3(
        minSpeed + (Math.random() - 0.5) * (maxSpeed - minSpeed),
        minSpeed + (Math.random() - 0.5) * (maxSpeed - minSpeed),
        minSpeed + (Math.random() - 0.5) * (maxSpeed - minSpeed)
      );

      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(Math.random() * 0.8, Math.random() * 0.8, Math.random() * 0.8),
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${isLeft ? "left" : "right"}Group${index}`;
      mesh.position.set(x, y, z);

      const sprite = createTextSprite(g.title);
      sprite.position.set(0, radius + 100, 0);
      mesh.add(sprite);

      mesh.visible = false;
      scene.add(mesh);

      groupInfosRef.current.push({
        mesh: mesh,
        data: g,
        position: new THREE.Vector3(x, y, z),
        velocity: velocity,
      });
    });
  };

  const connectGroup = (scene: THREE.Scene, groups: MeshInfo[]) => {
    if (groups.length < 1) return null;

    const points: THREE.Vector3[] = [];
    const connected = new Set<THREE.Mesh>();

    groups.forEach(g => {
      const centerPos = g.mesh.position;
      let minDistance = Infinity;
      let closestPos: THREE.Vector3 | null = null;

      groups.forEach(cand => {
        if (cand.mesh === g.mesh) return;
        else if (connected.has(cand.mesh)) return;

        const candPos = cand.mesh.position;
        const distance = centerPos.distanceTo(candPos);
        if (distance < minDistance) {
          minDistance = distance;
          closestPos = candPos;
        }
      });

      if (closestPos) {
        points.push(centerPos.clone(), (closestPos as THREE.Vector3).clone());
        connected.add(g.mesh);
      }
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const lines = new THREE.LineSegments(geometry, material);
    lines.visible = false;
    scene.add(lines);
    return lines;
  };

  const createLight = ({ x, y, z }: THREE.Vector3) => {
    if (!sceneRef.current) return;

    const light = new THREE.DirectionalLight(0xffffff, 1);

    light.position.set(x + 50, y + 100, z + 75);
    light.target.position.set(x, y - 50, z);
    light.castShadow = true;

    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    const d = 300;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 1000;

    light.shadow.radius = 2;

    sceneRef.current.add(light);
    sceneRef.current.add(light.target);
    return light;
  }

  const createGround = ({ x, y, z }: THREE.Vector3) => {
    if (!sceneRef.current) return;

    const geometry = new THREE.BoxGeometry(300, 100, 300);
    const material = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 1,
      metalness: 0,
    });
    const ground = new THREE.Mesh(geometry, material);

    ground.position.set(x, y - 100, z);
    ground.receiveShadow = true;

    sceneRef.current.add(ground);
    return ground;
  }

  const createHenges = ({ x, y, z }: THREE.Vector3) => {
    if (!sceneRef.current) return;

    const henges = [];

    const count = 10;
    const groundTop = y - 50;

    const minRadius = 75;
    const maxRadius = 120;

    const minWidth = 25;
    const maxWidth = 50;

    const minHeight = 35;
    const maxHeight = 150;

    const minDepth = 7.5;
    const maxDepth = 15;

    const glowColor = 0xf4f4f4;
    const colorMap = [0x111111, 0x333333, 0x555555, glowColor];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);

      const width = minWidth + Math.random() * (maxWidth - minWidth);
      const height = minHeight + Math.random() * (maxHeight - minHeight);
      const depth = minDepth + Math.random() * (maxDepth - minDepth);

      const posX = x + Math.cos(angle) * radius;
      const posZ = z + Math.sin(angle) * radius;
      const posY = groundTop + height / 2;

      const colorIndex = Math.floor(Math.random() * colorMap.length);

      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({
        color: colorMap[colorIndex],
        roughness: 1,
        metalness: 0,
      });
      const henge = new THREE.Mesh(geometry, material);

      henge.position.set(posX, posY, posZ);
      henge.lookAt(x, posY, z);

      henge.castShadow = true;
      henge.receiveShadow = true;

      sceneRef.current.add(henge);
      henges.push(henge);
    }

    console.log(henges);
    return henges;
  }

  const enterDeepPhase = (target: THREE.Mesh) => {
    const position = target.position;

    const light = createLight(position);
    const plane = createGround(position);
    const neurons = createHenges(position);

    if (light) deepPhaseObjects.current.push(light);
    if (plane) deepPhaseObjects.current.push(plane);
    if (neurons) deepPhaseObjects.current.push(neurons);
  }

  const leaveDeepPhase = () => {
    deepPhaseObjects.current.forEach(object => {
      if (Array.isArray(object)) {
        object.forEach(obj => {
          if (obj instanceof THREE.Mesh) {
            sceneRef.current!.remove(obj);
            obj.geometry.dispose();

            const material = Array.isArray(obj.material) ? obj.material : [obj.material];
            material.forEach(m => m.dispose());
          }
        });
      }
      else if (object instanceof THREE.DirectionalLight) {
        if (object.shadow.map) object.shadow.map.dispose();
        sceneRef.current!.remove(object);
      }
      else if (object instanceof THREE.Mesh) {
        sceneRef.current!.remove(object);
        object.geometry.dispose();

        const material = Array.isArray(object.material) ? object.material : [object.material];
        material.forEach(m => m.dispose());
      }
    });
  }

  const updateGroups = (groups: GroupInfo[], center: THREE.Vector3) => {
    groups.forEach(g => {
      const mesh = g.mesh;
      const uuid = mesh.uuid;
      const intersectedUuid = intersectTargetRef.current?.uuid;

      if (intersectedUuid && uuid === intersectedUuid) return;

      g.position.add(g.velocity);
      g.mesh.position.copy(g.position);

      if (g.position.distanceTo(center) > group.maxDistance) {
        const dirFromCenter = g.position.clone().sub(center).normalize();
        g.position.copy(dirFromCenter.multiplyScalar(group.maxDistance).add(center));
        g.velocity.multiplyScalar(-1);
      }
    });
  }

  const updateLines = (lines: THREE.LineSegments, groups: GroupInfo[]) => {
    const points: number[] = [];
    const connected = new Set<THREE.Mesh>();

    groups.forEach(g => {
      const centerPos = g.mesh.position;

      let minDistance = Infinity;
      let closestPos: THREE.Vector3 | null = null;

      groups.forEach(cand => {
        if (cand.mesh === g.mesh) return;
        else if (connected.has(cand.mesh)) return;

        const candPos = cand.mesh.position;
        const distance = centerPos.distanceTo(candPos);
        if (distance < minDistance) {
          minDistance = distance;
          closestPos = candPos;
        }
      });

      if (closestPos) {
        points.push(centerPos.x, centerPos.y, centerPos.z);
        points.push((closestPos as THREE.Vector3).x, (closestPos as THREE.Vector3).y, (closestPos as THREE.Vector3).z);
        connected.add(g.mesh);
      }
    });

    const geometry = lines.geometry as THREE.BufferGeometry;
    const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;

    positionAttr.array.set(points);
    positionAttr.needsUpdate = true;

    return lines;
  }

  const updateOpacityByDistance = (
    object: ModelType | THREE.Mesh[],
    distance: number,
    startDist: number,
    endDist: number,
    limit?: number
  ) => {
    if (!object) return;

    const t = THREE.MathUtils.clamp((distance - startDist) / (endDist - startDist), 0, 1);
    const opacity = limit ? (limit * t) : (1 - t);
    const [model, meshes] = [
      !Array.isArray(object) && (object as THREE.Object3D).isObject3D ? object as THREE.Object3D : null,
      Array.isArray(object) && (object[0] as THREE.Mesh).isMesh ? object as THREE.Mesh[] : null,
    ];

    if (model) {
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  
          materials.forEach((mat) => {
            const m = mat as THREE.MeshStandardMaterial & { opacity?: number; transparent?: boolean };
            m.opacity = opacity;
            m.transparent = opacity < 1;
            m.needsUpdate = true;
          });
  
          mesh.visible = opacity > 0;
        }
        else if ((child as THREE.LineSegments).isLineSegments) {
          const line = child as THREE.LineSegments;
          const m = line.material as any;
          const opacity = 1 - t;
  
          if (m) {
            m.opacity = opacity;
            m.transparent = opacity < 1;
            m.needsupdate = true;
          }
  
          m.visible = opacity > 0;
        }
      });
    }
    else if (meshes && meshes.length > 0) {
      meshes.forEach(mesh => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(mat => {
          const m = mat as THREE.MeshStandardMaterial;
          m.opacity = opacity;
          m.transparent = opacity < 1;
          m.needsUpdate = true;
        });

        mesh.visible = opacity > 0;
      });
    }
  }

  const changeColorByAngle = (
    model: ModelType,
    isLeft: boolean,
  ) => {
    if (!model) return;
    model.rotation.set(0, 0, 0);
    isLeft
      ? model.rotation.set(-1, 0.75, 0.5)
      : model.rotation.set(1, 0.75, -1.5);

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = Array.isArray(mesh.material)
          ? (mesh.material[0] as THREE.MeshStandardMaterial)
          : (mesh.material as THREE.MeshStandardMaterial);

        mat.emissive = isLeft
          ? new THREE.Color(1, 0.15, 0.15)
          : new THREE.Color(0.25, 0.25, 1);
      }
    });
  }

  const handleResize = (
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    composer: EffectComposer,
  ) => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
  }

  const handleZoomUpdate = (distance: number) => {
    if (!cameraRef.current || !orbitControlsRef.current) return;
    
    const camera = cameraRef.current;
    const controls = orbitControlsRef.current;

    const dir = new THREE.Vector3()
      .subVectors(camera.position, controls.target)
      .normalize();

    camera.position.copy(dir.multiplyScalar(distance).add(controls.target));
    controls.update();
  }

  const handleZoom = (
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
  ) => {
    if (!mountRef.current) return;
    const angle = controls.getAzimuthalAngle();

    const targetDistance = camera.position.distanceTo(cameraTargetRef.current);
    const centerDistance = camera.position.distanceTo(centerVector);
    const distance = Math.min(targetDistance, centerDistance);
    setZoomDistance(distance);

    if (!isZoomingRef.current) {
      updateOpacityByDistance(humanModelRef.current, distance, 25000, 20000);
      updateOpacityByDistance(brainModelRef.current, distance, 15000, 12000);
      updateOpacityByDistance(planetModelRef.current, distance, 12000, 5000, 0.35);
    }

    const [leftGroupMeshes, rightGroupMeshes] = [leftGroupInfosRef, rightGroupInfosRef].map(group => group.current.map(info => info.mesh));
    const [leftLines, rightLines] = [leftLinesRef, rightLinesRef].map(lines => lines.current);

    if (distance < 12000) {
      if (cameraTargetRef.current.equals(centerVector)) {
        const isLeft = angle < 0;
        changeColorByAngle(planetModelRef.current, isLeft);

        const hasIntersectTarget = intersectTargetRef.current?.name.includes(isLeft ? "left" : "right");
        const target = hasIntersectTarget
          ? intersectTargetRef.current!.position.clone()
          : isLeft ? leftBrainVector.clone() : rightBrainVector.clone();
        cameraTargetRef.current = target;

        const [show, hide] = isLeft ? [leftGroupMeshes, rightGroupMeshes] : [rightGroupMeshes, leftGroupMeshes];
        show.forEach(mesh => mesh.visible = true);
        hide.forEach(mesh => mesh.visible = false);
  
        if (leftLines) leftLines.visible = isLeft;
        if (rightLines) rightLines.visible = !isLeft;
      }
    }
    else {
      if (!cameraTargetRef.current.equals(centerVector)) {
        cameraTargetRef.current = centerVector.clone();
        [...leftGroupMeshes, ...rightGroupMeshes].forEach(mesh => mesh.visible = false);
        [leftLines, rightLines].forEach(lines => { if (lines) lines.visible = false; });
      }
    }
  }

  const handleIntersectTargetZoom = () => {
    if (!cameraRef.current || !intersectTargetRef.current || !brainPosition.current) return;

    const target = intersectTargetRef.current;
    const distance = cameraRef.current.position.distanceTo(target.position);
    setZoomDistance(distance);

    const resetHandler = () => {
      const [leftGroupMeshes, rightGroupMeshes] = [leftGroupInfosRef, rightGroupInfosRef].map(group => group.current.map(info => info.mesh));
      const [leftLines, rightLines] = [leftLinesRef, rightLinesRef].map(lines => lines.current);
  
      const objectsMap = {
        left: [leftGroupMeshes, leftLines, planetModelRef.current, spaceModelRef.current],
        right: [rightGroupMeshes, rightLines, planetModelRef.current, spaceModelRef.current],
      }
      const objects = brainPosition.current
        ? objectsMap[brainPosition.current]
        : null;
  
      if (objects) {
        objects.forEach(object => {
          updateOpacityByDistance(object, distance, 500, 450);
        });
  
        if (distance > 500) {
          leaveDeepPhase();
          explorationModeRef.current = false;

          setTitle("Hyunwoo Kim");
          titleContainerRef.current!.style.setProperty("opacity", "1");
  
          updateOpacityByDistance(humanModelRef.current, distance, 25000, 20000);
          updateOpacityByDistance(brainModelRef.current, distance, 15000, 12000);
          updateOpacityByDistance(planetModelRef.current, distance, 12000, 5000, 0.35);
  
          orbitControlsRef.current?.removeEventListener("change", intersectTargetZoomListenerRef.current!);
          orbitControlsRef.current?.addEventListener("change", zoomListenerRef.current!);
        }
        else if (distance > 450) {
          titleContainerRef.current!.style.setProperty("opacity", "0");
        }
      }
    }

    resetHandler();
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !orbitControlsRef.current || explorationModeRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const visibleThoughts = [
      ...leftGroupInfosRef.current.map(info => info.mesh).filter(m => m.visible),
      ...rightGroupInfosRef.current.map(info => info.mesh).filter(m => m.visible),
    ];
    const intersects = raycaster.intersectObjects(visibleThoughts);

    if (intersects.length > 0) {
      downIntersectRef.current = intersects[0].object as THREE.Mesh;
    }
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !orbitControlsRef.current || !downIntersectRef.current || explorationModeRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const [leftGroupMeshes, rightGroupMeshes] = [leftGroupInfosRef, rightGroupInfosRef].map(group => group.current.map(info => info.mesh));
    const [leftLines, rightLines] = [leftLinesRef, rightLinesRef].map(lines => lines.current);

    const visibleThoughts = [
      ...leftGroupMeshes.filter(m => m.visible),
      ...rightGroupMeshes.filter(m => m.visible),
    ];
    const intersects = raycaster.intersectObjects(visibleThoughts);

    if (intersects.length > 0 && intersects[0].object === downIntersectRef.current) {
      intersectTargetRef.current = downIntersectRef.current;

      const target = downIntersectRef.current;

      const name = target.name;
      const id = parseInt(name.replace(/leftGroup|rightGroup/g, ""));

      if (name.toLowerCase().includes("group")) {
        enterDeepPhase(target);

        const isLeft = name.includes("left");
        brainPosition.current = isLeft ? "left" : "right";

        const groupInfosRef = isLeft ? leftGroupInfosRef : rightGroupInfosRef;
        const groupInfo = groupInfosRef.current[id];
        
        const position = target.position.clone();
        cameraTargetRef.current = position;
  
        const cameraDir = new THREE.Vector3();
        cameraRef.current.getWorldDirection(cameraDir);
  
        const zoomDistance = 400;
        const zoomTarget = position.clone().add(cameraDir.clone().multiplyScalar(-zoomDistance));
  
        const startDist = cameraRef.current.position.distanceTo(position);
        const endDist = zoomDistance + 10;
  
        const objectsMap = {
          left: [leftGroupMeshes, leftLines, planetModelRef.current, spaceModelRef.current],
          right: [rightGroupMeshes, rightLines, planetModelRef.current, spaceModelRef.current],
        }
        const objects = brainPosition.current
          ? objectsMap[brainPosition.current]
          : null;
  
        const zoomIn = () => {
          const distance = cameraRef.current!.position.distanceTo(position);
          setZoomDistance(distance);
  
          if (distance > zoomDistance + 1) {
            if (objects) {
              objects.forEach(object => {
                updateOpacityByDistance(object, distance, startDist, endDist);
              });
            }
            cameraRef.current!.position.lerp(zoomTarget, 0.05);
            requestAnimationFrame(zoomIn);
          } else {
            isZoomingRef.current = false;
            explorationModeRef.current = true;

            setTitle(groupInfo.data.title);
            titleContainerRef.current?.style.setProperty("opacity", "1");

            orbitControlsRef.current?.removeEventListener("change", zoomListenerRef.current!);
            orbitControlsRef.current?.addEventListener("change", intersectTargetZoomListenerRef.current!);
          }
        }
        
        titleContainerRef.current?.style.setProperty("opacity", "0");
        isZoomingRef.current = true;
        zoomIn();
      }
    }

    downIntersectRef.current = null;
  }

  useEffect(() => {
    const leftGroups: DataType[] = [];
    const rightGroups: DataType[] = [];

    data.forEach(item => {
      if (item.type === "leftNeuron") leftGroups.push(item)
      else rightGroups.push(item);
    });

    createGroups(sceneRef.current!, leftBrainVector, leftGroups);
    createGroups(sceneRef.current!, rightBrainVector, rightGroups);

    leftLinesRef.current = connectGroup(sceneRef.current!, leftGroupInfosRef.current);
    rightLinesRef.current = connectGroup(sceneRef.current!, rightGroupInfosRef.current);

    setSiteReady(true);
  }, [data]);

  useEffect(() => {
    if (!mountRef.current) return;

    const clientWidth = mountRef.current.clientWidth;
    const clientHeight = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 1, 875000);
    camera.position.z = zoom.startDistance;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    renderer.setSize(clientWidth, clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableRotate = true;
    orbitControls.enableZoom = true;
    orbitControls.zoomSpeed = zoom.speed;
    orbitControls.minDistance = zoom.minDistance
    orbitControls.maxDistance = zoom.maxDistance
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(clientWidth, clientHeight),
      1,
      0.4,
      1
    );

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloomPass);

    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambientLight);

    const loader = new GLTFLoader();
    loadSpaceModel(loader, scene, spaceModelRef);
    loadHumanModel(loader, scene, humanModelRef);
    loadBrainModel(loader, scene, brainModelRef);
    loadPlanetModel(loader, scene, planetModelRef);

    const resizeListener = () => handleResize(camera, renderer, composer);
    window.addEventListener("resize", resizeListener);

    zoomListenerRef.current = () => handleZoom(camera, orbitControls);
    orbitControls.addEventListener("change", zoomListenerRef.current);

    intersectTargetZoomListenerRef.current = () => handleIntersectTargetZoom();

    sceneRef.current = scene;
    cameraRef.current = camera;
    orbitControlsRef.current = orbitControls;

    const animate = () => {
      requestAnimationFrame(animate);

      updateGroups(leftGroupInfosRef.current, leftBrainVector);
      updateGroups(rightGroupInfosRef.current, rightBrainVector);
      if (leftLinesRef.current) leftLinesRef.current = updateLines(leftLinesRef.current, leftGroupInfosRef.current);
      if (rightLinesRef.current) rightLinesRef.current = updateLines(rightLinesRef.current, rightGroupInfosRef.current);

      orbitControls.target.lerp(cameraTargetRef.current, 0.05);
      orbitControls.update();

      composer.render();
    }
    animate();

    const fetchData = async () => {
      try {
        const res = await fetch("https://hyunwoo-ai-backend.fly.dev/thoughts", {
          method: "GET",
        });
  
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      }
      catch (error) {
        setData([]);
      }
    }
    fetchData();

    return () => {
      window.removeEventListener("resize", resizeListener);
      orbitControls.removeEventListener("change", zoomListenerRef.current!);
      orbitControls.dispose();
      renderer.dispose();
      mountRef.current?.replaceChildren();
    }
  }, []);

  return (
    <>
      <Head>
        <title>Hyunwoo Kim</title>
      </Head>
      <SplashScreen isReady={siteReady} />
      <div ref={mountRef} className="display" onPointerDown={(event: PointerEvent<HTMLDivElement>) => handlePointerDown(event)} onPointerUp={(event: PointerEvent<HTMLDivElement>) => handlePointerUp(event)} />
      <div ref={titleContainerRef} className={`${styles.titleContainer}`}>
        <p>{ title }</p>
      </div>
      <ZoomProgressBar distance={zoomDistance} minDistance={zoom.minDistance} maxDistance={zoom.maxDistance} onZoomUpdate={handleZoomUpdate} />
      <div className={`pointer ${styles.social}`} onClick={() => window.open("https://github.com/hwk06023", "_blank")}>
        <Image src={githubIcon.src} alt={githubIcon.alt} />
      </div>
    </>
  );
}

export default Home;