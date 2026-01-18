import { LoadModelParams } from "@/types/modelParams";
import * as THREE from "three";

const loadMilkywayModel = ({ loader }: LoadModelParams): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    loader.load("/three/models/milkyway.glb", gltf => {
      const model = gltf.scene;
  
      resolve(model);
    }, undefined, error => reject(error));
  });
}

export default loadMilkywayModel;