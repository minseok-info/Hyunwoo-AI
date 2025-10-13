import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer, GLTFLoader, OrbitControls, RenderPass } from "three/examples/jsm/Addons.js";

const Home = () => {
  type ModelType = THREE.Object3D | null;

  const mountRef = useRef<HTMLDivElement>(null);

  const spaceRef = useRef<ModelType>(null);
  const humanRef = useRef<ModelType>(null);
  const brainRef = useRef<ModelType>(null);

  const centerVector = new THREE.Vector3(0, 0, 0);
  const leftBrainVector = new THREE.Vector3(-3, 1, 0);
  const rightBrainVector = new THREE.Vector3(3, 1, 0);

  const cameraTargetRef = useRef<THREE.Vector3>(centerVector.clone());

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
    updateOpacityByDistance(brainRef.current, distance, 6, 3);

    updateBackgroundByDistance(scene, distance, 6, 3, new THREE.Color(0x000000), new THREE.Color(0xffffff));

    if (distance < 10) {
      if (cameraTargetRef.current.equals(centerVector)) {
        cameraTargetRef.current = angle < 0 ? leftBrainVector.clone() : rightBrainVector.clone();
      }
    }
    else if (distance < 150) {
      if (!cameraTargetRef.current.equals(centerVector)) {
        cameraTargetRef.current = centerVector.clone();
      } 
    }
  }

  const animate = (
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    controls: OrbitControls,
    composer: EffectComposer,
    models: { space: ModelType; human: ModelType; brain: ModelType; },
  ) => {
    const loop = () => {
      controls.target.lerp(cameraTargetRef.current, 0.05);

      controls.update();
      composer.render();

      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }

    loop();
  }

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

    const zoomListener = () => handleZoom(mountRef, scene, camera, controls);
    controls.addEventListener("change", zoomListener);

    animate(scene, camera, renderer, controls, composer, {
      space: spaceRef.current,
      human: humanRef.current,
      brain: brainRef.current,
    });

    return () => {
      window.removeEventListener("resize", resizeListener);
      controls.removeEventListener("change", zoomListener);
      controls.dispose();
      renderer.dispose();
      mountRef.current!.innerHTML = "";
    }
  }, []);

  return (
    <div ref={mountRef} className="display" />
  );
}

export default Home;