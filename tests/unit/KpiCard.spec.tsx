/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KpiCard } from '../../pages/HomePage'; // The component is co-located here
import type { KpiCardProps } from '../../types';
import { BoltIcon } from '@heroicons/react/24/outline';

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
  };

  it('renders all the provided information', () => {
    render(<KpiCard {...baseProps} />);
    
    // FIX: Replaced toBeInTheDocument with not.toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByText('Test KPI')).not.toBeNull();
    // FIX: Replaced toBeInTheDocument with not.toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByText('1,234')).not.toBeNull();
    // FIX: Replaced toBeInTheDocument with not.toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByText('kWh')).not.toBeNull();
    // FIX: Replaced toBeInTheDocument with not.toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByTestId('bolt-icon')).not.toBeNull();
  });

  it('shows a positive trend with an up arrow', () => {
    render(<KpiCard {...baseProps} trend={5.5} />);

    const trendElement = screen.getByText(/5.5% vs last period/);
    // FIX: Replaced toBeInTheDocument with not.toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement).not.toBeNull();
    // FIX: Replaced toHaveClass with a className.toContain check to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement.className).toContain('text-success');
    // FIX: Replaced toBeInTheDocument with not.toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByTestId('arrow-up-icon')).not.toBeNull();
    // FIX: Replaced not.toBeInTheDocument with toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.queryByTestId('arrow-down-icon')).toBeNull();
  });

  it('shows a negative trend with a down arrow', () => {
    render(<KpiCard {...baseProps} trend={-2.1} />);
    
    const trendElement = screen.getByText(/2.1% vs last period/);
    // FIX: Replaced toBeInTheDocument with not.toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement).not.toBeNull();
    // FIX: Replaced toHaveClass with a className.toContain check to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement.className).toContain('text-error');
    // FIX: Replaced toBeInTheDocument with not.toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByTestId('arrow-down-icon')).not.toBeNull();
    // FIX: Replaced not.toBeInTheDocument with toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.queryByTestId('arrow-up-icon')).toBeNull();
  });

  it('shows a zero trend as positive', () => {
    render(<KpiCard {...baseProps} trend={0} />);
    
    const trendElement = screen.getByText(/0% vs last period/);
    // FIX: Replaced toBeInTheDocument with not.toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement).not.toBeNull();
    // FIX: Replaced toHaveClass with a className.toContain check to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(trendElement.className).toContain('text-success');
    // FIX: Replaced toBeInTheDocument with not.toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.getByTestId('arrow-up-icon')).not.toBeNull();
  });

  it('does not render unit if not provided', () => {
    const { unit, ...propsWithoutUnit } = baseProps;
    render(<KpiCard {...propsWithoutUnit} />);
    
    // FIX: Replaced not.toBeInTheDocument with toBeNull to resolve TypeScript errors with jest-dom matchers in Vitest.
    expect(screen.queryByText('kWh')).toBeNull();
  });
});