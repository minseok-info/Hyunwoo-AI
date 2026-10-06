import { LoadModelParams } from "@/types/modelParams";
import * as THREE from "three";

const loadHumanModel = ({ loader }: LoadModelParams): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    loader.load("/three/models/human.glb", gltf => {
      const model = gltf.scene;
  
      model.traverse(child => {
        if (!(child as THREE.Mesh).isMesh) return;
        
        const mesh = child as THREE.Mesh;
        mesh.renderOrder = 100;

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
  
      resolve(model);
    }, undefined, error => reject(error));
  });
}

export default loadHumanModel;