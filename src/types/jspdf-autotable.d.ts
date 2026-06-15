declare module 'jspdf-autotable' {
  import type { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    startY?: number;
    head?: string[][];
    body?: (string | number)[][];
    styles?: Record<string, unknown>;
    headStyles?: Record<string, unknown>;
    alternateRowStyles?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
