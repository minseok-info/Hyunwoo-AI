import { LoadModelParams, ModelType } from "@/types/modelParams";
import * as THREE from "three";

const loadBrainModel = ({
  loader,
  scene,
  distance,
  ratio = 1.05
}: LoadModelParams): Promise<ModelType> => {
  return new Promise((resolve, reject) => {
    loader.load("/three/models/brain.glb", gltf => {
      const model = gltf.scene;
      model.name = "brain";
      model.scale.setScalar(distance * ratio);

      const boundingBox = new THREE.Box3().setFromObject(model);
      const centerVector = new THREE.Vector3();
      boundingBox.getCenter(centerVector);
      
      const position = centerVector.clone();
      position.y *= 2;

      const { x, y, z } = position;
      model.position.set(x, -y, z);
      model.rotation.set(0, (Math.PI - 0.43), 0);

      model.traverse(child => {
        if (!(child as THREE.Mesh).isMesh) return;

        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.25,
          metalness: 0.25
        });

        const geometry = mesh.geometry as THREE.BufferGeometry;
        const position = geometry.attributes.position;
        let colorAttr = geometry.attributes.color as THREE.BufferAttribute;

        if (!colorAttr) {
          colorAttr = new THREE.BufferAttribute(new Float32Array(position.count * 3), 3);
          geometry.setAttribute("color", colorAttr);
        }

        const posArr = position.array as Float32Array;
        const colArr = colorAttr.array as Float32Array;

        const LEFT = [0.8, 0.139, 0.139] as const;
        const RIGHT = [0.139, 0.139, 0.8] as const;
        
        const local = new THREE.Vector3();
        const world = new THREE.Vector3();

        for (let i = 0; i < position.count; i++) {
          const idx = i * 3;

          local.set(posArr[idx], posArr[idx + 1], posArr[idx + 2]);
          mesh.localToWorld(world.copy(local));

          const src = world.x < centerVector.x ? LEFT : RIGHT;

          colArr[idx] = src[0];
          colArr[idx + 1] = src[1];
          colArr[idx + 2] = src[2];
        }

        colorAttr.needsUpdate = true;
      });

      model.visible = false;
      scene.add(model);
      resolve(model);
    }, undefined, error => reject(error));
  });
}

export default loadBrainModel;