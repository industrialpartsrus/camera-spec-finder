// lib/zebra-print.js
// Client-side utility for printing labels to a Zebra ZD620 (ZPL mode)
// Supports two modes:
//   Desktop: Direct print via "Zebra Printing" Chrome extension (postMessage)
//   Mobile:  Queue to Firebase printQueue for print-monitor to pick up

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_PRINTER_IP = '10.0.0.46';

/**
 * Check if Zebra Chrome extension is available.
 * Returns true on desktop Chrome with extension, false on mobile.
 */
export function hasZebraExtension() {
  // Mobile browsers don't support extensions
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return false;
  }
  // On desktop, assume extension is installed if not mobile
  // (the extension silently ignores messages if not installed)
  return true;
}

/**
 * Print ZPL directly via Chrome extension (desktop only)
 */
export function printZplDirect(zpl, printerIp = DEFAULT_PRINTER_IP) {
  window.postMessage({
    type: 'zebra_print_label',
    zpl: zpl,
    url: `http://${printerIp}/pstprnt`
  }, '*');
}

/**
 * Queue a label for printing via Firebase (mobile or fallback)
 */
export async function queueLabelForPrint(labelData) {
  const zpl = generateLabelZpl(labelData);

  await addDoc(collection(db, 'printQueue'), {
    zpl: zpl,
    sku: labelData.sku || '',
    brand: labelData.brand || '',
    partNumber: labelData.partNumber || '',
    requestedBy: labelData.requestedBy || 'Unknown',
    requestedAt: serverTimestamp(),
    printed: false,
    printerIp: DEFAULT_PRINTER_IP,
  });

  return true;
}

/**
 * Main print function — auto-detects desktop vs mobile.
 * Desktop: prints directly via Chrome extension
 * Mobile: queues to Firebase for print monitor to pick up
 */
export async function printProductLabel(item, printerIp) {
  const zpl = generateLabelZpl(item);

  if (hasZebraExtension()) {
    // Desktop — print directly
    printZplDirect(zpl, printerIp || DEFAULT_PRINTER_IP);
    return { method: 'direct', success: true };
  } else {
    // Mobile — queue for print monitor
    await queueLabelForPrint(item);
    return { method: 'queued', success: true };
  }
}

/**
 * Generate ZPL for a product inventory label.
 * Label size: 2" x 1" (600w x 300h dots at 300dpi)
 *
 * Layout:
 * ┌────────────────────────────────┐
 * │ |||||||||||||||||||||||         │ Code 128 barcode
 * │ AI0047          $149.99        │ SKU + Price
 * │ Allen-Bradley 1756-L72         │ Brand + Part
 * │ D-15 Tub 3       03/12/2026   │ Shelf + Date
 * └────────────────────────────────┘
 */
export function generateLabelZpl({
  sku = '',
  brand = '',
  partNumber = '',
  shelf = '',
  price = '',
  title = '',
  condition = ''
}) {
  const cleanSku = sku.toUpperCase().substring(0, 15);
  const cleanBrand = (brand || '').substring(0, 20);
  const cleanPart = (partNumber || '').substring(0, 20);
  const cleanShelf = (shelf || 'N/A').substring(0, 15);
  const cleanPrice = price ? `$${parseFloat(price).toFixed(2)}` : '';
  const cleanCondition = (condition || '').substring(0, 15);

  // Format today's date as MM/DD/YYYY
  const now = new Date();
  const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;

  // Build brand + part line (truncate to fit 2" width)
  let brandPart = '';
  if (cleanBrand && cleanPart) {
    brandPart = `${cleanBrand} ${cleanPart}`;
  } else {
    brandPart = cleanBrand || cleanPart || '';
  }
  brandPart = brandPart.substring(0, 32);

  // ZPL for 2" x 1" label at 300dpi (600 dots wide x 300 dots tall)
  return `
^XA
^PW600
^LL300
^LH0,0

^FO30,15^BY2,2,60
^BCN,60,N,N,N
^FD${cleanSku}^FS

^FO30,85^A0N,28,28^FD${cleanSku}^FS
${cleanPrice ? `^FO400,85^A0N,28,28^FD${cleanPrice}^FS` : ''}

^FO30,120^A0N,24,24^FD${brandPart}^FS

${cleanCondition ? `^FO30,150^A0N,20,20^FD${cleanCondition}^FS` : ''}

^FO30,180^A0N,22,22^FD${cleanShelf}^FS
^FO350,180^A0N,22,22^FD${dateStr}^FS

^FO30,210^GB540,0,2^FS

^FO30,220^A0N,24,24^FDIPRU^FS
^FO350,220^A0N,20,20^FDScan to lookup^FS

^XZ
`.trim();
}
