"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PaymentPrintProps {
  payment: {
    id: number;
    first_name: string;
    last_name: string;
    dni: string;
    plan_name?: string;
    amount: number | string;
    payment_method: string;
    payment_date: string;
  };
}

export function PrintReceiptButton({ payment }: PaymentPrintProps) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=600,height=700");
    if (!printWindow) return;

    const formattedDate = new Date(payment.payment_date).toLocaleString("es-AR");
    const amountFormatted = Number(payment.amount).toLocaleString("es-AR");

    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo de Pago #${payment.id}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; max-width: 400px; margin: auto; color: #111; }
            .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 12px; }
            .header h2 { margin: 0; font-size: 20px; text-transform: uppercase; }
            .header p { margin: 4px 0 0; color: #666; font-size: 13px; }
            .content { margin: 20px 0; font-size: 14px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .label { color: #555; }
            .value { font-weight: 600; }
            .total-row { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
            .footer { border-top: 2px dashed #ccc; padding-top: 14px; text-align: center; font-size: 12px; color: #777; }
            button { background: #000; color: #fff; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; margin-top: 10px; font-weight: 600; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Comprobante de Pago</h2>
            <p>Recibo N° #${String(payment.id).padStart(6, '0')}</p>
          </div>
          <div class="content">
            <div class="row"><span class="label">Fecha:</span> <span class="value">${formattedDate}</span></div>
            <div class="row"><span class="label">Socio:</span> <span class="value">${payment.last_name}, ${payment.first_name}</span></div>
            <div class="row"><span class="label">DNI:</span> <span class="value">${payment.dni}</span></div>
            <div class="row"><span class="label">Concepto:</span> <span class="value">${payment.plan_name || "Membresía"}</span></div>
            <div class="row"><span class="label">Método:</span> <span class="value" style="text-transform: capitalize;">${payment.payment_method}</span></div>
            <div class="row total-row">
              <span>TOTAL:</span> <span>$${amountFormatted}</span>
            </div>
          </div>
          <div class="footer">
            <p>¡Gracias por tu pago!</p>
            <button onclick="window.print()">Imprimir / Descargar PDF</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Button variant="ghost" size="icon" onClick={handlePrint} title="Imprimir Recibo">
      <Printer className="w-4 h-4 text-muted-foreground hover:text-foreground" />
    </Button>
  );
}