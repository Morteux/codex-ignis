/**
 * Configuración de Google AdSense.
 *
 * Mantener enabled en false hasta contar con contenido, aprobación de Google,
 * un ID de editor ca-pub-… y una CMP configurada cuando sea aplicable.
 * Los identificadores de editor y de unidad son públicos, pero ads.txt solo
 * debe añadirse al proyecto cuando Google proporcione su valor definitivo.
 */
export const adsConfig = {
  enabled: false,
  publisherId: "",
  slots: {
    indexFooter: "",
    articleInline: ""
  }
};
