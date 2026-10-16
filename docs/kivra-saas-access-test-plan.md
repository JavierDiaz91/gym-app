# Pruebas del control de acceso SaaS — NO activar en producción

El control está **apagado por defecto**. Para probarlo con un gimnasio aislado:
- `KIVRA_SAAS_ACCESS_GATE_ENABLED=true`
- `KIVRA_SAAS_ACCESS_TEST_GYM_ID=<ID del gimnasio de prueba>`

La función SQL `scripts/saas-access-preview.sql` debe estar instalada junto con las tablas de pagos y transferencias. La fecha/hora se evalúa en PostgreSQL.

## Cobertura actual
- Acciones que usan `requireTenantSession()` en `app/actions.ts`: protegidas para el gimnasio seleccionado.
- SuperAdmin: exento de este control.
- `/admin/mi-suscripcion` y endpoints de pago: siguen disponibles para regularizar deuda.

## Cobertura PENDIENTE (bloqueante para producción)
- Rutas de administración y páginas renderizadas: la capa de layout todavía no aplica la restricción de navegación.
- Acciones de servidor que NO pasan por `requireTenantSession()`.
- Endpoints REST independientes, incluyendo backend Render.
- Detección de facturas no generadas y conciliación de múltiples meses vencidos.
- Pruebas del ciclo de pago tardío y expiración/rechazo de la ventana de 48 horas.

**No configurar el flag en producción.** El estado de prueba no constituye una barrera integral de autorización. No fusionar el PR antes de cerrar esta lista.
