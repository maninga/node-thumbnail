// node-thumbnail
// (c) 2012-2014 Honza Pokorny
// Licensed under BSD
// https://github.com/honza/node-thumbnail

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var os = require('os');

var im = require('imagemagick');
var async = require('async');
var _ = require('underscore');

var options, queue, defaults, done, extensions, createQueue, run;


defaults = {
  prefix : '',
  suffix: '_thumb',
  match: '',
  digest: false,
  hashingType: 'sha1',
  width: 800,
  concurrency: os.cpus().length,
  quiet: false,
  overwrite: false
};


extensions = [
  '.jpg',
  '.jpeg',
  '.JPG',
  '.JPEG',
  '.png',
  '.PNG',
  '.gif',
  '.GIF'
];


createQueue = function(settings) {

  queue = async.queue(function(task, callback) {

    if (settings.digest) {

      var hash = crypto.createHash(settings.hashingType);
      var stream = fs.ReadStream(task.options.srcPath);

      stream.on('data', function(d) {
        hash.update(d);
      });

      stream.on('end', function() {
        var d = hash.digest('hex');

        task.options.dstPath = settings.destination + '/' + d + '_' +
          settings.width + path.extname(task.options.srcPath);

        if (settings.overwrite || !fs.existsSync(task.options.dstPath)) {
          im.resize(task.options, function(err, stdout, stderr) {
            callback();
          });
        }

      });

    } else {
      var name = task.options.srcPath;
      var ext = path.extname(name);
      var base = path.basename(name, ext);

      task.options.dstPath = settings.destination + '/' + settings.prefix + base +
        settings.suffix + ext;

      if (settings.overwrite || !fs.existsSync(task.options.dstPath)) {
        im.resize(task.options, function(err, stdout, stderr) {
          callback();
        });
      }
    }

  }, settings.concurrency);

  queue.drain = function() {
    if (done) {
      done();
    } else {
      if (!settings.quiet) {
        console.log('all items have been processed');
      }
    }
  };
};


run = function(settings) {
  var images = fs.readdirSync(settings.source);
  images = _.reject(images, function(file) {
    var ext = path.extname(file);
    var base  = path.basename(file, ext);
    return _.indexOf(extensions, ext) === -1 || (settings.match && !base.match(new RegExp(settings.match))) || (settings.suffix && base.match(new RegExp(settings.suffix + '$'))) || (settings.prefix && base.match(new RegExp('^' + setting.prefix)));
  });

  createQueue(settings);

  _.each(images, function(image) {

    options = {
      srcPath: settings.source + '/' + image,
      width: settings.width
    };

    queue.push({options: options}, function() {
      if (!settings.quiet) {
        console.log(image);
      }
    });

  });
};


exports.thumb = function(options, callback) {
  var settings;

  if (options.args) {

    if (options.args.length < 1) {
      console.log('Please provide at least a source [and destination] directories.');
      return;
    }

    options.destination = options.source = options.args[0];

    if (options.args.length === 2) {
      options.destination = options.args[1];
    }
  }

  options.source = options.source || 'imsurethatthisdirdoesnotexist';
  options.destination = options.destination || options.source;

  if (fs.existsSync(options.source) && fs.existsSync(options.destination)) {
    settings = _.defaults(options, defaults);
  } else {
    console.log("Origin or destination doesn't exist.");
    return;
  }

  if (callback) {
    done = callback;
  }

  run(settings);

};
