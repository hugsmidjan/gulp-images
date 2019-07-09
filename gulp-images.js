const { src, dest, watch } = require('gulp');
const { notifyPipeError, normalizeOpts, prefixGlobs } = require('@hugsmidjan/gulp-utils');

const defaultOpts = {
  name: 'images', // the display name of the generated tasks
  src: 'src/',
  dist: 'pub/',
  glob: ['i/**/*', '!i/_raw/**'], // which files to glob up as entry points
  // svg_keepIds: false, // Treat all SVG `id=`s as significant content
};

const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const mozjpeg = require('imagemin-mozjpeg');
const rename = require('gulp-rename');
const flatmap = require('gulp-flatmap');

module.exports = (opts) => {
  opts = normalizeOpts(opts, defaultOpts);

  const compress = (files) => {
    return src(files, { base: opts.src })
      .pipe(notifyPipeError())
      .pipe(
        flatmap((stream, file) => {
          var fileParams = file.path.match(
            /(---q(\d{1,3}(?:-\d{1,3})?)(?:--d(0))?)\.(png|jpe?g)$/i
          );
          if (fileParams) {
            if (fileParams[4].toLowerCase() === 'png') {
              const quality = fileParams[2].split('-').map((val) => parseInt(val) / 100);
              if (quality.length === 1) {
                quality.push(quality[0]);
              }
              stream = stream.pipe(
                imagemin([
                  pngquant({
                    speed: 1, // default: `3`
                    strip: true,
                    quality, // default `undefined` (i.e. 256 colors)
                    dithering: !fileParams[3]
                      ? undefined
                      : fileParams[3] === '0'
                      ? false
                      : parseInt(fileParams[3]) / 100,
                  }),
                ])
              );
            } else {
              stream = stream.pipe(
                imagemin([
                  mozjpeg({
                    quality: parseInt(fileParams[2]),
                  }),
                ])
              );
            }
            console.info('Lossy compressing', file.relative);
            return stream.pipe(
              rename((path) => {
                path.basename = path.basename.slice(0, -fileParams[1].length);
              })
            );
          } else {
            const hasKeepIdsSuffix = /---ids.svg$/i.test(file.path);
            stream = stream.pipe(
              imagemin([
                imagemin.gifsicle({ interlaced: true }),
                imagemin.jpegtran({ progressive: true }),
                imagemin.optipng({ optimizationLevel: 4 }),
                imagemin.svgo({
                  plugins:
                    opts.svg_keepIds || hasKeepIdsSuffix
                      ? [{ cleanupIDs: false }]
                      : undefined,
                }),
              ])
            );
            if (hasKeepIdsSuffix) {
              stream = stream.pipe(
                rename((path) => {
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
  const compressTask = () => compress(prefixGlobs(opts.glob, opts.src));
  compressTask.displayName = opts.name;

  const watchTask = () => {
    // watch(prefixGlobs(opts.glob, opts.src), compressTask);

    // TODO: Consider refactoring this to use something like `gulp-watch` in streaming mode
    // https://github.com/gulpjs/gulp/blob/master/docs/recipes/rebuild-only-files-that-change.md
    watch(prefixGlobs(opts.glob, opts.src))
      .on('change', compress)
      .on('add', compress);
  };
  watchTask.displayName = opts.name + '_watch';

  const ret = [compressTask, watchTask];
  ret.compress = compressTask;
  ret.watch = watchTask;

  return ret;
};
