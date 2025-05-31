import * as XLSX from 'xlsx';
import axios from 'axios';

interface TreasuryData {
  date: string;
  opening: number;
  clientReceipts: number;
  supplierPayments: number;
  entrepreneur: number;
  travelExpenses: number;
  fuel: number;
  expenseNotes: number;
  cash: number;
  salaries: number;
  ir: number;
  is: number;
  cnss: number;
  healthInsurance: number;
  vat: number;
  cashFlow: number;
  closing: number;
}

export const getMonthlyInvoiceData = async (startDate: Date, endDate: Date) => {
  try {
    // Fetch all paid invoices within date range
    const response = await axios.get('http://localhost:3000/api/invoices', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'paid'
      }
    });

    // Get all contacts to identify clients and suppliers
    const contactsResponse = await axios.get('http://localhost:3000/api/contacts');
    const contacts = contactsResponse.data;

    // Create monthly aggregates
    const monthlyData: { [key: string]: { clientReceipts: number, supplierPayments: number } } = {};

    response.data.forEach((invoice: any) => {
      const date = new Date(invoice.paymentDate || invoice.date);
      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM format
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { clientReceipts: 0, supplierPayments: 0 };
      }

      // Find contact to determine if client or supplier
      const contact = contacts.find((c: any) => c.id === invoice.clientId);
      
      if (contact?.status === 'customer') {
        monthlyData[monthKey].clientReceipts += invoice.total;
      } else if (contact?.status === 'supplier') {
        monthlyData[monthKey].supplierPayments += invoice.total;
      }
    });

    return monthlyData;
  } catch (error) {
    console.error('Error fetching invoice data:', error);
    throw error;
  }
};

export const exportTreasuryTable = async (startDate: Date, endDate: Date) => {
  try {
    // Get monthly invoice data
    const monthlyData = await getMonthlyInvoiceData(startDate, endDate);

    // Get months between start and end date
    const months: string[] = [];
    const currentDate = new Date(startDate);
    
    const data: TreasuryData[] = [];
    
    while (currentDate <= endDate) {
      const monthKey = currentDate.toISOString().substring(0, 7);
      months.push(new Date(currentDate).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
      
      // Get monthly aggregates or use 0 if no data
      const monthData = monthlyData[monthKey] || { clientReceipts: 0, supplierPayments: 0 };
      
      // Calculate opening and closing balances
      const previousMonth = data[data.length - 1];
      const opening = previousMonth ? previousMonth.closing : 500000; // Initial balance
      const cashFlow = monthData.clientReceipts - monthData.supplierPayments;
      const closing = opening + cashFlow;

      data.push({
        date: monthKey,
        opening,
        clientReceipts: monthData.clientReceipts,
        supplierPayments: monthData.supplierPayments,
        entrepreneur: 0,
        travelExpenses: 0,
        fuel: 0,
        expenseNotes: 0,
        cash: 0,
        salaries: 89718, // Fixed monthly salary
        ir: 15963,
        is: 0,
        cnss: 15605,
        healthInsurance: 0,
        vat: 0,
        cashFlow,
        closing
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Create worksheet data
  const wsData = [
    ['Tableau de trésorerie', ...Array(months.length).fill('')],
    ['MAD', ...months],
    ['Opening (SG + CFG)', ...data.map(d => d.opening)],
    ['', ...Array(months.length).fill('')],
    ['Encaissement Clients (+)', ...data.map(d => d.clientReceipts)],
    ['Décaissement Fournisseurs (-)', ...data.map(d => d.supplierPayments)],
    ['Auto-entrepreneur', ...data.map(d => d.entrepreneur)],
    ['Frais de Séjour', ...data.map(d => d.travelExpenses)],
    ['Carburant', ...data.map(d => d.fuel)],
    ['Les notes de frais', ...data.map(d => d.expenseNotes)],
    ['Espece', ...data.map(d => d.cash)],
    ['', ...Array(months.length).fill('')],
    ['Les Salaires (Net à payer) (-)', ...data.map(d => d.salaries)],
    ['IR(-)', ...data.map(d => d.ir)],
    ['IS', ...data.map(d => d.is)],
    ['(CNSS + AMO) (-)', ...data.map(d => d.cnss)],
    ['Assurance maladie', ...data.map(d => d.healthInsurance)],
    ['TVA (-)', ...data.map(d => d.vat)],
    ['', ...Array(months.length).fill('')],
    ['Cash Flow', ...data.map(d => {
      return d.clientReceipts - (d.supplierPayments + d.entrepreneur + d.travelExpenses + d.fuel + d.expenseNotes + d.cash + d.salaries + d.ir + d.is + d.cnss + d.healthInsurance + d.vat);
    })],
    ['', ...Array(months.length).fill('')],
    ['Closing', ...data.map(d => {
      return (d.opening + d.clientReceipts) - (d.supplierPayments + d.entrepreneur + d.travelExpenses + d.fuel + d.expenseNotes + d.cash + d.salaries + d.ir + d.is + d.cnss + d.healthInsurance + d.vat);
    })]
  ];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidth = 15;
  ws['!cols'] = Array(months.length + 1).fill({ wch: colWidth });

  // Style definitions
  const headerStyle = {
    fill: { fgColor: { rgb: '000080' } }, // Dark blue
    font: { color: { rgb: 'FFFFFF' }, bold: true },
    alignment: { horizontal: 'center' }
  };

  const currencyStyle = {
    font: { bold: true },
    alignment: { horizontal: 'center' }
  };

  const dataStyle = {
    fill: { fgColor: { rgb: 'FFFFE0' } }, // Light yellow
    alignment: { horizontal: 'right' },
    numFmt: '#,##0'
  };

  const cashFlowStyle = {
    fill: { fgColor: { rgb: '000080' } },
    font: { color: { rgb: 'FFFFFF' }, bold: true },
    alignment: { horizontal: 'right' },
    numFmt: '#,##0'
  };

  // Apply styles
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');

  ws['!cols'] = [
    { wch: 30 },
    ...Array(months.length).fill({ wch: 15 })
  ];
  
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      // Apply appropriate style based on row
      if (R === 0 || R === 1) {
        ws[cellRef].s = headerStyle;
      } else if (R === 2) {
        ws[cellRef].s = currencyStyle;
      } else if (R === 19 || R === 21) { // Cash Flow and Closing rows
        ws[cellRef].s = cashFlowStyle;
      } else {
        ws[cellRef].s = dataStyle;
      }
    }
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Trésorerie');

  // Generate Excel file
  XLSX.writeFile(wb, `Trésorerie_${startDate.toLocaleDateString('fr-FR')}_${endDate.toLocaleDateString('fr-FR')}.xlsx`);
    
  } catch (error) {
    console.error('Error exporting treasury:', error);
    throw error;
  }
};