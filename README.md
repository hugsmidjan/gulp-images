# @hugsmidjan/gulp-images

```
npm install --save-dev @hugsmidjan/gulp-images
```

## Usage

```js
const [imagesCompress, imagesWatch] = require('@hugsmidjan/gulp-images')(
  opts
);
```

## API / Advanced usage

```js
const imagesTaskFactory = require('@hugsmidjan/gulp-images');

const options = {
  // These are the defaults:
  name: 'images', // the display name of the generated tasks
  src: 'src/',
  dist: 'pub/',
  glob: ['i/**/*', '!i/_raw/**'], // which files to glob up as entry points
  // svg_keepIds: false, // Treat all SVG `id=`s as significant content
  // svgoRules: {}, // SVGO settings (https://github.com/svg/svgo#what-it-can-do)
};

// Create the gulp tasks based on the above options.
const imagesTasks = imagesTaskFactory(options);

// imagesTasks is a two item array...
const [imagesCompress, imagesWatch] = imagesTasks;
// ...but it also exposes the tasks as named properties.
const { compress, watch } = imagesTasks;
```

## Magic file-name compression hints

PNG and JPEG images can be forced through a lossy compression via a `---q{N}`
file-name suffix. The suffix is stripped from the filename before saving in
the `dist` folder.

In SVG files all ID attributes are stripped away unless a `svg_keepIds: true`
option is passed, or if an individual SVG file has a `---ids` file-name
suffix - which then gets stripped away before saving.

**Examples:**

- `src/i/photo---q60.jpg` (100% quality original) ---> `dist/i/photo.png`
  (recompressed to approx. 60% quality)
- `src/i/image---q50.png` (24bit file) ---> `dist/i/image.png` (png8 with at
  least 50% quality)
- `src/i/image---q50-70.png` (24bit file) ---> `dist/i/image.png` (png8 with
  between 50% and 70% quality)
- `src/i/image---q50--d0.png` (24bit file) ---> `dist/i/image.png` (png8 with
  at least 50% quality - **no dithering**)
- `src/i/image---ids.svg` (keep ID attributes) ---> `dist/i/image.svg` (with
  ID attributes intact)
