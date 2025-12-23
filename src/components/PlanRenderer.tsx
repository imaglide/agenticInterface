/**
 * Plan Renderer
 *
 * Takes a UIPlan and renders it deterministically.
 * 1. Validates the plan schema
 * 2. Selects the appropriate layout
 * 3. Renders components from the registry
 * 4. Enforces stability rules (no reordering)
 */

'use client';

import { UIPlan, LayoutTemplate, ComponentInstance } from '@/types/ui-plan';
import { getComponent } from '@/lib/component-registry';
import { StackLayout, SplitLayout, SingleLayout } from '@/components/layouts';
import { ReactNode } from 'react';

interface PlanRendererProps {
  plan: UIPlan;
}

/**
 * Placeholder component shown when a component type is not registered.
 * This allows graceful degradation during development.
 */
function PlaceholderComponent({ type, id }: { type: string; id: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 p-6">
      <p className="text-sm font-medium text-gray-500">
        Component: <code className="text-gray-700">{type}</code>
      </p>
      <p className="text-xs text-gray-400">ID: {id}</p>
      <p className="mt-2 text-xs text-amber-600">
        Not yet registered (Phase B)
      </p>
    </div>
  );
}

/**
 * Render a single component instance.
 * Uses registry lookup with placeholder fallback.
 */
function renderComponent(instance: ComponentInstance): ReactNode {
  const Component = getComponent(instance.type);

  if (!Component) {
    return (
      <PlaceholderComponent
        key={instance.id}
        type={instance.type}
        id={instance.id}
      />
    );
  }

  return <Component key={instance.id} {...instance.props} />;
}

/**
 * Get the layout component for a given template type.
 */
function getLayout(template: LayoutTemplate) {
  switch (template) {
    case 'stack':
      return StackLayout;
    case 'split':
      return SplitLayout;
    case 'single':
      return SingleLayout;
    default:
      console.warn(`Unknown layout template: ${template}, falling back to stack`);
      return StackLayout;
  }
}

/**
 * Validate a UIPlan has required fields.
 * Returns error message or null if valid.
 */
function validatePlan(plan: UIPlan): string | null {
  if (!plan.id) return 'Plan missing id';
  if (!plan.mode) return 'Plan missing mode';
  if (!plan.layout) return 'Plan missing layout';
  if (!Array.isArray(plan.components)) return 'Plan missing components array';
  return null;
}

/**
 * Main Plan Renderer component.
 */
export function PlanRenderer({ plan }: PlanRendererProps) {
  const validationError = validatePlan(plan);

  if (validationError) {
    return (
      <div className="min-h-screen bg-red-50 p-8">
        <div className="rounded-lg bg-red-100 p-6 text-red-800">
          <h2 className="font-bold">Invalid UI Plan</h2>
          <p>{validationError}</p>
          <pre className="mt-4 overflow-auto rounded bg-red-200 p-4 text-xs">
            {JSON.stringify(plan, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  const Layout = getLayout(plan.layout);
  const renderedComponents = plan.components.map(renderComponent);

  return (
    <Layout>
      {renderedComponents}
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 rounded-lg bg-gray-200 p-4 text-xs text-gray-600">
          <p>
            <strong>Mode:</strong> {plan.mode} |{' '}
            <strong>Layout:</strong> {plan.layout} |{' '}
            <strong>Confidence:</strong> {plan.confidence}
          </p>
          <p className="mt-1">
            <strong>Reason:</strong> {plan.reason}
          </p>
        </div>
      )}
    </Layout>
  );
}
