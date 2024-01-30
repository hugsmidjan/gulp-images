type TaskFn = {
  (): Promise<void>;
  displayName: string;
}
type WatchFn = {
  (): FSWatcher;
  displayName: string;
}

/**
 * Copies files from `options.src` to `options.dist` and compresses any
 * SVG, PNG, JPG and GIF files among them.
 * 
 * @see https://github.com/hugsmidjan/gulp-images/blob/master/README.md
 */
export default function plugin (options?: {
  /**
   * The display name (prefix) of the generated tasks
   * 
   * Default: `"images"`
   */
  name?: string;
  /**
   * Path to the source directory from which to resolve the file `glob` option
   * 
   * Default: `"src/"`
   */
  src?: string;
  /**
   * Path where the compressed output should be save
   * 
   * Default: `"pub/"`
   */
  dist?: string;
  /**
   * Which files to glob up as entry points
   * 
   * Default: `['i/**​/*', '!i/_raw/**']`
   */
  glob?: string | Array<string>;

  /**
   * Treat all SVG `id=`s as significant content 
   * 
   * Default: `false`
   */
  svg_keepIds?: boolean,
   /**
    * SVGO settings (https://github.com/svg/svgo#what-it-can-do)
    * 
    * Default: `{}`
   */
  svgoRules?: Record<string, unknown>, 
}): [compress: TaskFn, watch: WatchFn] & {
  compress: TaskFn;
  watch: WatchFn;
};
