/**
 * Component Registry
 *
 * Static mapping of component types to React components.
 * V1: No A/B testing at registry level; variants via props.
 *
 * Components are registered in Phase B.
 */

import { ComponentType } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = any;

/**
 * The registry maps component type strings to React components.
 * Uses `any` for props to allow heterogeneous component registration.
 * Type safety is enforced at the UIPlan level, not the registry level.
 */
const ComponentRegistry: Record<string, ComponentType<AnyProps>> = {};

/**
 * Get a component by type name.
 * Returns null if not found (allows graceful fallback).
 */
export function getComponent(type: string): ComponentType<AnyProps> | null {
  return ComponentRegistry[type] ?? null;
}

/**
 * Register a component in the registry.
 * Called during app initialization to populate the registry.
 */
export function registerComponent(
  type: string,
  component: ComponentType<AnyProps>
): void {
  if (ComponentRegistry[type]) {
    console.warn(`Component "${type}" is already registered. Overwriting.`);
  }
  ComponentRegistry[type] = component;
}

/**
 * Check if a component type is registered.
 */
export function hasComponent(type: string): boolean {
  return type in ComponentRegistry;
}

/**
 * Get all registered component types.
 * Useful for debugging and dev harness.
 */
export function getRegisteredTypes(): string[] {
  return Object.keys(ComponentRegistry);
}
