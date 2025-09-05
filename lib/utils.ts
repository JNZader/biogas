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


/**
 * Exports an array of objects to a PDF file by generating a printable HTML view.
 * @param title The title for the printable document.
 * @param data The array of data objects to export.
 */
export function exportToPdf(title: string, data: Record<string, any>[]) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const headers = Object.keys(data[0]);
  const tableHead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
  const tableBody = `<tbody>${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
  const table = `<table class="w-full">${tableHead}${tableBody}</table>`;

  const styles = `
    <style>
      body { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        -webkit-print-color-adjust: exact; 
        margin: 0;
        padding: 0;
      }
      .container { padding: 20px; }
      h1 { text-align: center; margin-bottom: 20px; font-size: 24px; color: #111827; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; }
      th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
      tr:nth-child(even) { background-color: #f9fafb; }
      @page { 
        size: A4 landscape; 
        margin: 15mm; 
      }
    </style>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          ${styles}
        </head>
        <body>
          <div class="container">
            <h1>${title}</h1>
            ${table}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } else {
    alert('No se pudo abrir la ventana de impresión. Por favor, deshabilite su bloqueador de ventanas emergentes.');
  }
}
