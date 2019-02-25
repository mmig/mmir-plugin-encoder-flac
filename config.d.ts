
/* plugin config definition: used by mmir-plugin-exports to generate module-config.gen.js */

/**
 * TODO add/support FLAC encoder settings,
 * e.g. compression [0,8] (DEFAULT: 5)
 *
 * NOTE would need to be implemented via mmir-plugin-encoder-core(?)
 */
export interface PluginConfig {
  flacEncoder?: any;
}
