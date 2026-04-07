import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodePrintProps {
  value: string;
  productName?: string;
  showName?: boolean;
}

export function BarcodePrint({ value, productName, showName = true }: BarcodePrintProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 1.8,
          height: 52,
          displayValue: true,
          fontSize: 11,
          margin: 0,
          textMargin: 4,
        });
      } catch (error) {
        console.error('Failed to generate barcode:', error);
      }
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center">
      {showName && productName && (
        <span className="text-xs mb-1">{productName}</span>
      )}
      <svg ref={svgRef}></svg>
    </div>
  );
}

interface BarcodePrintAllProps {
  items: Array<{
    barcode?: string;
    product_name?: string;
    quantity: number;
  }>;
}

export function BarcodePrintAll({ items }: BarcodePrintAllProps) {
  const [printMode, setPrintMode] = useState(false);

  const handlePrint = () => {
    const printContent = document.getElementById('barcode-print-container');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcodes</title>
          <style>
            @media print {
              .page-break { page-break-after: always; }
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
            }
            .barcode-item { 
              display: inline-block; 
              margin: 10px; 
              padding: 10px; 
              border: 1px dashed #ccc;
              text-align: center;
            }
            .product-name { 
              font-size: 11px; 
              margin-bottom: 3px; 
            }
            .barcode-container svg {
              max-width: 150px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const allBarcodes = items
    .filter(item => item.barcode)
    .flatMap(item => {
      const qty = item.quantity || 1;
      return Array.from({ length: qty }, (_, i) => ({
        barcode: item.barcode!,
        product_name: item.product_name,
        index: i + 1,
      }));
    });

  if (allBarcodes.length === 0) return null;

  return (
    <div className="space-y-4">
      {!printMode && (
        <button
          onClick={() => setPrintMode(true)}
          className="text-sm text-blue-600 hover:underline"
        >
          {printMode ? 'Close' : `Show Barcodes (${allBarcodes.length})`}
        </button>
      )}
      
      {printMode && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Print All
            </button>
            <button
              onClick={() => setPrintMode(false)}
              className="px-3 py-1 bg-gray-200 rounded text-sm"
            >
              Close
            </button>
          </div>
          
          <div id="barcode-print-container" className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded">
            {allBarcodes.map((item, idx) => (
              <div key={idx} className="barcode-item p-2 bg-white">
                <div className="product-name text-xs">{item.product_name}</div>
                <div className="barcode-container">
                  <BarcodeDisplay value={item.barcode} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BarcodeDisplay({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 1.8,
          height: 48,
          displayValue: true,
          fontSize: 10,
          margin: 0,
          textMargin: 4,
        });
      } catch (error) {
        console.error('Failed to generate barcode:', error);
      }
    }
  }, [value]);

  return <svg ref={svgRef}></svg>;
}
