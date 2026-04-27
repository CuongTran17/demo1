import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Xuất dữ liệu ra file Excel
 * @param {Array<Object>} data Mảng dữ liệu
 * @param {string} filename Tên file (không bao gồm .xlsx)
 */
export const exportToExcel = (data, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Tải font chữ từ thư mục public để dùng cho jsPDF
 */
async function addVietnameseFont(doc) {
  try {
    // Tải font Regular
    const fontRes = await fetch('/fonts/BeVietnamPro-Regular.ttf');
    const fontBuffer = await fontRes.arrayBuffer();
    const fontBase64 = arrayBufferToBase64(fontBuffer);
    
    doc.addFileToVFS('BeVietnamPro-Regular.ttf', fontBase64);
    doc.addFont('BeVietnamPro-Regular.ttf', 'BeVietnamPro', 'normal');
    
    // Tải font Bold
    const fontBoldRes = await fetch('/fonts/BeVietnamPro-Bold.ttf');
    const fontBoldBuffer = await fontBoldRes.arrayBuffer();
    const fontBoldBase64 = arrayBufferToBase64(fontBoldBuffer);
    
    doc.addFileToVFS('BeVietnamPro-Bold.ttf', fontBoldBase64);
    doc.addFont('BeVietnamPro-Bold.ttf', 'BeVietnamPro', 'bold');
    
    doc.setFont('BeVietnamPro');
  } catch (err) {
    console.error('Không thể tải font tiếng Việt:', err);
  }
}

// Helper để chuyển ArrayBuffer sang Base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Xuất dữ liệu ra file PDF
 * @param {Array<Object>} data Mảng dữ liệu (mỗi phần tử là 1 row)
 * @param {string} filename Tên file đầu ra
 * @param {string} title Tiêu đề báo cáo hiển thị trên PDF
 */
export const exportToPDF = async (data, filename, title) => {
  if (!data || data.length === 0) return;

  // Lấy danh sách cột từ keys của object đầu tiên
  const columns = Object.keys(data[0]);
  const rows = data.map(item => columns.map(key => item[key]));

  const doc = new jsPDF();
  
  // Tải và cài đặt font tiếng Việt
  await addVietnameseFont(doc);

  // Tiêu đề
  doc.setFontSize(16);
  doc.setFont('BeVietnamPro', 'bold');
  doc.text(title, 14, 22);
  
  // Thông tin ngày xuất
  doc.setFontSize(10);
  doc.setFont('BeVietnamPro', 'normal');
  doc.text(`Ngày xuất: ${new Date().toLocaleString('vi-VN')}`, 14, 30);

  // Vẽ bảng
  autoTable(doc, {
    startY: 36,
    head: [columns],
    body: rows,
    styles: { font: 'BeVietnamPro' },
    headStyles: { 
      font: 'BeVietnamPro', 
      fontStyle: 'bold',
      fillColor: [37, 99, 235], // ds-primary color
      textColor: [255, 255, 255]
    },
    columnStyles: {},
  });

  doc.save(`${filename}.pdf`);
};
