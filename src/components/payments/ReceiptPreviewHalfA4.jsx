import React from 'react';

// Visual preview of a receipt occupying the upper half of an A4 page when printed.
// This component is screen-friendly and includes print CSS to ensure top-half alignment.
// Props: data = { memberName, memberEmail, amount, planType, duration, paymentMethod, transactionId, notes, periodStart, periodEnd, trainerName }, compact = false

const ReceiptPreviewHalfA4 = ({ data, gymTitle, compact = false }) => {
  const scaleFactor = compact ? 0.7 : 1;
  const wrapperWidth = compact ? '600px' : '800px';
  const fontSizeBase = compact ? 12 : 14;
  const paddingBase = compact ? 12 : 16;

  const styles = {
    wrapper: {
      background: 'white',
      color: 'black',
      width: '100%',
      maxWidth: wrapperWidth,
      margin: '0 auto',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      transform: `scale(${scaleFactor})`,
      transformOrigin: 'top center',
      marginBottom: compact ? '-100px' : '0' // Adjust for scale to prevent extra space
    },
    sectionTitle: {
      fontWeight: 700,
      fontSize: `${fontSizeBase + 2}px`,
      color: '#111827',
      marginBottom: '8px'
    },
    row: {
      display: 'grid',
      gridTemplateColumns: compact ? '120px 1fr' : '140px 1fr',
      gap: '8px',
      marginBottom: '6px',
      alignItems: 'start'
    },
    label: { fontWeight: 600, color: '#111827', fontSize: `${fontSizeBase}px` },
    value: { color: '#111827', fontSize: `${fontSizeBase}px` }
  };

  return (
    <div>
      {/* Print styles for exact half A4 layout */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #half-a4-receipt {
            height: calc(297mm / 2 - 24mm); /* half minus margins */
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div id="half-a4-receipt" style={styles.wrapper}>
        {/* Header */}
        <div style={{ padding: `${paddingBase}px ${paddingBase + 4}px`, borderBottom: '1px solid #d1d5db' }}>
          <div style={{ fontSize: `${fontSizeBase + 4}px`, fontWeight: 700, textAlign: 'center' }}>
            {(gymTitle || 'GYM PAYMENT RECEIPT').toUpperCase()}
          </div>
          <div style={{ textAlign: 'center', color: '#374151', marginTop: 4, fontSize: `${fontSizeBase}px` }}>
            Date: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: `${paddingBase}px ${paddingBase + 4}px` }}>
          <div style={styles.sectionTitle}>Member Details</div>
          <div style={{ marginBottom: 10 }}>
            <div style={styles.row}><div style={styles.label}>Name:</div><div style={styles.value}>{data?.memberName || ''}</div></div>
            <div style={styles.row}><div style={styles.label}>Email:</div><div style={styles.value}>{data?.memberEmail || ''}</div></div>
            {data?.trainerName ? (
              <div style={styles.row}><div style={styles.label}>Trainer:</div><div style={styles.value}>{data?.trainerName}</div></div>
            ) : null}
          </div>

          <div style={styles.sectionTitle}>Payment Details</div>
          <div>
            <div style={styles.row}><div style={styles.label}>Plan:</div><div style={styles.value}>{data?.planType || ''}</div></div>
            <div style={styles.row}><div style={styles.label}>Duration:</div><div style={styles.value}>{data?.duration || ''} month(s)</div></div>
            <div style={styles.row}><div style={styles.label}>Method:</div><div style={styles.value}>{data?.paymentMethod || ''}</div></div>
            <div style={styles.row}><div style={styles.label}>Amount:</div><div style={{...styles.value, fontWeight: 700, color: '#059669'}}>₹{data?.amount || '0'}</div></div>
            <div style={styles.row}><div style={styles.label}>Period:</div><div style={styles.value}>{data?.periodStart || ''} to {data?.periodEnd || ''}</div></div>
            {data?.transactionId ? (
              <div style={styles.row}><div style={styles.label}>Txn ID:</div><div style={styles.value}>{data?.transactionId}</div></div>
            ) : null}
            {data?.notes ? (
              <div style={styles.row}><div style={styles.label}>Notes:</div><div style={styles.value}>{data?.notes}</div></div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: `8px ${paddingBase + 4}px ${paddingBase}px`, borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#6b7280', fontSize: fontSizeBase }}>
          Thank you for your payment!
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreviewHalfA4;