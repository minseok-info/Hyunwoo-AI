import styles from "@/styles/home.module.css";
import Head from "next/head";
import Image from "next/image";
import { PointerEvent, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer, GLTFLoader, OrbitControls, RenderPass } from "three/examples/jsm/Addons.js";

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
  type NeuronInfo = MeshInfo & {
    position: THREE.Vector3,
    velocity: THREE.Vector3,
  }

  type DataType = { type: "leftNeuron" | "rightNeuron" } & ItemType
  type ModelType = THREE.Object3D | null

  const mountRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const spaceRef = useRef<ModelType>(null);
  const humanRef = useRef<ModelType>(null);
  const brainRef = useRef<ModelType>(null);
  const planetRef = useRef<ModelType>(null);

  const centerVector = new THREE.Vector3(0, 0, 0);
  const leftBrainVector = new THREE.Vector3(-35, 5, 0);
  const rightBrainVector = new THREE.Vector3(35, 5, 0);

  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.Camera>();
  const controlsRef = useRef<OrbitControls>();

  const cameraTargetRef = useRef<THREE.Vector3>(centerVector);
  const initialTargetRef = useRef<THREE.Vector3>(cameraTargetRef.current);

  const zoomListenerRef = useRef<() => void>();
  const targetZoomListenerRef = useRef<() => void>();

  const intersectTargetRef = useRef<THREE.Mesh | null>(null);
  const downIntersectRef = useRef<THREE.Mesh | null>(null);

  const leftNeuronInfosRef = useRef<NeuronInfo[]>([]);
  const rightNeuronInfosRef = useRef<NeuronInfo[]>([]);

  const leftLinesRef = useRef<THREE.LineSegments | null>(null);
  const rightLinesRef = useRef<THREE.LineSegments | null>(null);

  const [data, setData] = useState<DataType[]>([]);

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");

  const loadSpaceModel = (
    loader: GLTFLoader,
    scene: THREE.Scene,
    ref: React.MutableRefObject<ModelType>
  ) => {
    loader.load("/models/space.glb", (gltf) => {
      const model = gltf.scene;
      const size = 30;

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
      const size = 12;

      model.scale.set(size, size, size);
      model.position.set(0, -1875, 30);

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;

          const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 15);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xf2f2f2,
            transparent: true,
            opacity: 1,
            linewidth: 1,
          });
          const lineSegments = new THREE.LineSegments(edgesGeometry, lineMaterial);
          mesh.add(lineSegments);

          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            const m = mat as THREE.MeshStandardMaterial;

            m.emissive = new THREE.Color(0xffffff);
            m.emissiveIntensity = 0.5;

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
      const size = 175;

      model.scale.set(size, size, size);
      model.rotation.set(0, (Math.PI - 0.4), 0);
      model.position.set(0, -25, 0);

      const centerOffset = -2.28;
      const modelBox = new THREE.Box3().setFromObject(model);
      const modelCenter = (modelBox.min.x + modelBox.max.x) / 2 + centerOffset;

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          
          const oldMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          mesh.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: (oldMat as THREE.MeshStandardMaterial).roughness,
            metalness: (oldMat as THREE.MeshStandardMaterial).metalness,
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
      const size = 25;

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

  const createTextSprite = (text: string, radius = 0.05, fontSize = 24, color = "#ffffff") => {
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

    sprite.scale.set(radius, radius, 1);
    sprite.raycast = () => {};
    return sprite;
  }

  const createNeuron = (scene: THREE.Scene, vector: THREE.Vector3, neurons: DataType[]) => {
    if (neurons.length < 1) return;

    const isLeft = vector === leftBrainVector;
    const neuronInfosRef = isLeft ? leftNeuronInfosRef : rightNeuronInfosRef;
    neuronInfosRef.current = [];

    const maxDistance = 25;
    const minSize = 1;
    const maxSize = 3;
    const minSpeed= 0.001;
    const maxSpeed = 0.005;

    neurons.forEach((n, index) => {
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

      const geometry = new THREE.SphereGeometry(radius, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(Math.random() * 0.8, Math.random() * 0.8, Math.random() * 0.8),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${isLeft ? "left" : "right"}Neuron${index}`;
      mesh.position.set(x, y, z);

      const sprite = createTextSprite(n.title, radius, 18);
      sprite.position.set(0, 0, 0);
      mesh.add(sprite);

      mesh.visible = false;
      scene.add(mesh);

      neuronInfosRef.current.push({
        mesh: mesh,
        data: n,
        position: new THREE.Vector3(x, y, z),
        velocity: velocity,
      });
    });
  };

  const connectNeuron = (scene: THREE.Scene, neurons: MeshInfo[]) => {
    if (neurons.length < 1) return null;

    const points: THREE.Vector3[] = [];
    const connected = new Set<THREE.Mesh>();

    neurons.forEach(n => {
      const centerPos = n.mesh.position;
      let minDistance = Infinity;
      let closestPos: THREE.Vector3 | null = null;

      neurons.forEach(cand => {
        if (cand.mesh === n.mesh) return;
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
        connected.add(n.mesh);
      }
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const lines = new THREE.LineSegments(geometry, material);
    lines.visible = false;
    scene.add(lines);
    return lines;
  };

  const updateNeurons = (neurons: NeuronInfo[], center: THREE.Vector3) => {
    neurons.forEach(n => {
      n.position.add(n.velocity);
      n.mesh.position.copy(n.position);

      if (n.position.distanceTo(center) > 25) {
        n.position.sub(center).normalize().multiplyScalar(25).add(center);
        n.velocity.reflect(n.position.clone().sub(center).normalize());
      }
    });
  }

  const updateLines = (lines: THREE.LineSegments, neurons: NeuronInfo[]) => {
    const points: number[] = [];
    const connected = new Set<THREE.Mesh>();

    neurons.forEach(n => {
      const centerPos = n.mesh.position;

      let minDistance = Infinity;
      let closestPos: THREE.Vector3 | null = null;

      neurons.forEach(cand => {
        if (cand.mesh === n.mesh) return;
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
        connected.add(n.mesh);
      }
    });

    const geometry = lines.geometry as THREE.BufferGeometry;
    const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;

    positionAttr.array.set(points);
    positionAttr.needsUpdate = true;

    return lines;
  }

  const updateOpacityByDistance = (
    model: ModelType,
    direction: "sh" | "hs",
    distance: number,
    distStart: number,
    distEnd: number,
  ) => {
    if (!model) return;
    const t = THREE.MathUtils.clamp((distance - distStart) / (distEnd - distStart), 0, 1);

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const opacity = direction === "sh" ? (1 - t) : (0.25 * t);

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

  const resetCamera = () => {
    if (!intersectTargetRef.current) return;
    const name = intersectTargetRef.current!.name;
    intersectTargetRef.current = null;

    if (!name.toLowerCase().includes("neuron")) cameraTargetRef.current = initialTargetRef.current;
    descRef.current!.style.setProperty("display", "none");

    controlsRef.current?.removeEventListener("change", targetZoomListenerRef.current!);
    controlsRef.current?.addEventListener("change", zoomListenerRef.current!);
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

  const handleZoom = (
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
  ) => {
    if (!mountRef.current) return;
    const distance = camera.position.distanceTo(controls.target);
    const angle = controls.getAzimuthalAngle();

    updateOpacityByDistance(humanRef.current, "sh", distance, 300, 200);
    updateOpacityByDistance(brainRef.current, "sh", distance, 100, 50);
    updateOpacityByDistance(planetRef.current, "hs", distance, 75, 10);

    const leftNeuronMeshes = leftNeuronInfosRef.current.map(info => info.mesh);
    const rightNeuronMeshes = rightNeuronInfosRef.current.map(info => info.mesh);

    const leftLines = leftLinesRef.current;
    const rightLines = rightLinesRef.current;

    if (distance < 100) {
      if (cameraTargetRef.current.equals(centerVector)) {
        const isLeft = angle < 0;
        cameraTargetRef.current = (isLeft ? leftBrainVector : rightBrainVector).clone();

        const [show, hide] = isLeft ? [leftNeuronMeshes, rightNeuronMeshes] : [rightNeuronMeshes, leftNeuronMeshes];
        show.forEach(mesh => mesh.visible = true);
        hide.forEach(mesh => mesh.visible = false);

        if (leftLines) leftLines.visible = isLeft;
        if (rightLines) rightLines.visible = !isLeft;
      }
    }
    else if (distance < 150) {
      if (!cameraTargetRef.current.equals(centerVector)) {
        cameraTargetRef.current = centerVector.clone();
        [...leftNeuronMeshes, ...rightNeuronMeshes].forEach(mesh => mesh.visible = false);
        [leftLines, rightLines].forEach(lines => { if (lines) lines.visible = false; });
      }
    }
  }

  const handleTargetZoom = () => {
    if (!mountRef.current || !cameraRef.current || !controlsRef.current || !intersectTargetRef.current) return;

    const distance = cameraRef.current.position.distanceTo(intersectTargetRef.current.position);

    const target = intersectTargetRef.current;
    const geometry = target.geometry as THREE.SphereGeometry;

    const radius = geometry.parameters.radius;
    const maxDistance = 10;

    if ((distance - radius) > maxDistance) {
      resetCamera();
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !controlsRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const visibleThoughts = [
      ...leftNeuronInfosRef.current.map(info => info.mesh).filter(m => m.visible),
      ...rightNeuronInfosRef.current.map(info => info.mesh).filter(m => m.visible),
    ];
    const intersects = raycaster.intersectObjects(visibleThoughts);

    if (intersects.length > 0) {
      downIntersectRef.current = intersects[0].object as THREE.Mesh;
    }
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !controlsRef.current || !downIntersectRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const visibleThoughts = [
      ...leftNeuronInfosRef.current.map(info => info.mesh).filter(m => m.visible),
      ...rightNeuronInfosRef.current.map(info => info.mesh).filter(m => m.visible),
    ];
    const intersects = raycaster.intersectObjects(visibleThoughts);

    if (intersects.length > 0 && intersects[0].object === downIntersectRef.current) {
      resetCamera();

      descRef.current?.style.setProperty("display", "flex");
      intersectTargetRef.current = downIntersectRef.current;

      const target = downIntersectRef.current;

      const name = target.name;
      const id = parseInt(name.replace(/leftNeuron|rightNeuron/g, ""));

      if (name.toLowerCase().includes("neuron")) {
        const neuronInfosRef = name.includes("left") ? leftNeuronInfosRef : rightNeuronInfosRef;
        const neuronInfo = neuronInfosRef.current[id];

        setTitle(neuronInfo.data.title);
        setContent(neuronInfo.data.content);
      }

      controlsRef.current.removeEventListener("change", zoomListenerRef.current!);
      const position = target.position.clone();
      cameraTargetRef.current = position;

      const cameraDir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(cameraDir);

      const zoomDistance = 7.5;
      const zoomTarget = position.clone().add(cameraDir.clone().multiplyScalar(-zoomDistance));

      const zoomIn = () => {
        const distance = cameraRef.current!.position.distanceTo(position);

        if (distance > zoomDistance + 1) {
          cameraRef.current!.position.lerp(zoomTarget, 0.05);
          requestAnimationFrame(zoomIn);
        } else {
          controlsRef.current?.addEventListener("change", targetZoomListenerRef.current!);
        }
      }
      
      zoomIn();
    }

    downIntersectRef.current = null;
  }

  const animate = (
    controls: OrbitControls,
    composer: EffectComposer,
  ) => {
    const loop = () => {
      if (!intersectTargetRef.current) {
        updateNeurons(leftNeuronInfosRef.current, leftBrainVector);
        updateNeurons(rightNeuronInfosRef.current, rightBrainVector);
        if (leftLinesRef.current) leftLinesRef.current = updateLines(leftLinesRef.current, leftNeuronInfosRef.current);
        if (rightLinesRef.current) rightLinesRef.current = updateLines(rightLinesRef.current, rightNeuronInfosRef.current);
      }

      controls.target.lerp(cameraTargetRef.current, 0.05);

      controls.update();
      composer.render();

      requestAnimationFrame(loop);
    }

    loop();
  }

  useEffect(() => {
    const leftNeurons: DataType[] = [];
    const rightNeurons: DataType[] = [];

    data.forEach(item => {
      if (item.type === "leftNeuron") leftNeurons.push(item)
      else rightNeurons.push(item);
    });

    createNeuron(sceneRef.current!, leftBrainVector, leftNeurons);
    createNeuron(sceneRef.current!, rightBrainVector, rightNeurons);

    leftLinesRef.current = connectNeuron(sceneRef.current!, leftNeuronInfosRef.current);
    rightLinesRef.current = connectNeuron(sceneRef.current!, rightNeuronInfosRef.current);
  }, [data]);

  useEffect(() => {
    if (!mountRef.current) return;

    const clientWidth = mountRef.current.clientWidth;
    const clientHeight = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 1, 15000);
    camera.position.z = 750;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(clientWidth, clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambientLight);

    const loader = new GLTFLoader();
    loadSpaceModel(loader, scene, spaceRef);
    loadHumanModel(loader, scene, humanRef);
    loadBrainModel(loader, scene, brainRef);
    loadPlanetModel(loader, scene, planetRef);

    const resizeListener = () => handleResize(camera, renderer, composer);
    window.addEventListener("resize", resizeListener);

    zoomListenerRef.current = () => handleZoom(camera, controls);
    controls.addEventListener("change", zoomListenerRef.current);

    targetZoomListenerRef.current = () => handleTargetZoom();

    animate(controls, composer);

    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

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
      controls.removeEventListener("change", zoomListenerRef.current!);
      controls.dispose();
      renderer.dispose();
      mountRef.current?.replaceChildren();
    }
  }, []);

  return (
    <>
      <Head>
        <title>Hyunwoo Kim</title>
      </Head>
      <div ref={mountRef} className="display" onPointerDown={(event: PointerEvent<HTMLDivElement>) => handlePointerDown(event)} onPointerUp={(event: PointerEvent<HTMLDivElement>) => handlePointerUp(event)} />
      <div ref={descRef} className={`pointer ${styles.desc}`} onClick={resetCamera}>
        <div className="flex flexColumn">
          <h4>{ title }</h4>
          <hr />
          <p>{ content }</p>
        </div>
      </div>
      <div ref={titleRef} className={`${styles.title}`}>
        <p>Hyunwoo Kim</p>
      </div>
      <div className={`pointer ${styles.social}`} onClick={() => window.open("https://github.com/hwk06023", "_blank")}>
        <Image src={githubIcon.src} alt={githubIcon.alt} />
      </div>
    </>
  );
}

export default Home;