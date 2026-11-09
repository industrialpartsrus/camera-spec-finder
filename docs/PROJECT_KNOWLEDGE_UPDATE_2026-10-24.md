# Zebra Label Printing Fix — Oct 24, 2026

Oct 24, 2026 · @Scott Kennedy

Phone → Firebase → print monitor → printer is all working now.

## Completed

- Found the print listener page: camera-spec-finder.vercel.app/print-monitor
- Found why the printer kept changing addresses (DHCP) and that the Netgear RAX41, not the AT&T gateway, assigns the 10.0.0.x addresses
- Reserved IPs on the Netgear: ZD620 product labels → 10.0.0.27, shipping labels → 10.0.0.28
- Saved direct thermal mode to the ZD620 (^MTD + ^JUS)
- Created the missing Firestore index for printQueue. This was the real reason phone printing had never worked: the print monitor's search failed silently and the page still showed "Listening"

## Code changes (deployed)

- lib/zebra-print.js line 10: DEFAULT_PRINTER_IP changed to '10.0.0.27'
- pages/print-monitor.js line 9: default IP changed to '10.0.0.27'
- pages/print-monitor.js line 40: the monitor now always uses its own IP instead of the IP stored on each queued label

## Next (optional)

- Make print monitor errors visible. The index problem went unnoticed for months because the monitor's Firebase listener has no error handler. A small fix would show a red "⚠ Queue error: ..." box on the page instead of a fake green "Listening."
- Move the printer IP into a Firestore settings doc so a future change doesn't need a redeploy. Lower priority now that the IP is reserved.

## Project Knowledge updates

- ZD620 product label printer: 10.0.0.27 (reserved). Shipping label printer: 10.0.0.28 (reserved)
- Network: AT&T gateway (192.168.1.x) → Netgear RAX41 (assigns 10.0.0.x). The Netgear admin page is at routerlogin.net, and reservations go there
- Printers and the print monitor computer must be on the Netgear WiFi, not ATT6DrGxdy
- printQueue requires a composite index: printed ascending + requestedAt ascending (now created)
- Print monitor uses its own IP setting and ignores the printerIp field stored on queued labels
- The app's generateLabelZpl() already includes ^PW600 and ^LL300; media type and darkness come from the printer's saved settings
