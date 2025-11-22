import { GLTFLoader } from "three/examples/jsm/Addons.js"
import * as THREE from "three";

export type ModelNames = "space" | "human" | "brain"
export type ModelType = THREE.Object3D | null
export type ModelTransformParams = {
  posYRatio: number
  posZRatio: number
  visualSizeRatio: number
}

export type LoadModelParams = {
  loader: GLTFLoader
  scene: THREE.Scene
  distance: number
  ratio?: number
}

export type SectionNames = Exclude<ModelNames, "space"> | "temp"
export type SectionType = ModelType
export type SectionConfigParams = Record<
  SectionNames,
  {
    minDistance: number
    maxDistance: number
    prev: SectionNames | null
    next: SectionNames | null
  }
>