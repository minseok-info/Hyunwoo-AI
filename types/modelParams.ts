import { GLTFLoader } from "three/examples/jsm/Addons.js"
import * as THREE from "three";

type ModelType = THREE.Object3D | null;

type LoadModelParams = {
  loader: GLTFLoader;
  scene: THREE.Scene;
  distance: number;
  ratio?: number;
}

export type {
  ModelType,
  LoadModelParams
};