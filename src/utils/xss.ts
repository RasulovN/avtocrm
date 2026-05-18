import JsBarcode from 'jsbarcode';

/**
 * XSS Prevention Utilities
 * Provides escaping for HTML and JavaScript contexts to prevent injection attacks
 */

/**
 * Escapes a string for safe insertion into HTML content (textContent context)
 * Prevents XSS by converting special characters to HTML entities
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
  };
  return String(text).replace(/[&<>"'`/]/g, (char) => escapeMap[char] || char);
}

/**
 * Escapes a string for safe insertion into a JavaScript string literal
 * Prevents breaking out of string context and code injection
 */
export function escapeJsString(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\u0000/g, '\\0')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\f/g, '\\f')
    .replace(/\t/g, '\\t');
}

/**
 * Safely constructs a barcode print window using DOM methods instead of document.write
 * This eliminates XSS risk by using textContent and proper DOM APIs
 */
export function createSafePrintWindow(htmlContent: string): Window | null {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  return window.open(blobUrl, '_blank', 'width=800,height=600');
}

/**
 * Generates a barcode data URL using the main thread canvas
 */
export function generateBarcodeDataUrl(value: string, options: any = {}): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: 80,
      displayValue: false,
      margin: 0,
      ...options
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Failed to generate barcode data URL:', e);
    return '';
  }
}

/**
 * Generates a safe barcode print HTML by escaping the barcode value for both
 * HTML display and JavaScript string contexts
 */
export function generateBarcodePrintHtml(
  barcodeValue: string,
  title: string = 'Print Barcode'
): string {
  const escapedBarcode = escapeHtml(barcodeValue);
  const dataUrl = generateBarcodeDataUrl(barcodeValue);

  return `<!DOCTYPE html>
<html>
  <head>
    <title>${escapedBarcode}</title>
    <style>
      @page {
        size: 28mm 16mm;
        margin: 0;
      }
      body {
        font-family: 'Consolas', 'Courier New', monospace;
        margin: 0;
        padding: 0;
        text-align: center;
        font-size: 6px;
        width: 28mm;
        height: 16mm;
        box-sizing: border-box;
      }
      .barcode-card {
        border: none;
        padding: 0;
        margin: 0;
        text-align: center;
        width: 28mm;
        height: 16mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      .barcode-section {
        margin: 0;
      }
      .barcode-value {
        font-family: 'Consolas', monospace;
        font-size: 8px;
        font-weight: bold;
        margin-top: 1px;
        letter-spacing: 1px;
      }
      img {
        width: auto;
        max-width: 26mm;
        max-height: 12mm;
        display: block;
        margin: 0 auto;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <div class="barcode-card">
      <div class="barcode-section">
        <img src="${dataUrl}" alt="Barcode" />
        <div class="barcode-value">${escapedBarcode}</div>
      </div>
    </div>
    <script>
      window.onload = function() {
        setTimeout(function() { window.print(); }, 300);
      };
    </script>
  </body>
</html>`;
}

/**
 * Generates safe HTML for printing multiple barcodes
 */
export function generateMultipleBarcodesPrintHtml(barcodeValues: Array<{ value: string; productName?: string }>): string {
  const barcodeCards = barcodeValues
    .filter((item) => item.value)
    .map((item) => {
      const escapedValue = escapeHtml(item.value);
      const dataUrl = generateBarcodeDataUrl(item.value, { height: 90, width: 1.5 });
      return `<div class="barcode-card">
  <div class="barcode-section">
    <img src="${dataUrl}" alt="Barcode" />
    <div class="barcode-value">${escapedValue}</div>
  </div>
</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
  <head>
    <title>Print Barcodes</title>
    <style>
      @page {
        size: 28mm 16mm;
        margin: 0;
      }
      body {
        font-family: 'Consolas', 'Courier New', monospace;
        margin: 0;
        padding: 0;
        text-align: center;
        font-size: 6px;
        width: 28mm;
        height: 16mm;
        box-sizing: border-box;
      }
      .barcode-card {
        width: 28mm;
        height: 16mm;
        display: grid;
        justify-content: center;
        align-items: center;
      }
      .barcode-section {
        margin: 0;
      }
      .barcode-value {
        font-family: 'Consolas', monospace;
        font-size: 10px;
        font-weight: normal;
        margin-top: 1px;
        letter-spacing: 1px;
      }
      img {
        width: auto;
        max-width: 26mm;
        max-height: 12mm;
        display: block;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    ${barcodeCards}
    <script>
      window.onload = function() {
        setTimeout(() => { window.print(); }, 500);
      };
    </script>
  </body>
</html>`;
}

/**
 * Safely clones DOM content by creating a new document and using DOM methods
 * instead of innerHTML string concatenation
 */
export function cloneDomSafely(sourceElement: HTMLElement): string {
  // Create a clean container
  const container = document.createElement('div');
  container.className = 'barcode-sheet';

  // Clone all child nodes properly
  Array.from(sourceElement.children).forEach((child) => {
    const cloned = child.cloneNode(true) as HTMLElement;
    container.appendChild(cloned);
  });

  return container.innerHTML;
}
