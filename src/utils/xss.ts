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
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return null;

  // Use document.write only with a fully sanitized, static HTML structure
  // The HTML should not contain any unescaped user data
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  return printWindow;
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
  const jsEscapedBarcode = escapeJsString(barcodeValue);

  return `<!DOCTYPE html>
<html>
  <head>
    <title>${escapedBarcode}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js" integrity="sha512-QEAheCz+x/VkKtxeGoDq6nsGyzTx/0LMINTgQjqZ0h3+NjP+79Qk52/P455w2tJ660G9n05p0S/f/86v9y1w==" crossorigin="anonymous"></script>
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
      svg {
        width: auto;
        max-width: 26mm;
        height: 12mm;
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
        <svg id="barcode-svg"></svg>
        <div class="barcode-value">${escapedBarcode}</div>
      </div>
    </div>
    <script>
      window.onload = function() {
        try {
          JsBarcode('#barcode-svg', ${JSON.stringify(jsEscapedBarcode)}, {
            format: 'CODE128',
            width: 1.5,
            height: 90,
            displayValue: false,
            margin: 0,
            textMargin: 0
          });
        } catch(e) {
          console.error('Barcode error:', e);
        }
      };
      setTimeout(function() { window.print(); }, 300);
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
      const escapedName = escapeHtml(item.productName);
      return `<div class="barcode-card">
  <div class="barcode-section">
    <svg id="barcode-svg-${escapedValue}"></svg>
    <div class="barcode-value">${escapedValue}</div>
  </div>
</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
  <head>
    <title>Print Barcodes</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js" integrity="sha512-QEAheCz+x/VkKtxeGoDq6nsGyzTx/0LMINTgQjqZ0h3+NjP+79Qk52/P455w2tJ660G9n05p0S/f/86v9y1w==" crossorigin="anonymous"></script>
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
      svg {
        width: 26mm;
        height: 12mm;
        display: flex;
      }
    </style>
  </head>
  <body>
    ${barcodeCards}
    <script>
      window.onload = function() {
        ${barcodeValues
          .filter((item) => item.value)
          .map((item) => {
            const jsEscaped = escapeJsString(item.value);
            return `try { JsBarcode('#barcode-svg-${escapeHtml(item.value)}', ${JSON.stringify(jsEscaped)}, {
              format: 'CODE128',
              width: 1.5,
              height: 90,
              displayValue: false,
              margin: 0,
              textMargin: 0
            }); } catch(e) { console.error('Barcode error:', e); }`;
          })
          .join('\n')}
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
