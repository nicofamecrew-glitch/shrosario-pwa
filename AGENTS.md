# Próxima publicación: Sellers y PWA

La instrucción del usuario para el próximo Git/push/despliegue es publicar Sellers, la integración de usuarios/Supabase/admin/PWA y las cards de vista previa de productos, excluyendo los cambios en desarrollo de GUÍA.

- Mantener GUÍA local: no agregar sus cambios a este commit ni publicarlos junto con Sellers. No borrar ni restaurar esos archivos para preparar la publicación.
- Excluir `app/guia/`, `app/api/guia/`, `components/guia/`, `components/guia-commerce/`, `lib/guia/`, `commerce/` y sus pruebas. Los cambios actuales de `app/ClientShell.tsx` son de GUÍA y quedan fuera. `components/BottomNav.tsx` se incluye únicamente para conservar Ticketera, sin publicar el acceso ni los cambios de icono de GUÍA.
- Incluir `components/catalog/ProductQuickView.tsx`: conservar vista previa, fotos, precios, presentaciones y agregar al carrito. La eliminación del botón «Preguntale a GUÍA» sí corresponde a esta publicación.
- Usar la lista explícita de `scripts/sellers-release-policy.mjs`. No usar `git add .`, `git add -A`, `git commit -a`, ni desplegar directamente este directorio con sus cambios locales mezclados.
- Antes del commit, ejecutar `node scripts/check-sellers-release.mjs`. Antes de publicar el commit, ejecutar `node scripts/check-sellers-release.mjs --commit` y revisar el diff aprobado. Cabify, sincronización del catálogo y otros cambios no listados requieren revisión de alcance separada; no incluirlos automáticamente.
- GUÍA no está habilitado en la aplicación publicada. Que exista código en Git no significa que esté publicado. Mantener Ticketera en la navegación y bloquear `/guia` y `/api/guia` en producción con `middleware.ts`; no habilitar GUÍA durante este despliegue.
- No incluir `.env*`, claves ni `tsconfig.tsbuildinfo`.

Esta restricción corresponde a la próxima publicación de Sellers. Una instrucción posterior explícita del usuario para publicar GUÍA puede reemplazarla.

