
module.exports = gulpRequireTasks;


const path = require('path');
const requireDirectory = require('require-directory');


const DEFAULT_OPTIONS = {
  path: process.cwd() + '/gulp-tasks',
  include: null,
  exclude: null,
  separator: ':',
  passGulp: true,
  passCallback: true,
  gulp: null
};


function gulpRequireTasks (options) {

  options = Object.assign({}, DEFAULT_OPTIONS, options);

  const gulp = options.gulp || require('gulp');
  const gulp4 = !!gulp.series;

  // Recursively visiting all modules in the specified directory
  // and registering Gulp tasks.
  requireDirectory(module, options.path, {
    visit: moduleVisitor,
    include: options.include,
    exclude: options.exclude
  });


  /**
   * Registers the specified module. Task name is deducted from the specified path.
   *
   * @param {object|function} module
   * @param {string} modulePath
   */
  function moduleVisitor (module, modulePath) {
    var args = [taskNameFromPath(modulePath)];
    var module = normalizeModule(module, gulp4);
    var batchName;

    if (module.dep) {
      console.warn(
        'Usage of "module.dep" property is deprecated and will be removed in next major version. ' +
        'Use "deps" instead.'
      );
    }

    var deps = module.deps || module.dep

    if (gulp4) {
      if (deps) {
        // Can get dep: [] which is equal to dep: { series: [] }
        // or dep: { parallel: [] }
        if (_.isPlainObject(deps)) {
          batchName = deps.parallel ? 'parallel' : 'series';
          args.push(gulp[batchName].apply(gulp, deps[batchName]));
        } else {
          args.push(gulp.series.apply(gulp, deps));
        }
      } else {
        args.push(module.nativeTask || taskFunction);
      }
    } else {
      args.push(deps || [], module.nativeTask || taskFunction);
    }

    gulp.task.apply(gulp, args);

    /**
     * Wrapper around user task function.
     * It passes special arguments to the user function according
     * to the configuration.
     *
     * @param {function} callback
     *
     * @returns {*}
     */
    function taskFunction (callback) {

      if ('function' !== typeof module.fn) {
        callback();
        return;
      }

      let args = [];

      // @deprecated
      // @todo: remove this in 2.0.0
      if (options.arguments) {
        console.warn(
          'Usage of "arguments" option is deprecated and will be removed in next major version. ' +
          'Use globals or module imports instead.'
        );
        args = Array.from(options.arguments);
      }

      if (options.passGulp) {
        args.unshift(gulp);
      }

      if (options.passCallback) {
        args.push(callback);
      }

      return module.fn.apply(module, args);

    }

    /**
     * Deducts task name from the specified module path.
     *
     * @returns {string}
     */
    function taskNameFromPath (modulePath) {

      const relativePath = path.relative(options.path, modulePath);

      // Registering root index.js as a default task.
      if ('index.js' === relativePath) {
        return 'default';
      }

      const pathInfo = path.parse(relativePath);
      const taskNameParts = [];

      if (pathInfo.dir) {
        taskNameParts.push.apply(taskNameParts, pathInfo.dir.split(path.sep));
      }
      if ('index' !== pathInfo.name) {
        taskNameParts.push(pathInfo.name);
      }

      return taskNameParts.join(options.separator);

    }

  }

}

/**
 * Normalizes module definition.
 *
 * @param {function|object} module
 *
 * @returns {object}
 */
function normalizeModule (module, gulp4) {
  if ('function' === typeof module) {
    return gulp4 ? {
      fn: module
    } : {
      fn: module,
      deps: []
    };
  } else {
    return module;
  }
}
