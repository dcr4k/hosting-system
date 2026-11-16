import {PaymentRecord, Reservation} from '../types/models';

export function exportFinancialReportCsv(params: {
  tenantSlug: string;
  reservations: Reservation[];
  payments: PaymentRecord[];
}): void {
  const {tenantSlug, reservations} = params;
  const headers = [
    'Codigo_Reserva',
    'Status',
    'Hospede',
    'Email',
    'Acomodacao',
    'Unidades',
    'CheckIn',
    'CheckOut',
    'Noites',
    'Valor_Total_BRL',
    'Valor_Recebido_BRL',
    'Saldo_Pendente_BRL',
    'Metodo_Pagamento',
    'Modalidade',
    'Modo_Simulado',
    'Data_Criacao',
  ];

  const rows = reservations.map((r) => {
    const pending = Math.max(0, r.totalAmount - r.paidAmount);
    return [
      r.code,
      r.status,
      `"${r.guestName.replace(/"/g, '""')}"`,
      r.guestEmail,
      `"${r.accommodationName.replace(/"/g, '""')}"`,
      `"${r.unitLabelsCsv.replace(/"/g, '""')}"`,
      r.checkIn,
      r.checkOut,
      String(r.nights),
      r.totalAmount.toFixed(2),
      r.paidAmount.toFixed(2),
      pending.toFixed(2),
      r.paymentMethod,
      r.paymentModality,
      r.isSimulatedPayment ? 'SIMULADO_DEMO' : 'REAL',
      r.createdAt.slice(0, 19),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `relatorio-financeiro-${tenantSlug}-${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
