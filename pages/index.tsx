import styles from "@/styles/home.module.css";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
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

  type DataType = { type: "planet" | "neuron" } & ItemType

  type ModelType = THREE.Object3D | null;

  const mountRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);


  const spaceRef = useRef<ModelType>(null);
  const humanRef = useRef<ModelType>(null);
  const brainRef = useRef<ModelType>(null);

  const centerVector = new THREE.Vector3(0, 0, 0);
  const leftBrainVector = new THREE.Vector3(-3, 1, 0);
  const rightBrainVector = new THREE.Vector3(3, 1, 0);

  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.Camera>();
  const controlsRef = useRef<OrbitControls>();

  const cameraTargetRef = useRef<THREE.Vector3>(centerVector);
  const initialTargetRef = useRef<THREE.Vector3>(cameraTargetRef.current);

  const zoomListenerRef = useRef<() => void>();

  const intersectTargetRef = useRef<THREE.Mesh | null>(null);
  const downIntersectRef = useRef<THREE.Mesh | null>(null);

  const planetMeshesRef = useRef<THREE.Mesh[]>([]);
  const leftNeuronMeshesRef = useRef<THREE.Mesh[]>([]);
  const rightNeuronMeshesRef = useRef<THREE.Mesh[]>([]);

  const [data, setData] = useState<Array<DataType>>([]);

  const planetDataRef = useRef<DataType[]>([]);
  const leftNeuronDataRef = useRef<DataType[]>([]);
  const rightNeuronDataRef = useRef<DataType[]>([]);

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
      model.position.set(0, -1800, 2.5);

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
          })
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
      const size = 15;

      model.scale.set(size, size, size);
      model.rotation.set(0, (Math.PI - 0.4), 0);

      const centerOffset = -0.185;
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
    return sprite;
  }

  const createNeuron = (scene: THREE.Scene, vector: THREE.Vector3, neurons: DataType[]) => {
    if (neurons.length < 1) return;

    const isLeft = vector === leftBrainVector;
    const neuronRef = isLeft ? leftNeuronMeshesRef : rightNeuronMeshesRef;
    neuronRef.current = [];

    const maxDistance = 0.6;

    const minSize = 0.02;
    const maxSize = 0.04;

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

      const geometry = new THREE.SphereGeometry(radius, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.4),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${isLeft ? "left" : "right"}Neuron${index}`;
      mesh.position.set(x, y, z);

      const sprite = createTextSprite(n.title, radius, 18);
      sprite.position.set(0, 0, 0);

      mesh.visible = false;
      neuronRef.current.push(mesh);

      mesh.add(sprite);
      scene.add(mesh);
    });
  }

  const createPlanets = (scene: THREE.Scene, planets: DataType[]) => {
    if (planets.length < 1) return;
    planetMeshesRef.current.forEach(p => scene.remove(p));
    planetMeshesRef.current = [];

    const minDistance = 25;
    const maxDistance = 80;
    
    const minSize = 5;
    const maxSize = 10;

    const fixedY = 0;
    const sphereDistance = 5;

    const occupiedPositions: THREE.Vector3[] = [];
    const occupiedRadii: number[] = [];
    
    planets.forEach((p, index) => {
      let x = 0, z = 0;
      let valid = false;

      const y = fixedY;
      const radius = minSize + Math.random() * (maxSize - minSize);
  
      while (!valid) {
        const orbitRadius = minDistance + Math.random() * (maxDistance - minDistance);
        const theta = Math.random() * 2 * Math.PI;
        x = orbitRadius * Math.cos(theta);
        z = orbitRadius * Math.sin(theta);
  
        valid = occupiedPositions.every((pos, i) => {
          const otherRadius = occupiedRadii[i];
          const minAllowedDistance = radius + otherRadius + sphereDistance;
          return pos.distanceTo(new THREE.Vector3(x, fixedY, z)) >= minAllowedDistance;
        });
      }

      occupiedPositions.push(new THREE.Vector3(x, fixedY, z));
      occupiedRadii.push(radius);
  
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.4),
      });
  
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `planet${index}`;
      mesh.position.set(x, y, z);
  
      const sprite = createTextSprite(p.title, radius, 48);
      sprite.position.set(0, 0, 0);

      mesh.visible = false;
      planetMeshesRef.current.push(mesh);

      mesh.add(sprite);
      scene.add(mesh);
    });
  }

  const connectNeuron = (neurons: THREE.Mesh[] = []) => {
    if (neurons.length < 1) return;

    const points: THREE.Vector3[] = [];
    const connected = new Set<THREE.Mesh>();

    neurons.forEach((n) => {
      const centerPos = n.position;

      let minDistance = Infinity;
      let closestPos: THREE.Vector3 | null = null;

      neurons.forEach((cand) => {
        if (cand === n) return;
        else if (connected.has(cand)) return;

        const candPos = cand.position;
        const distance = centerPos.distanceTo(candPos);

        if (distance < minDistance) {
          minDistance = distance;
          closestPos = candPos;
        }
      });

      if (closestPos) {
        const candPos = closestPos as THREE.Vector3;
        points.push(centerPos.clone(), candPos.clone());
        connected.add(n);
      }
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });

    const lines = new THREE.LineSegments(geometry, material);
    sceneRef.current!.add(lines);

    return lines;
  }

  const updateOpacityByDistance = (
    model: ModelType,
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

        materials.forEach((mat) => {
          const m = mat as THREE.MeshStandardMaterial & { opacity?: number; transparent?: boolean };
          m.opacity = 1 - t;
          m.transparent = m.opacity < 1;
          m.needsUpdate = true;
        });
      }
      else if ((child as THREE.LineSegments).isLineSegments) {
        const line = child as THREE.LineSegments;
        const m = line.material as any;

        if (m) {
          m.opacity = 1 - t;
          m.transparent = m.opacity < 1;
          m.needsupdate = true;
        }
      }
    });
  }

  const updateBackgroundByDistance = (
    scene: THREE.Scene,
    distance: number,
    distStart: number,
    distEnd: number,
    colorStart: THREE.Color,
    colorEnd: THREE.Color,
  ) => {
    const t = THREE.MathUtils.clamp((distance - distStart) / (distEnd - distStart), 0, 1);

    const r = THREE.MathUtils.lerp(colorStart.r, colorEnd.r, t);
    const g = THREE.MathUtils.lerp(colorStart.g, colorEnd.g, t);
    const b = THREE.MathUtils.lerp(colorStart.b, colorEnd.b, t);

    scene.background = new THREE.Color(r, g, b);
  }

  const resetCamera = () => {
    cameraTargetRef.current = initialTargetRef.current;
    descRef.current!.style.setProperty("display", "none");

    controlsRef.current?.removeEventListener("change", handleTargetZoom);
    controlsRef.current?.addEventListener("change", zoomListenerRef.current!);
  }

  const handleResize = (
    mountRef: React.RefObject<HTMLDivElement>,
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
    mountRef: React.RefObject<HTMLDivElement>,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
  ) => {
    if (!mountRef.current) return;
    const childDiv = descRef.current?.firstElementChild as HTMLDivElement | null;

    const distance = camera.position.distanceTo(controls.target);
    const angle = controls.getAzimuthalAngle();

    updateOpacityByDistance(humanRef.current, distance, 300, 200);
    updateOpacityByDistance(brainRef.current, distance, 6, 2.5);

    updateBackgroundByDistance(scene, distance, 6, 2.5, new THREE.Color(0x000000), new THREE.Color(0xffffff));

    if (distance < 10) {
      titleRef.current?.style.setProperty("color", "black");
      childDiv?.style.setProperty("background-color", "rgba(0, 0, 0, 0.65)");

      planetMeshesRef.current.forEach(mesh => mesh.visible = false);
      if (cameraTargetRef.current.equals(centerVector)) {
        const isLeft = angle < 0;
        cameraTargetRef.current = (isLeft ? leftBrainVector : rightBrainVector).clone();

        const [show, hide] = isLeft
          ? [leftNeuronMeshesRef.current, rightNeuronMeshesRef.current]
          : [rightNeuronMeshesRef.current, leftNeuronMeshesRef.current];
        
        show.forEach(mesh => mesh.visible = true);
        hide.forEach(mesh => mesh.visible = false);
      }
    }
    else if (distance < 150) {
      titleRef.current?.style.setProperty("color", "white");
      childDiv?.style.setProperty("background-color", "rgba(255, 255, 255, 0.15)");

      planetMeshesRef.current.forEach(mesh => mesh.visible = true);
      if (!cameraTargetRef.current.equals(centerVector)) {
        cameraTargetRef.current = centerVector.clone();

        const neurons = [...leftNeuronMeshesRef.current, ...rightNeuronMeshesRef.current];
        neurons.forEach(mesh => mesh.visible = false);
      }
    }
    else if (distance < 200) {
      planetMeshesRef.current.forEach(mesh => mesh.visible = true);
    }
    else {
      planetMeshesRef.current.forEach(mesh => mesh.visible = false);
    }
  }

  const handleTargetZoom = () => {
    if (!mountRef.current || !cameraRef.current || !controlsRef.current || !intersectTargetRef.current) return;

    const distance = cameraRef.current.position.distanceTo(controlsRef.current.target);

    const target = intersectTargetRef.current;
    const geometry = target.geometry as THREE.SphereGeometry;

    const radius = geometry.parameters.radius;
    const maxDistance = radius < 1 ? 0.2 : 40;

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
      ...planetMeshesRef.current.filter(m => m.visible),
      ...leftNeuronMeshesRef.current.filter(m => m.visible),
      ...rightNeuronMeshesRef.current.filter(m => m.visible),
    ]
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
      ...planetMeshesRef.current.filter(m => m.visible),
      ...leftNeuronMeshesRef.current.filter(m => m.visible),
      ...rightNeuronMeshesRef.current.filter(m => m.visible),
    ]
    const intersects = raycaster.intersectObjects(visibleThoughts);

    if (intersects.length > 0 && intersects[0].object === downIntersectRef.current) {
      descRef.current?.style.setProperty("display", "flex");
      intersectTargetRef.current = downIntersectRef.current;

      const target = downIntersectRef.current;
      const geometry = target.geometry as THREE.SphereGeometry;

      const name = target.name;
      const id = parseInt(name.replace(/planet|leftNeuron|rightNeuron/g, ""));
      if (name.includes("planet")) {
        const planet = planetDataRef.current[id];

        setTitle(planet.title);
        setContent(planet.content);
      }
      else if (name.toLowerCase().includes("neuron")) {
        const neuronDataRef = name.includes("left")
          ? leftNeuronDataRef
          : rightNeuronDataRef

        const neuron = neuronDataRef.current[id];

        setTitle(neuron.title);
        setContent(neuron.content);
      }

      const radius = geometry.parameters.radius;

      controlsRef.current.removeEventListener("change", zoomListenerRef.current!);
      const position = target.position.clone();

      const cameraDir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(cameraDir);
      
      const isNeuron = radius < 1 ? true : false;
      const zoomDistance = isNeuron ? 0.1 : 25;
      const zoomTarget = position.clone().add(cameraDir.clone().multiplyScalar(-zoomDistance));

      const zoomIn = () => {
        const distance = cameraRef.current!.position.distanceTo(position);

        if (distance > zoomDistance + (isNeuron ? 0.05 : 1)) {
          cameraRef.current!.position.lerp(zoomTarget, 0.05);
          cameraTargetRef.current = position;
          requestAnimationFrame(zoomIn);
        } else {
          controlsRef.current?.addEventListener("change", handleTargetZoom);
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
      controls.target.lerp(cameraTargetRef.current, 0.05);

      controls.update();
      composer.render();

      requestAnimationFrame(loop);
    }

    loop();
  }

  useEffect(() => {
    let planets: DataType[] = [];

    let leftNeurons: DataType[] = [];
    let rightNeurons: DataType[] = [];

    data.forEach((item) => {
      if (item.type === "planet") planets.push(item);
      else {
        if (Math.random() < 0.5) leftNeurons.push(item);
        else rightNeurons.push(item);
      }
    });

    planetDataRef.current = planets;
    createPlanets(sceneRef.current!, planets);

    leftNeuronDataRef.current = leftNeurons;
    rightNeuronDataRef.current = rightNeurons;

    createNeuron(sceneRef.current!, leftBrainVector, leftNeurons);
    createNeuron(sceneRef.current!, rightBrainVector, rightNeurons);

    connectNeuron(leftNeuronMeshesRef.current);
    connectNeuron(rightNeuronMeshesRef.current);
  }, [data]);

  useEffect(() => {
    if (!mountRef.current) return;

    const clientWidth = mountRef.current.clientWidth;
    const clientHeight = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 5000);
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

    const resizeListener = () => handleResize(mountRef, camera, renderer, composer);
    window.addEventListener("resize", resizeListener);

    zoomListenerRef.current = () => handleZoom(mountRef, scene, camera, controls);
    controls.addEventListener("change", zoomListenerRef.current);

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