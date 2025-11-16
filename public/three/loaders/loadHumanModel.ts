import { LoadModelParams, ModelType } from "@/types/modelParams";
import * as THREE from "three";

const loadHumanModel = ({
  loader,
  scene,
  distance,
  ratio = 0.01
}: LoadModelParams): Promise<ModelType> => {
  return new Promise((resolve, reject) => {
    loader.load("/three/models/human.glb", gltf => {
      const model = gltf.scene;
      model.scale.setScalar(distance * ratio);
  
      const boundingBox = new THREE.Box3().setFromObject(model);
      const centerVector = new THREE.Vector3();
      boundingBox.getCenter(centerVector);
  
      const position = new THREE.Vector3();
      position.x = centerVector.x;
      position.z = centerVector.z;
      position.y = centerVector.y * 1.925;
  
      const { x, y, z } = position;
      model.position.set(x, -y, z);
  
      model.traverse(child => {
        if (!(child as THREE.Mesh).isMesh) return;
        
        const mesh = child as THREE.Mesh;
        const geometry = mesh.geometry;

        const edgesGeometry = new THREE.EdgesGeometry(geometry, 15);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0xcccccc,
          linewidth: 1
        });
        const line = new THREE.LineSegments(edgesGeometry, lineMaterial);
        mesh.add(line);

        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        materials.forEach(mat => {
          const m = mat as THREE.MeshStandardMaterial;
          m.color.set(new THREE.Color(1, 1, 1));

          if (m.roughness === undefined) m.roughness = 0.5;
          if (m.metalness === undefined) m.metalness = 0.5;
          m.needsUpdate = true;
        });
      });
  
      scene.add(model);
      resolve(model);
    }, undefined, error => reject(error));
  });
}

export default loadHumanModel;