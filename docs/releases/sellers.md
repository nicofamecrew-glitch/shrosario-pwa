# Próxima publicación de Sellers

Incluye acceso vendedor/mayorista, catálogo integrado, pedidos, pagos y las cards de vista previa sin el botón para preguntar a GUÍA. Mantiene el desarrollo local de GUÍA fuera de esta publicación.

Preparar solamente los archivos aprobados:

    node scripts/check-sellers-release.mjs --prepare
    node scripts/check-sellers-release.mjs
    git diff --cached

El control rechaza archivos ajenos a la lista y nuevas referencias a GUÍA en el diff. No borra ni deshace trabajo. Tras crear el commit, verificarlo con:

    node scripts/check-sellers-release.mjs --commit

Publicar ese commit mediante Git/Vercel. No ejecutar un despliegue desde el directorio local mezclado. Revisar por separado los repositorios de admin y Sellers y sus variables de producción antes de publicar: las direcciones localhost actuales son solo para desarrollo.

Los cambios no listados quedan pendientes de revisión, incluidos Cabify y sincronización del catálogo. No incluirlos automáticamente. GUÍA no está habilitado en producción. Conservar Ticketera y verificar que `/guia` y `/api/guia` devuelvan 404 en producción. El desarrollo de GUÍA permanece local y no debe activarse con esta publicación.

