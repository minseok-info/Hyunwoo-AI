import { LoadModelParams, ModelType } from "@/types/modelParams";

const loadSpaceModel = ({
  loader,
  scene,
  distance,
  ratio = 5
}: LoadModelParams): Promise<ModelType> => {
  return new Promise((resolve, reject) => {
    loader.load("/three/models/space.glb", gltf => {
      const model = gltf.scene;
      model.name = "space";
      model.scale.setScalar(distance * ratio);
  
      scene.add(model);
      resolve(model);
    }, undefined, error => reject(error));
  });
}

export default loadSpaceModel;