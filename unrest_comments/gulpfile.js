var riot = require('gulp-riot');
var gulp = require('gulp');
var concat = require("gulp-concat");
var less = require('gulp-less');
var rollup = require('gulp-rollup');
var sourcemaps = require("gulp-sourcemaps");
var through = require('through2');
var uglify = require('gulp-uglify');
var util = require('gulp-util');

var _ROOT = "static/unrest_comments/";
var _DEST = "static/.dist/"

var source_files = [
  _DEST+"_tags.js",
];

gulp.task('build-js',['build-tag'], function () {
  return gulp.src(source_files)
    .pipe(sourcemaps.init())
    .pipe(concat('unrest_comments.js'))
    //.pipe(uglify({mangle: false, compress: false}))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(_DEST));
});

var tag_files = [
  _ROOT + "comments.tag",
];

gulp.task('build-tag', function() {
  return gulp.src(tag_files)
    .pipe(riot())
    .pipe(concat('_tags.js'))
    .pipe(gulp.dest(_DEST));
});

var css_files = [
  _ROOT + "style.less",
]

gulp.task('build-css', function () {
  return gulp.src(css_files)
    .pipe(less({}))
    .pipe(concat('unrest_comments.css'))
    .pipe(gulp.dest(_DEST));
});

var build_tasks = ['build-js', 'build-css'];

gulp.task('watch', build_tasks, function () {
  gulp.watch([_ROOT+"*.js",_ROOT+"*.tag"], ['build-js']);
  gulp.watch(_ROOT+"*.less", ['build-css']);
});

gulp.task('default', build_tasks);
