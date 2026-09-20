/**
 * Utility for exporting data to Excel (.xlsx) files.
 * Uses dynamic imports for 'xlsx' to reduce initial bundle sizes.
 */
export const exportToExcel = async (dataToExport, sheetName = "Sheet1", fileName = "export.xlsx") => {
  try {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
  }
};

/**
 * Utility for exporting multiple datasets to Excel (.xlsx) files with multiple sheets.
 * @param {Array<{data: Array, sheetName: string}>} sheets - Array of sheet configurations
 * @param {string} fileName - Output file name
 */
export const exportMultipleToExcel = async (sheets, fileName = "export.xlsx") => {
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    
    sheets.forEach(({ data, sheetName }) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    if (sheets.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ "Message": "No Data" }]), "Empty");
    }

    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Error exporting multiple sheets to Excel:', error);
    alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel Backup');
  }
};

/**
 * Utility for exporting data to PDF files.
 * Uses dynamic imports for 'jspdf' and 'jspdf-autotable' to reduce initial bundle sizes.
 */
export const exportToPDF = async (docTitle, tableColumns, tableRows, fileName = "export.pdf") => {
  try {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.addFont('/Sarabun-Regular.ttf', 'Sarabun', 'normal');
    doc.setFont('Sarabun');

    doc.setFontSize(16);
    doc.text(docTitle, 14, 15);

    doc.autoTable({
      startY: 25,
      head: [tableColumns],
      body: tableRows,
      styles: {
        font: 'Sarabun',
        fontStyle: 'normal'
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255
      }
    });

    doc.save(fileName);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ PDF');
  }
};
