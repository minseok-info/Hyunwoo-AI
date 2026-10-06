import { LoadModelParams } from "@/types/modelParams";
import * as THREE from "three";

const loadStarModel = ({ loader }: LoadModelParams): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    loader.load("/three/models/star.glb", gltf => {
      const model = gltf.scene;
  
      resolve(model);
    }, undefined, error => reject(error));
  });
}

export default loadStarModel;