const { src, dest, watch } = require('gulp');
const { notifyPipeError, normalizeOpts, prefixGlobs } = require('@hugsmidjan/gulp-utils');

const defaultOpts = {
  name: 'images', // the display name of the generated tasks
  src: 'src/',
  dist: 'pub/',
  glob: ['i/**/*', '!i/_raw/**'], // which files to glob up as entry points
  // svg_keepIds: false, // Treat all SVG `id=`s as significant content
};

const _plugins = {
  imagemin: require('gulp-imagemin'),
  pngquant: require('imagemin-pngquant'),
  mozjpeg: require('imagemin-mozjpeg'),
  rename: require('gulp-rename'),
  foreach: require('gulp-foreach'),
  changed: require('gulp-changed'),
};

module.exports = (opts) => {
  opts = normalizeOpts(opts, defaultOpts);

  const compressTask = () => {
    return src(prefixGlobs(opts.glob, opts.src), { base: opts.src })
      .pipe(notifyPipeError())
      .pipe( _plugins.changed( opts.dist ) )
      .pipe(
        _plugins.foreach((stream, file) => {
          var fileParams = file.path.match(
            /(---q(\d{1,3}(?:-\d{1,3})?)(?:--d(0))?)\.(png|jpe?g)$/i
          );
          if (fileParams) {
            if (fileParams[4].toLowerCase() === 'png') {
              stream = stream.pipe(
                _plugins.pngquant({
                  speed: 1, // default: `3`
                  quality: parseInt(fileParams[2], 10), // default `undefined` (i.e. 256 colors)
                  floyd: parseInt(fileParams[3], 10) / 100,
                  nofs: fileParams[3] === '0',
                })()
              );
            } else {
              stream = stream.pipe(
                _plugins.mozjpeg({
                  quality: fileParams[2],
                })()
              );
            }
            return stream.pipe(
              _plugins.rename((path) => {
                path.basename = path.basename.slice(0, -fileParams[1].length);
              })
            );
          } else {
            const hasKeepIdsSuffix = /---ids.svg$/i.test(file.path);
            stream = stream.pipe(
              _plugins.imagemin({
                optimizationLevel: 4, // png
                progressive: true, // jpg
                interlaced: true, // gif
                multipass: true, // svg
                svgoPlugins:
                  opts.svg_keepIds || hasKeepIdsSuffix
                    ? [{ cleanupIDs: false }]
                    : undefined,
              })
            );
            if (hasKeepIdsSuffix) {
              stream = stream.pipe(
                _plugins.rename((path) => {
                  path.basename = path.basename.replace(/---ids$/, '');
                })
              );
            }
            return stream;
          }
        })
      )
      .pipe(dest(opts.dist));
  };
  compressTask.displayName = opts.name;

  const watchTask = () => {
    watch(prefixGlobs(opts.glob, opts.src), { base: opts.src }, compressTask);
  };
  watchTask.displayName = opts.name + '_watch';

  const ret = [compressTask, watchTask];
  ret.compress = compressTask;
  ret.watch = watchTask;

  return ret;
};
