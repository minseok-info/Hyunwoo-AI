import styles from "@/styles/home.module.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer, GLTFLoader, OrbitControls, RenderPass } from "three/examples/jsm/Addons.js";

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

  const planetRef = useRef<THREE.Mesh[]>([]);

  const [data, setData] = useState<Array<DataType>>([]);

  const planetListRef = useRef<DataType[]>([]);
  const leftNeuronRef = useRef<DataType[]>([]);
  const rightNeuronRef = useRef<DataType[]>([]);

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

  const createPlanets = (scene: THREE.Scene, planets: DataType[]) => {
    if (planets.length < 1) return;
    planetRef.current.forEach(p => scene.remove(p));

    const minDistance = 25;
    const maxDistance = 80;
    
    const minSize = 5;
    const maxSize = 10;

    const fixedY = 0;
    const sphereDistance = 25;

    const occupiedPositions: THREE.Vector3[] = [];
    
    planets.forEach((p, index) => {
      let orbitRadius = 0;
      let theta = 0;
      let x = 0, z = 0;
      let valid = false;
  
      while (!valid) {
        orbitRadius = minDistance + Math.random() * (maxDistance - minDistance);
        theta = Math.random() * 2 * Math.PI;
        x = orbitRadius * Math.cos(theta);
        z = orbitRadius * Math.sin(theta);
  
        valid = occupiedPositions.every((pos) => {
          return pos.distanceTo(new THREE.Vector3(x, fixedY, z)) >= sphereDistance;
        });
      }
      occupiedPositions.push(new THREE.Vector3(x, fixedY, z));
  
      const y = fixedY;
      const radius = minSize + Math.random() * (maxSize - minSize);
  
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
      planetRef.current.push(mesh);

      mesh.add(sprite);
      scene.add(mesh);
    });
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

    const distance = camera.position.distanceTo(controls.target);
    const angle = controls.getAzimuthalAngle();

    updateOpacityByDistance(humanRef.current, distance, 300, 200);
    updateOpacityByDistance(brainRef.current, distance, 6, 2.5);

    updateBackgroundByDistance(scene, distance, 6, 2.5, new THREE.Color(0x000000), new THREE.Color(0xffffff));

    if (distance < 10) {
      planetRef.current.forEach(mesh => mesh.visible = false);
      if (cameraTargetRef.current.equals(centerVector)) {
        cameraTargetRef.current = angle < 0 ? leftBrainVector.clone() : rightBrainVector.clone();
      }
    }
    else if (distance < 150) {
      planetRef.current.forEach(mesh => mesh.visible = true);
      if (!cameraTargetRef.current.equals(centerVector)) {
        cameraTargetRef.current = centerVector.clone();
      }
    }
    else if (distance < 200) {
      planetRef.current.forEach(mesh => mesh.visible = true);
    }
    else {
      planetRef.current.forEach(mesh => mesh.visible = false);
    }
  }

  const handleClick = (event: MouseEvent) => {
    if (!mountRef.current || !cameraRef.current || !controlsRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const thoughts = [...planetRef.current];
    const intersects = raycaster.intersectObjects(thoughts);

    if (intersects.length > 0) {
      if (cameraTargetRef.current.equals(centerVector)) initialTargetRef.current = cameraTargetRef.current;
      descRef.current?.style.setProperty("display", "flex");

      const target = intersects[0].object as THREE.Mesh;
      const geometry = target.geometry as THREE.SphereGeometry;

      const name = target.name;
      const id = parseInt(name.replace(/planet|leftNeuron|rightNeuron/g, ""));
      if (name.includes("planet")) {
        const planet = planetListRef.current[id];

        setTitle(planet.title);
        setContent(planet.content);
      }
      else {
      }

      const radius = geometry.parameters.radius;
      if (radius < 1) return;

      controlsRef.current.removeEventListener("change", zoomListenerRef.current!);
      const position = target.position.clone();

      const cameraDir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(cameraDir);
      
      const zoomDistance = radius * 3;
      const zoomTarget = position.clone().add(cameraDir.clone().multiplyScalar(-zoomDistance));

      let zoomProgress = 0;
      const zoomIn = () => {
        zoomProgress += 0.02;
        cameraTargetRef.current = position
        cameraRef.current!.position.lerp(zoomTarget, 0.05);

        if (zoomProgress < 1) {
          requestAnimationFrame(zoomIn);
        }
      }

      zoomIn();
    }
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

    planetListRef.current = planets;
    createPlanets(sceneRef.current!, planets);

    leftNeuronRef.current = leftNeurons;
    rightNeuronRef.current = rightNeurons;
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

    const clickListener = (event: MouseEvent) => handleClick(event);
    mountRef.current.addEventListener("pointerdown", clickListener);

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
      mountRef.current!.innerHTML = "";
    }
  }, []);

  return (
    <>
      <div ref={mountRef} className="display" />
      <div ref={descRef} className={`pointer ${styles.desc}`} onClick={resetCamera}>
        <div className="flex flexColumn">
          <h4>{ title }</h4>
          <hr />
          <p>{ content }</p>
        </div>
      </div>
    </>
  );
}

export default Home;