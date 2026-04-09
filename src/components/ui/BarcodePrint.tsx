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
    shtrix_code?: string;
    product_name?: string;
    quantity: number;
  }>;
}

const isImageUrl = (value: string): boolean => {
  if (!value) return false;
  return value.startsWith('/media/') || value.startsWith('http://') || value.startsWith('https://');
};

function BarcodeDisplay({ value, isImage = false }: { value: string; isImage?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value && !isImage) {
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
  }, [value, isImage]);

  if (isImage && value) {
    return (
      <img 
        src={value} 
        alt="Barcode" 
        className="max-w-[150px] h-auto"
        style={{ maxWidth: '150px' }}
      />
    );
  }

  return <svg ref={svgRef}></svg>;
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
              page-break-inside: avoid;
            }
            .product-name { 
              font-size: 11px; 
              margin-bottom: 3px; 
            }
            .barcode-container svg, .barcode-container img {
              max-width: 150px;
              max-height: 80px;
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
    .filter(item => item.shtrix_code || item.barcode)
    .flatMap(item => {
      const barcodeValue = item.shtrix_code || item.barcode || '';
      if (!barcodeValue) return [];
      const qty = item.quantity || 1;
      return Array.from({ length: qty }, (_, i) => ({
        barcode: barcodeValue,
        isImage: isImageUrl(barcodeValue),
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
                  <BarcodeDisplay value={item.barcode} isImage={item.isImage} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}