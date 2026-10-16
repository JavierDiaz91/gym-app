# Kivra SaaS — piloto de generación de facturas mensuales

## Estado
El endpoint `/api/cron/saas-renewals` mantiene GET como consulta y añade POST para generar **una sola cuota del mes actual para un gimnasio de prueba**.

El endpoint NO programa un cron por sí mismo. No se ha configurado ninguna ejecución automática en Vercel.

## Variables (servidor)
- `SAAS_RENEWAL_CRON_SECRET`: token fuerte y secreto, enviado por header Authorization: Bearer.
- `KIVRA_SAAS_ACCESS_TEST_GYM_ID`: ID exclusivo del gimnasio de prueba.
- `KIVRA_SAAS_PILOT_SUPERADMIN_ID`: ID de un usuario SuperAdmin real.
- `KIVRA_SAAS_PILOT_INVOICE_GENERATION=true`: habilita explícitamente el POST; por defecto, apagado.

## SQL requerido
Instalar `scripts/saas-calendar-renewal-pilot.sql` en una base de pruebas después del esquema SaaS. La función bloquea la suscripción durante la generación, valida importe y alta, no permite meses futuros, y rechaza períodos superpuestos. El mismo mes puede ejecutarse repetidamente sin duplicar la cuota.

## Antes de comercializar
- Conciliar cuotas históricas y definir el prorrateo de altas posteriores al día 10.
- Diseñar cron real y cubrir múltiples gimnasios con aislamiento, lotes y alertas.
- Probar autenticación, webhook MP, pago tardío, transferencia rechazada, y vencimiento de 48h.
- Auditar APIs Render y server actions que no pasan por la protección central.
- Ejecutar build y tests en CI o entorno de desarrollo.
- No activar flags ni fusionar a main hasta validar el circuito completo.
