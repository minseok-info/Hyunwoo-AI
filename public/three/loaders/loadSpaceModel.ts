import { LoadModelParams } from "@/types/modelParams";
import * as THREE from "three";

const loadSpaceModel = ({ loader }: LoadModelParams): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    loader.load("/three/models/space.glb", gltf => {
      const model = gltf.scene;
      model.scale.setScalar(2500);
  
      resolve(model);
    }, undefined, error => reject(error));
  });
}

export default loadSpaceModel;