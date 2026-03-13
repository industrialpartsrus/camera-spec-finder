import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot,
  updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function PrintMonitor() {
  const [status, setStatus] = useState('connecting');
  const [printLog, setPrintLog] = useState([]);
  const [printerIp, setPrinterIp] = useState('10.0.0.46');
  const [isListening, setIsListening] = useState(true);
  const printedRef = useRef(new Set());

  useEffect(() => {
    if (!isListening) return;

    setStatus('listening');

    // Watch for unprinted labels
    const q = query(
      collection(db, 'printQueue'),
      where('printed', '==', false),
      orderBy('requestedAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const labelDoc = change.doc;
          const label = labelDoc.data();

          // Prevent double-printing
          if (printedRef.current.has(labelDoc.id)) return;
          printedRef.current.add(labelDoc.id);

          try {
            // Send to printer via Chrome extension
            window.postMessage({
              type: 'zebra_print_label',
              zpl: label.zpl,
              url: `http://${label.printerIp || printerIp}/pstprnt`
            }, '*');

            // Mark as printed in Firebase
            await updateDoc(doc(db, 'printQueue', labelDoc.id), {
              printed: true,
              printedAt: serverTimestamp(),
              printedBy: 'print-monitor',
            });

            // Add to log
            setPrintLog(prev => [{
              id: labelDoc.id,
              sku: label.sku,
              brand: label.brand,
              partNumber: label.partNumber,
              requestedBy: label.requestedBy,
              time: new Date().toLocaleTimeString(),
              status: 'printed'
            }, ...prev].slice(0, 50)); // Keep last 50

            console.log(`Printed label for ${label.sku}`);

          } catch (err) {
            console.error('Print failed:', err);
            setPrintLog(prev => [{
              id: labelDoc.id,
              sku: label.sku,
              time: new Date().toLocaleTimeString(),
              status: 'error',
              error: err.message
            }, ...prev].slice(0, 50));
          }
        }
      });
    });

    return () => unsubscribe();
  }, [isListening, printerIp]);

  return (
    <div style={{
      maxWidth: '600px', margin: '0 auto', padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
        🖨️ IPRU Print Monitor
      </h1>

      <div style={{
        padding: '16px', borderRadius: '12px', marginBottom: '20px',
        backgroundColor: isListening ? '#dcfce7' : '#fef3c7',
        border: isListening ? '2px solid #16a34a' : '2px solid #d97706',
      }}>
        <div style={{
          fontSize: '18px', fontWeight: 'bold',
          color: isListening ? '#16a34a' : '#d97706'
        }}>
          {isListening ? '● Listening for labels...' : '⏸ Paused'}
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
          Printer: {printerIp}
        </div>
        <button
          onClick={() => setIsListening(!isListening)}
          style={{
            marginTop: '8px', padding: '8px 16px',
            backgroundColor: isListening ? '#d97706' : '#16a34a',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          {isListening ? 'Pause' : 'Resume'}
        </button>
      </div>

      <div style={{
        padding: '12px', backgroundColor: '#eff6ff',
        border: '1px solid #93c5fd', borderRadius: '8px',
        marginBottom: '20px', fontSize: '13px', color: '#1e40af'
      }}>
        💡 Keep this tab open on a computer near the label printer.
        When anyone taps "Print Label" on their phone, the label
        prints automatically here.
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
        Recent Labels ({printLog.length})
      </h2>

      {printLog.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic' }}>
          No labels printed yet. Waiting for requests...
        </p>
      ) : (
        <div>
          {printLog.map((entry, idx) => (
            <div key={entry.id || idx} style={{
              padding: '10px 12px', marginBottom: '8px',
              backgroundColor: entry.status === 'printed' ? '#f0fdf4' : '#fef2f2',
              border: entry.status === 'printed' ? '1px solid #bbf7d0' : '1px solid #fecaca',
              borderRadius: '8px', fontSize: '14px'
            }}>
              <div style={{ fontWeight: 'bold' }}>
                {entry.status === 'printed' ? '✅' : '❌'} {entry.sku}
                <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                  {entry.brand} {entry.partNumber}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                {entry.time} — requested by {entry.requestedBy}
                {entry.error && <span style={{ color: '#dc2626' }}> — {entry.error}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
