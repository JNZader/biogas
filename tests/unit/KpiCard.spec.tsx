/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
// FIX: Import test runner functions from Vitest to resolve 'Cannot find name' errors.
import { describe, it, expect, vi } from 'vitest';
import { KpiCard } from '../../pages/HomePage'; // The component is co-located here
// FIX: Corrected the import path for 'KpiCardProps' to point to 'pages/HomePage.tsx' where the type is co-located, resolving the 'not a module' error from the empty 'types/index.ts' file.
import type { KpiCardProps } from '../../pages/HomePage';
import { BoltIcon } from '@heroicons/react/24/outline';

// FIX: Mock the Link component from TanStack Router to prevent errors in a test environment that lacks a router context. This mock renders a simple anchor tag in its place.
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const original = await importOriginal<typeof import('@tanstack/react-router')>();
    return {
        ...original,
        Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
    };
});

// Mocking HeroIcons to make assertions simpler
// FIX: Switched from 'jest' to 'vi' for mocking, which is standard in Vitest environments and resolves TypeScript errors when 'jest' is treated as a namespace.
vi.mock('@heroicons/react/24/outline', async () => ({
    // FIX: Replaced vi.requireActual with vi.importActual to align with Vitest's ESM-based module mocking and resolve the type error.
    ...(await vi.importActual<typeof import('@heroicons/react/24/outline')>('@heroicons/react/24/outline')),
    ArrowUpIcon: () => <div data-testid="arrow-up-icon" />,
    ArrowDownIcon: () => <div data-testid="arrow-down-icon" />,
}));

describe('KpiCard', () => {
  const baseProps: KpiCardProps = {
    title: 'Test KPI',
    value: '1,234',
    unit: 'kWh',
    trend: 5.5,
    icon: <BoltIcon data-testid="bolt-icon" />,
    // FIX: Added the required 'to' prop to satisfy the KpiCardProps interface and enable navigation testing.
    to: '/test',
  };

  it('renders all the provided information', () => {
    render(<KpiCard {...baseProps} />);
    
    // FIX: Replaced .not.toBeNull() with .toBeDefined() to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByText('Test KPI')).toBeDefined();
    // FIX: Replaced .not.toBeNull() with .toBeDefined() to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByText('1,234')).toBeDefined();
    // FIX: Replaced .not.toBeNull() with .toBeDefined() to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByText('kWh')).toBeDefined();
    // FIX: Replaced .not.toBeNull() with .toBeDefined() to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByTestId('bolt-icon')).toBeDefined();
  });

  it('shows a positive trend with an up arrow', () => {
    render(<KpiCard {...baseProps} trend={5.5} />);

    const trendElement = screen.getByText(/5.5% vs last period/);
    // FIX: Replaced .not.toBeNull() with .toBeDefined() to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement).toBeDefined();
    // FIX: Replaced toHaveClass with a className.toContain check to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement.className).toContain('text-success');
    // FIX: Replaced .not.toBeNull() with .toBeDefined() to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByTestId('arrow-up-icon')).toBeDefined();
    // FIX: Replaced not.toBeInTheDocument with toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.queryByTestId('arrow-down-icon')).toBeNull();
  });

  it('shows a negative trend with a down arrow', () => {
    render(<KpiCard {...baseProps} trend={-2.1} />);
    
    const trendElement = screen.getByText(/2.1% vs last period/);
    // FIX: Replaced .not.toBeNull() with .toBeDefined() to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement).toBeDefined();
    // FIX: Replaced toHaveClass with a className.toContain check to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement.className).toContain('text-error');
    // FIX: Replaced .not.toBeNull() with .toBeDefined() to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByTestId('arrow-down-icon')).toBeDefined();
    // FIX: Replaced not.toBeInTheDocument with toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.queryByTestId('arrow-up-icon')).toBeNull();
  });

  it('shows a zero trend as positive', () => {
    render(<KpiCard {...baseProps} trend={0} />);
    
    // FIX: Updated the regex to match the 'toFixed(1)' formatting of the trend value.
    const trendElement = screen.getByText(/0.0% vs last period/);
    // FIX: Replaced .not.toBeNull() with .toBeDefined() to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement).toBeDefined();
    // FIX: Replaced toHaveClass with a className.toContain check to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement.className).toContain('text-success');
    // FIX: Replaced .not.toBeNull() with .toBeDefined() to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByTestId('arrow-up-icon')).toBeDefined();
  });

  it('does not render unit if not provided', () => {
    const { unit, ...propsWithoutUnit } = baseProps;
    render(<KpiCard {...propsWithoutUnit} />);
    
    // FIX: Replaced not.toBeInTheDocument with toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.queryByText('kWh')).toBeNull();
  });
});
