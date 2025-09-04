/**
 * @file This file defines branded types for various entity IDs used in the application.
 * Branded types are a way to create distinct types that are not assignable to each other,
 * even if their underlying primitive type is the same (e.g., number). This prevents
 * logic errors like passing a `UserId` to a function that expects a `PlantaId`.
 */

export type Brand<K, T> = K & { __brand: T };

export type UserId = Brand<number, 'UserId'>;
export type PlantaId = Brand<number, 'PlantaId'>;
export type EquipoId = Brand<number, 'EquipoId'>;
export type RepuestoId = Brand<number, 'RepuestoId'>;
export type ChecklistItemId = Brand<number, 'ChecklistItemId'>;
export type ModuloId = Brand<number, 'ModuloId'>;
