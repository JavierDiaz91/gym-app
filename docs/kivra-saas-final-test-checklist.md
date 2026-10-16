# Kivra SaaS — checklist de validación antes del despliegue

## Variables de entorno de prueba (no guardar secretos en GitHub)
- KIVRA_MP_TEST_ACCESS_TOKEN
- KIVRA_MP_TEST_WEBHOOK_SECRET
- KIVRA_MP_TEST_SELLER_ID
- KIVRA_PUBLIC_URL
- KIVRA_TRANSFER_HOLDER
- KIVRA_TRANSFER_ALIAS
- KIVRA_TRANSFER_CVU (opcional si hay alias)
- KIVRA_SAAS_ACCESS_GATE_ENABLED=false (valor seguro inicial)
- KIVRA_SAAS_ACCESS_TEST_GYM_ID (solo gimnasio de pruebas)

## Migraciones: aplicar y validar en base de pruebas, en orden
1. scripts/saas-payment-methods-foundation.sql
2. scripts/saas-private-receipts.sql
3. scripts/saas-transfer-workflow.sql
4. scripts/saas-mp-settlement.sql
5. scripts/saas-calendar-invoice-function.sql
6. scripts/saas-access-preview.sql

Ejecutar antes scripts/saas-calendar-billing-readiness.sql (solo lectura).
No ejecutar automáticamente sobre Neon productivo.

## Pruebas obligatorias
- Una factura pendiente admite una sola presentación de transferencia, con PDF/PNG/JPEG <=2MB.
- Un admin de otro gimnasio no puede subir a esa factura ni descargar el comprobante.
- El SuperAdmin descarga el comprobante y aprueba solo después de comprobar el dinero real.
- Rechazo finaliza el permiso provisional inmediatamente.
- A las 48 horas exactas, sin aprobación, el permiso provisional expira por hora de servidor.
- Pago MP aprobado, con firma y seller válidos, acredita una sola vez.
- Pago MP pending/rejected, firma inválida, importe distinto o collector distinto: no acredita.
- Gym admin con deuda accede a /admin/mi-suscripcion pero no al resto del panel.
- SuperAdmin mantiene acceso.
- No activar para gimnasios reales hasta verificar acciones/API del backend Render y todas las rutas.
- Confirmar que la suscripción no tenga meses sin facturar: la consulta de acceso solo ve facturas existentes.

## Riesgos aún abiertos
- Falta integración y pruebas end-to-end con el backend Render.
- Faltan pruebas automatizadas y ejecución de build/TypeScript.
- Faltan reconciliación histórica y generación automática mensual.
- La consulta de acceso actual toma la factura vencida más antigua: múltiples deudas requieren política integral.
- Los comprobantes binarios se almacenan en Neon; evaluar escalabilidad/retención antes de comercializar.
- Confirmar compatibilidad de verificación webhook con el payload real de MP.
- Mantener el PR en draft y los flags desactivados.
