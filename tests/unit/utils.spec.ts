/**
 * @jest-environment jsdom
 */
import { exportToCsv } from '../../lib/utils';
// FIX: Import test runner functions from Vitest to resolve 'Cannot find name' errors.
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('exportToCsv', () => {
  // Mock browser APIs
  // FIX: Updated mock implementation to return the node, matching the real 'appendChild' behavior and fixing the type error.
  const mockAppendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
  // FIX: Updated mock implementation to return the node, matching the real 'removeChild' behavior and fixing the type error.
  const mockRemoveChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  // FIX: Switched from 'jest' to 'vi' for mocking, which is standard in Vitest environments and resolves TypeScript errors when 'jest' is treated as a namespace.
  const mockClick = vi.fn();
  
  // Mock URL.createObjectURL
  // FIX: Switched from 'jest' to 'vi' for mocking.
  global.URL.createObjectURL = vi.fn(() => 'mock-url');
  
  beforeEach(() => {
    // Reset mocks before each test
    mockAppendChild.mockClear();
    mockRemoveChild.mockClear();
    mockClick.mockClear();
    // FIX: Replaced 'jest.Mock' type with 'any' to avoid type errors in environments where Jest types are not globally available or correctly configured.
    (global.URL.createObjectURL as any).mockClear();
    
    // Mock anchor element's click method
    // @ts-ignore
    global.HTMLAnchorElement.prototype.click = mockClick;
  });

  it('should generate a correct CSV string and trigger a download', () => {
    const data = [
      { name: 'Test 1', value: 100, category: 'A' },
      { name: 'Test 2', value: 200, category: 'B' },
    ];
    exportToCsv('test.csv', data);

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(mockAppendChild).toHaveBeenCalledTimes(1);
    
    const link = mockAppendChild.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.download).toBe('test.csv');
    expect(link.href).toContain('mock-url');
    
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(mockRemoveChild).toHaveBeenCalledTimes(1);
  });
  
  it('should correctly handle special characters like commas and quotes', done => {
     const data = [
      { description: 'A value with, a comma', notes: 'Some "quoted" text' },
      { description: 'Another value\nwith a newline', notes: 'Plain text' },
    ];
    exportToCsv('special_chars.csv', data);

    // FIX: Replaced 'jest.Mock' type with 'any' to avoid type errors.
    const blob = (global.URL.createObjectURL as any).mock.calls[0][0] as Blob;
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const csvContent = event.target?.result;
        const expectedContent = 'description,notes\n"A value with, a comma","Some ""quoted"" text"\n"Another value\nwith a newline",Plain text';
        expect(csvContent).toBe(expectedContent);
        done();
    };
    
    reader.readAsText(blob);
  });

  it('should handle different keys in different objects', done => {
    const data = [
      { name: 'Product A', price: 10 },
      { name: 'Product B', stock: 100 },
    ];
    exportToCsv('mixed_keys.csv', data);
    
    // FIX: Replaced 'jest.Mock' type with 'any' to avoid type errors.
    const blob = (global.URL.createObjectURL as any).mock.calls[0][0] as Blob;
    const reader = new FileReader();

    reader.onload = function(event) {
        const csvContent = event.target?.result as string;
        const headers = csvContent.split('\n')[0];
        expect(headers).toBe('name,price,stock');
        done();
    };

    reader.readAsText(blob);
  });
  
  it('should not do anything if rows array is empty', () => {
    // FIX: Switched from 'jest' to 'vi' for mocking.
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    exportToCsv('empty.csv', []);
    expect(alertSpy).toHaveBeenCalledWith('No data available to export.');
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});