import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Exports an array of objects to a CSV file.
 * @param filename The desired name of the output file.
 * @param rows The array of data objects to export.
 */
export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    alert("No data available to export.");
    return;
  }
  
  const separator = ',';
  // Use a more robust way to get all unique keys as headers
  const allKeys = rows.reduce<string[]>((acc, row) => {
    Object.keys(row).forEach(key => {
        if (!acc.includes(key)) {
            acc.push(key);
        }
    });
    return acc;
  }, []);

  const csvContent = [
    allKeys.join(separator),
    ...rows.map(row => {
      return allKeys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date
          ? cell.toLocaleString('es-AR')
          : cell.toString().replace(/"/g, '""');
        
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
