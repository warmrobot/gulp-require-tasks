
module.exports = {
  deps: ['styles:clean', 'styles:build', 'scripts:build'],
  fn: function (gulp, callback) {
    callback();
  }
};
