// lib/zebra-print.js
// Client-side utility for printing labels to a Zebra ZD620 (ZPL mode)
// Uses the "Zebra Printing" Chrome extension (ID: ndikjdigobmbieacjcgomahigeiobhbo)
// which bypasses CORS/mixed-content via window.postMessage()

const DEFAULT_PRINTER_IP = '10.0.0.46';

/**
 * Print raw ZPL to the Zebra printer via the Zebra Printing Chrome extension.
 * Sends ZPL via window.postMessage() — the extension intercepts and POSTs to printer.
 *
 * @param {string} zpl - Raw ZPL commands
 * @param {string} printerIp - Printer IP (default: 10.0.0.46)
 */
export function printZpl(zpl, printerIp = DEFAULT_PRINTER_IP) {
  return new Promise((resolve, reject) => {
    // Send ZPL via the Zebra Printing Chrome extension
    window.postMessage({
      type: 'zebra_print_label',
      zpl: zpl,
      url: `http://${printerIp}/pstprnt`
    }, '*');

    // Extension doesn't send back a confirmation, so resolve
    // after a short delay
    setTimeout(() => resolve(true), 1500);
  });
}

/**
 * Check if the Zebra Printing Chrome extension is installed.
 * The extension broadcasts its version on page load via postMessage.
 *
 * @returns {Promise<boolean>} true if extension detected
 */
export function checkZebraExtension() {
  return new Promise((resolve) => {
    let found = false;

    const handler = (event) => {
      if (event.data && event.data.ZebraPrintingVersion) {
        found = true;
        window.removeEventListener('message', handler);
        resolve(true);
      }
    };

    window.addEventListener('message', handler);

    // Extension broadcasts its version on page load,
    // but if we're checking later, give it a moment
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(found);
    }, 2000);
  });
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

/**
 * Print a product label (convenience function).
 * Generates ZPL from item data and sends to printer.
 * Alerts user if the Zebra Printing Chrome extension is not installed.
 */
export async function printProductLabel(item, printerIp) {
  const zpl = generateLabelZpl(item);

  // Try to print
  try {
    await printZpl(zpl, printerIp);
    return true;
  } catch (err) {
    // If it fails, check for extension
    alert(
      'Label printing requires the Zebra Printing Chrome extension.\n\n' +
      'Install it from:\n' +
      'Chrome Web Store → search "Zebra Printing"\n\n' +
      'Extension ID: ndikjdigobmbieacjcgomahigeiobhbo'
    );
    return false;
  }
}
