import { GLTFLoader } from "three/examples/jsm/Addons.js"
import * as THREE from "three";

export type LoadModelParams = {
  loader: GLTFLoader
}

export type ModelId = "human" | "brain"
export type ModelTransformParams = {
  sizeRatio?: number
  posXRatio: number
  posYRatio: number
  posZRatio: number
}

export type SectionId = string
export type SectionKind = "model" | "tree" | "node"
export interface TransitionSection {
  section: BaseSection
  range: number[]
}
export interface BaseSection {
  id: SectionId
  kind: SectionKind
  group: THREE.Group
  next?: TransitionSection
  prev?: TransitionSection
}

export interface ModelSection extends BaseSection {
  id: ModelId
  kind: "model"
  transform: ModelTransformParams
}

export interface NodeSection extends BaseSection {
  kind: "node"
}

export type Section =
  | BaseSection
  | ModelSection
  | NodeSection