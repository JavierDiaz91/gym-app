# Integración de pagos Kivra SaaS — estado de implementación

## Separación de cobros
- Este circuito es **gimnasio -> Kivra**.
- No usar ni alterar el circuito **socio -> gimnasio** del backend Render.

## Archivos incorporados en PR #6
- `scripts/saas-payment-methods-foundation.sql`: registros de transferencias y pagos MP.
- `scripts/saas-calendar-billing-readiness.sql`: auditoría previa, solo lectura.
- `scripts/saas-calendar-invoice-function.sql`: generación manual transaccional de cuota calendario.
- `scripts/saas-mp-settlement.sql`: confirmación transaccional de un pago previamente verificado.
- `app/api/saas/mercadopago/preference/route.ts`: preferencia Checkout Pro **solo sandbox**, autenticada.
- `app/admin/mi-suscripcion/page.tsx`: vista de consulta del gimnasio.

## Variables futuras (Vercel, solo servidor)
- `KIVRA_MP_TEST_ACCESS_TOKEN`: token privado del vendedor de prueba Kivra.
- `KIVRA_PUBLIC_URL`: URL pública HTTPS de Kivra.
- Pendiente: secreto de firma del webhook de prueba y cuenta vendedora esperada.
- No incluir secretos en GitHub ni exponerlos como `NEXT_PUBLIC_*`.

## Bloqueos de seguridad antes de producción
1. Implementar webhook con verificación HMAC de Mercado Pago, consulta autenticada al proveedor, validación del collector_id esperado, estado approved, moneda, importe y referencia.
2. No confiar en parámetros de retorno del navegador para acreditar facturas.
3. Subida de comprobantes a almacenamiento privado, con validación de formato/tamaño, controles de acceso y referencias opacas.
4. Aprobación/rechazo de transferencias exclusiva SuperAdmin, con auditoría y sin habilitar acceso solo por comprobante.
5. Implementar el gate de acceso en el servidor (acciones y API incluidos), con ventana 1-10 y habilitación única de 48 h; mantener accesibles facturación y cierre de sesión.
6. Reconciliar fechas históricas, pruebas de onboarding, deuda anterior y cambios de plan.
7. Aplicar migraciones en Neon de prueba, pruebas integrales y recién después decidir despliegue.

**NO desplegar ni fusionar este PR como integración de cobros terminada.**
