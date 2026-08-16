import React from 'react';
import {
  FaCheckCircle,
  FaDownload,
  FaIdCard,
  FaPrint,
  FaShieldAlt,
  FaTimes
} from 'react-icons/fa';
import '../styles/DeliveryPaymentInvoice.css';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatMoney = (value) => `৳${(Number(value) || 0).toLocaleString('en-US')}`;
const formatPdfMoney = (value) => `BDT ${(Number(value) || 0).toFixed(2)}`;

const titleCase = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildInvoiceNumber = (applicationId, transactionId) => {
  const transactionPart = String(transactionId || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(-10)
    .toUpperCase();
  const applicationPart = String(applicationId || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(-6)
    .toUpperCase();

  return `SNID-${applicationPart || 'APP'}-${transactionPart || 'PAYMENT'}`;
};


const toPdfText = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[–—]/g, '-')
    .replace(/[•]/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();

const pdfEscape = (value) =>
  toPdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const buildSimpleInvoicePdf = ({
  invoiceNumber,
  applicationId,
  paidAt,
  citizenName,
  email,
  phone,
  address,
  transactionId,
  paymentMethod,
  amount
}) => {
  const pageHeight = 841.89;
  const commands = [];

  const rgb = (r, g, b) => `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
  const yPdf = (topY) => pageHeight - topY;
  const rect = (x, topY, width, height, fill) => {
    commands.push(`${fill} rg ${x} ${pageHeight - topY - height} ${width} ${height} re f`);
  };
  const line = (x1, topY1, x2, topY2, stroke, width = 1) => {
    commands.push(`${stroke} RG ${width} w ${x1} ${yPdf(topY1)} m ${x2} ${yPdf(topY2)} l S`);
  };
  const text = (value, x, topY, size = 10, bold = false, color = rgb(31, 50, 68)) => {
    const font = bold ? 'F2' : 'F1';
    commands.push(`${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${yPdf(topY)} Tm (${pdfEscape(value)}) Tj ET`);
  };
  const wrap = (value, maxChars) => {
    const words = toPdfText(value).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) lines.push(current);
    return lines.length ? lines : ['-'];
  };

  const green = rgb(7, 143, 105);
  const dark = rgb(18, 38, 58);
  const muted = rgb(100, 116, 139);
  const pale = rgb(248, 251, 250);
  const lightGreen = rgb(232, 248, 242);
  const border = rgb(220, 231, 227);

  rect(42, 42, 46, 46, green);
  text('ID', 58, 71, 13, true, rgb(255, 255, 255));
  text('Smart NID Card Management System', 101, 58, 16, true, dark);
  text('Secure citizen identity & delivery services', 101, 76, 8.5, false, muted);
  text('PAYMENT RECEIPT', 393, 58, 18, true, dark);
  rect(438, 67, 113, 19, lightGreen);
  text('PAID - VERIFIED', 458, 80, 8, true, rgb(6, 122, 87));
  line(42, 100, 553, 100, border, 0.8);

  const metaX = [42, 215, 388];
  const metaData = [
    ['RECEIPT NO.', invoiceNumber],
    ['APPLICATION ID', applicationId],
    ['PAYMENT DATE', formatDate(paidAt)]
  ];
  metaData.forEach(([label, value], index) => {
    rect(metaX[index], 116, 155, 50, pale);
    text(label, metaX[index] + 10, 132, 7, true, muted);
    const valueLines = wrap(value, 24).slice(0, 2);
    valueLines.forEach((lineValue, lineIndex) => {
      text(lineValue, metaX[index] + 10, 149 + lineIndex * 10, 8.5, true, dark);
    });
  });

  text('CITIZEN', 42, 198, 8, true, green);
  text('DELIVERY TO', 315, 198, 8, true, green);
  text(citizenName, 42, 216, 11, true, dark);
  text(email, 42, 234, 8.5, false, muted);
  text(phone, 42, 250, 8.5, false, muted);
  wrap(address, 43).slice(0, 4).forEach((lineValue, index) => {
    text(lineValue, 315, 216 + index * 14, 8.5, index === 0, index === 0 ? dark : muted);
  });

  rect(42, 292, 511, 31, green);
  text('DESCRIPTION', 54, 312, 8, true, rgb(255, 255, 255));
  text('QTY', 397, 312, 8, true, rgb(255, 255, 255));
  text('UNIT FEE', 442, 312, 8, true, rgb(255, 255, 255));
  text('AMOUNT', 505, 312, 8, true, rgb(255, 255, 255));

  text('Printed Smart NID Card Delivery', 54, 346, 10, true, dark);
  text(`Delivery request linked to ${applicationId}`, 54, 363, 7.8, false, muted);
  text('1', 405, 349, 9, false, dark);
  text(formatPdfMoney(amount), 442, 349, 9, false, dark);
  text(formatPdfMoney(amount), 501, 349, 9, true, rgb(6, 104, 79));
  line(42, 380, 553, 380, border, 0.8);

  text('Subtotal', 397, 415, 8.5, false, muted);
  text(formatPdfMoney(amount), 499, 415, 8.5, true, dark);
  text('Payment Method', 397, 435, 8.5, false, muted);
  text(paymentMethod, 474, 435, 8, true, dark);
  line(397, 449, 553, 449, green, 1.3);
  text('TOTAL PAID', 397, 472, 12, true, rgb(6, 104, 79));
  text(formatPdfMoney(amount), 487, 472, 12, true, rgb(6, 104, 79));

  rect(42, 516, 511, 76, rgb(243, 251, 248));
  text('TRANSACTION REFERENCE', 56, 538, 8, true, rgb(6, 104, 79));
  wrap(transactionId, 75).slice(0, 2).forEach((lineValue, index) => {
    text(lineValue, 56, 555 + index * 12, 8.5, true, dark);
  });
  text('This is a system-generated digital payment receipt for the Smart NID delivery request.', 56, 579, 7.5, false, muted);
  text('No handwritten signature is required.', 56, 590, 7.5, false, muted);

  line(42, 770, 553, 770, border, 0.8);
  text('Smart NID Card Management System', 42, 790, 7.2, false, muted);
  text(`Receipt: ${invoiceNumber}`, 390, 790, 7.2, false, muted);

  const stream = commands.join('\n');
  const encoder = new TextEncoder();
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`
  ];

  let pdf = '%PDF-1.4\n%SNID\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([encoder.encode(pdf)], { type: 'application/pdf' });
};

const DeliveryPaymentInvoice = ({ open, onClose, application }) => {
  if (!open || !application) return null;

  const deliveryInfo = application.deliveryInfo || {};
  const amount = deliveryInfo.deliveryFee || 80;
  const transactionId = deliveryInfo.transactionId || '—';
  const applicationId = application.applicationId || application._id || '—';
  const invoiceNumber = buildInvoiceNumber(applicationId, transactionId);
  const paidAt = deliveryInfo.paymentCompletedAt || deliveryInfo.requestedAt || application.updatedAt;
  const citizenName =
    application.fullNameEnglish || application.fullNameBangla || application.applicantName || 'Citizen';
  const email = application.email || '—';
  const phone = deliveryInfo.contactPhone || application.phone || '—';
  const address = deliveryInfo.deliveryAddress || '—';
  const applicationType = titleCase(application.applicationType || 'New NID');
  const paymentMethod =
    String(deliveryInfo.paymentMethod || '').toLowerCase() === 'sslcommerz'
      ? 'SSLCOMMERZ Sandbox'
      : titleCase(deliveryInfo.paymentMethod || 'Digital Payment');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=960,height=820');
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoiceNumber)} - Delivery Payment Receipt</title>
  <style>
    *{box-sizing:border-box} body{margin:0;background:#f3f6f8;color:#12263a;font-family:Arial,Helvetica,sans-serif;padding:28px}
    .sheet{max-width:820px;margin:0 auto;background:#fff;border:1px solid #dbe6e2;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.08)}
    .top{padding:30px 34px 24px;border-bottom:1px solid #e5ece9;display:flex;justify-content:space-between;gap:24px}
    .brand{display:flex;gap:14px;align-items:center}.logo{width:48px;height:48px;border:2px solid #079669;border-radius:14px;display:grid;place-items:center;color:#079669;font-size:22px;font-weight:700}
    .brand h1{font-size:20px;margin:0 0 4px}.brand p{margin:0;color:#64748b;font-size:12px}.receipt{text-align:right}.receipt h2{margin:0 0 6px;font-size:24px}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#e7f8f1;color:#067a57;font-size:11px;font-weight:700;letter-spacing:.06em}
    .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:22px 34px;background:#f8fbfa;border-bottom:1px solid #e5ece9}.meta div,.party{padding:13px 14px;border:1px solid #e3ebe8;border-radius:12px;background:#fff}.label{display:block;color:#718096;font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}.value{font-size:12px;font-weight:700;word-break:break-word}
    .content{padding:26px 34px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:26px}.party h3{font-size:12px;margin:0 0 12px;color:#087c5b;text-transform:uppercase;letter-spacing:.07em}.party p{font-size:12px;line-height:1.6;margin:3px 0;color:#334155}
    table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#0b7f60;color:#fff;text-align:left;padding:12px 14px;font-size:11px}td{padding:14px;border-bottom:1px solid #e7eeeb;font-size:12px}th:last-child,td:last-child{text-align:right}.service strong{display:block;margin-bottom:4px}.service span{color:#64748b;font-size:11px}
    .totals{margin-left:auto;margin-top:20px;width:310px}.totals div{display:flex;justify-content:space-between;padding:8px 2px;font-size:12px}.totals .grand{border-top:2px solid #0b7f60;margin-top:5px;padding-top:13px;font-size:16px;font-weight:800;color:#075e49}
    .footer{margin:26px 34px 30px;padding:16px 18px;border-radius:12px;background:#f3fbf8;border:1px solid #d5eee6;color:#49645b;font-size:10.5px;line-height:1.6}.footer strong{color:#0b6e54}
    @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border:0;border-radius:0;max-width:none}.no-print{display:none!important}}
  </style>
</head>
<body>
  <main class="sheet">
    <section class="top">
      <div class="brand"><div class="logo">ID</div><div><h1>Smart NID Card Management System</h1><p>Secure citizen identity & delivery services</p></div></div>
      <div class="receipt"><h2>Payment Receipt</h2><span class="badge">PAID • VERIFIED</span></div>
    </section>
    <section class="meta">
      <div><span class="label">Invoice / Receipt No.</span><span class="value">${escapeHtml(invoiceNumber)}</span></div>
      <div><span class="label">Application ID</span><span class="value">${escapeHtml(applicationId)}</span></div>
      <div><span class="label">Payment Date</span><span class="value">${escapeHtml(formatDate(paidAt))}</span></div>
    </section>
    <section class="content">
      <div class="parties">
        <div class="party"><h3>Citizen</h3><p><strong>${escapeHtml(citizenName)}</strong></p><p>${escapeHtml(email)}</p><p>${escapeHtml(phone)}</p></div>
        <div class="party"><h3>Delivery To</h3><p>${escapeHtml(address)}</p><p><strong>Application:</strong> ${escapeHtml(applicationType)}</p></div>
      </div>
      <table>
        <thead><tr><th>Description</th><th>Qty</th><th>Unit Fee</th><th>Amount</th></tr></thead>
        <tbody><tr><td class="service"><strong>Printed Smart NID Card Delivery</strong><span>Secure delivery request linked to ${escapeHtml(applicationId)}</span></td><td>1</td><td>${escapeHtml(formatMoney(amount))}</td><td><strong>${escapeHtml(formatMoney(amount))}</strong></td></tr></tbody>
      </table>
      <div class="totals"><div><span>Subtotal</span><strong>${escapeHtml(formatMoney(amount))}</strong></div><div><span>Payment Method</span><strong>${escapeHtml(paymentMethod)}</strong></div><div class="grand"><span>Total Paid</span><span>${escapeHtml(formatMoney(amount))}</span></div></div>
    </section>
    <section class="footer"><strong>Transaction ID:</strong> ${escapeHtml(transactionId)}<br/>This is a system-generated digital payment receipt for the Smart NID delivery request. No handwritten signature is required.</section>
  </main>
  <script>window.onload=function(){window.focus();window.print();}</script>
</body>
</html>`);
    printWindow.document.close();
  };

  const handleDownloadPdf = () => {
    const pdfBlob = buildSimpleInvoicePdf({
      invoiceNumber,
      applicationId,
      paidAt,
      citizenName,
      email,
      phone,
      address,
      transactionId,
      paymentMethod,
      amount
    });
    const url = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Smart-NID-Delivery-Receipt-${String(transactionId || applicationId).replace(/[^A-Za-z0-9_-]/g, '-')}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="delivery-invoice-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="delivery-invoice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-invoice-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delivery-invoice-toolbar">
          <div>
            <span className="delivery-invoice-toolbar-kicker">Payment document</span>
            <strong id="delivery-invoice-title">Delivery payment receipt</strong>
          </div>
          <div className="delivery-invoice-toolbar-actions">
            <button type="button" onClick={handlePrint}>
              <FaPrint /> Print
            </button>
            <button type="button" className="primary" onClick={handleDownloadPdf}>
              <FaDownload /> Download PDF
            </button>
            <button type="button" className="icon" onClick={onClose} aria-label="Close invoice">
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="delivery-invoice-paper">
          <div className="delivery-invoice-head">
            <div className="delivery-invoice-brand">
              <div className="delivery-invoice-brand-mark">
                <FaIdCard />
              </div>
              <div>
                <h2>Smart NID Card</h2>
                <p>Management System</p>
              </div>
            </div>
            <div className="delivery-invoice-title-block">
              <span className="delivery-invoice-paid-badge">
                <FaCheckCircle /> Paid & verified
              </span>
              <h1>Payment Receipt</h1>
              <p>Printed NID card delivery</p>
            </div>
          </div>

          <div className="delivery-invoice-meta-grid">
            <div>
              <span>Receipt No.</span>
              <strong>{invoiceNumber}</strong>
            </div>
            <div>
              <span>Application ID</span>
              <strong>{applicationId}</strong>
            </div>
            <div>
              <span>Payment Date</span>
              <strong>{formatDate(paidAt)}</strong>
            </div>
          </div>

          <div className="delivery-invoice-party-grid">
            <div className="delivery-invoice-party-card">
              <span className="delivery-invoice-section-label">Citizen</span>
              <strong>{citizenName}</strong>
              <p>{email}</p>
              <p>{phone}</p>
            </div>
            <div className="delivery-invoice-party-card">
              <span className="delivery-invoice-section-label">Delivery to</span>
              <strong>{address}</strong>
              <p>{applicationType} application</p>
            </div>
          </div>

          <div className="delivery-invoice-table-wrap">
            <table className="delivery-invoice-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit fee</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Printed Smart NID Card Delivery</strong>
                    <span>Secure delivery service for application {applicationId}</span>
                  </td>
                  <td>1</td>
                  <td>{formatMoney(amount)}</td>
                  <td>{formatMoney(amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="delivery-invoice-summary-row">
            <div className="delivery-invoice-security-note">
              <FaShieldAlt />
              <div>
                <strong>Secure payment record</strong>
                <span>Transaction reference is stored with your delivery request.</span>
              </div>
            </div>
            <div className="delivery-invoice-totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(amount)}</strong>
              </div>
              <div>
                <span>Payment method</span>
                <strong>{paymentMethod}</strong>
              </div>
              <div className="grand-total">
                <span>Total paid</span>
                <strong>{formatMoney(amount)}</strong>
              </div>
            </div>
          </div>

          <div className="delivery-invoice-reference">
            <span>Transaction ID</span>
            <strong>{transactionId}</strong>
          </div>

          <div className="delivery-invoice-footer">
            <p>
              This is a system-generated digital receipt for the Smart NID delivery request.
              No handwritten signature is required.
            </p>
            <span>Smart NID Card Management System</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPaymentInvoice;
