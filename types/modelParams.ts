import { GLTFLoader } from "three/examples/jsm/Addons.js"
import * as THREE from "three";

export type LoadModelParams = {
  loader: GLTFLoader
}

export const MODEL_IDS = {
  brain: "idBrain",
  human: "idHuman",
  milkyway: "idMilkyway"
} as const

export const BRAIN_AREA_IDS = {
  left: "idLeft",
  right: "idRight"
} as const

export type ModelId = typeof MODEL_IDS[keyof typeof MODEL_IDS]
export type ModelTransformParams = {
  sizeRatio?: number
  posXRatio: number
  posYRatio: number
  posZRatio: number
}

export type Depth = number

export type TransitionRange = [number, number]
export type SectionRelation = {
  sectionId: SectionId
  type: "next" | "prev"
}

export type SectionId = string
export type SectionKind = "model" | "node"
export interface BaseSection {
  id: SectionId
  kind: SectionKind
  group: THREE.Group
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