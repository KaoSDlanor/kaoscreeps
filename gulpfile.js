const Gulp = require('gulp');
const Minimist = require('minimist');

const Del = require('del');
const Rollup = require('rollup');
const TypeScript = require('gulp-typescript');

Gulp.task('clear-before',() => Del(['temp-typescript/**/*','dist/**/*']));

Gulp.task('typescript',() => {
  return Gulp.src('./src/**/*.ts')
    .pipe(TypeScript.createProject('./tsconfig.json')())
    .pipe(Gulp.dest('./temp-typescript'))
});

Gulp.task('rollup',async () => {
  const Args = Minimist(process.argv.slice(2));
  const Config = require('./rollup.config')(Args.dest);
  const Bundle = await Rollup.rollup(Config);
  await Bundle.write(Config.output);
  await Bundle.close();
});

Gulp.task('clear-after',() => Del(['temp-typescript/**/*']));

Gulp.task('build',Gulp.series('clear-before','typescript','rollup','clear-after'));