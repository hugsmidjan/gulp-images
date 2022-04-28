const { src, dest, watch } = require('gulp');
const { notifyPipeError, normalizeOpts, prefixGlobs } = require('@hugsmidjan/gulp-utils');

const defaultOpts = {
  name: 'images', // the display name of the generated tasks
  src: 'src/',
  dist: 'pub/',
  glob: ['i/**/*', '!i/_raw/**'], // which files to glob up as entry points
  // svg_keepIds: false, // Treat all SVG `id=`s as significant content
  // svgoRules: {}, // SVGO settings (https://github.com/svg/svgo#what-it-can-do)
};
const rename = require('gulp-rename');
const flatmap = require('gulp-flatmap');

const compressExt = /\.(?:svg|png|gif|jpe?g)$/i;

module.exports = (opts) => {
  opts = normalizeOpts(opts, defaultOpts);

  const compress = (files) => Promise.all([
    import('gulp-imagemin'),
    import('imagemin-pngquant'),
  ]).then((exports) => {
    const imagemin = exports[0].default;
    const gifsicle = exports[0].gifsicle;
    const mozjpeg = exports[0].mozjpeg;
    const optipng = exports[0].optipng;
    const svgo = exports[0].svgo;
    const pngquant = exports[1].default;

    return new Promise((resolve, reject) => {
      src(files, { base: opts.src })
        .pipe(notifyPipeError())
        .on('error', reject)
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
                      progressive: true,
                    }),
                  ])
                );
              }
              console.info('Lossy compressing', file.relative);
              stream = stream.pipe(
                rename((path) => {
                  path.basename = path.basename.slice(0, -fileParams[1].length);
                })
              );
            } else if (compressExt.test(file.path)) {
              const hasKeepIdsSuffix = /---ids.svg$/i.test(file.path);
              const svgoRules = {
                removeViewBox: false,
                removeDimensions: true,
                ...opts.svgoRules,
              };
              if (opts.svg_keepIds || hasKeepIdsSuffix) {
                svgoRules.cleanupIDs = false;
              }

              stream = stream.pipe(
                imagemin([
                  gifsicle({ interlaced: true }),
                  mozjpeg({ progressive: true }),
                  optipng({ optimizationLevel: 4 }),
                  svgo({
                    plugins: Object.keys(svgoRules).map((name) => ({
                      name,
                      active: svgoRules[name],
                    })),
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
            }
            return stream;
          })
        )
        .pipe(dest(opts.dist))
        .on('end', resolve);
    })

  });
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
