'use strict';

// ------------------------------------------------------------------------------------------ Dependencies

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var nconf = require('nconf');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

// ------------------------------------------------------------------------------------------ Module definition

function Settings(opt) {
	EventEmitter.call(this);
	this.options = opt || {};

	if(_.isString(this.options)) {
	 	this.options = {
			path: this.options
		};
	} else if(_.isObject(this.options)) {
		this.options = _.assign({
			path: './settings.json',
			encoding: 'utf8'
		}, opt);
	} else {
		throw 'Invalid options provided';
	}
}

util.inherits(Settings, EventEmitter);

Settings.prototype.get = function(next) {
	var self = this;
	fs.readFile(self.options.path, self.options.encoding, function(err, content) {
		try {
			var config = nconf.get();
			var settings = content ? JSON.parse(content) : {};
			var output = _.assign(config, settings);

			if(output.localstoragepath && !path.isAbsolute(output.localstoragepath)) {
				var basedir = output.basedir || path.join(__dirname, '../');
				output.localstoragepath = path.resolve(basedir, output.localstoragepath);
			}

			next(null, output);
		} catch(err) {
			next(err, {});
		}
	});
};

Settings.prototype.push = function(settings, next) {
	var self = this;

	fs.readFile(self.options.path, self.options.encoding, function(err, content) {
		try {

			var config = require('../config.json');
			var current = content ? JSON.parse(content) : {};
			var defaults = _.defaultsDeep(current, config);

			settings = self.fixBooleanValues(defaults, settings);
			var output = _.defaultsDeep(settings, defaults);

			fs.writeFile(self.options.path, JSON.stringify(output), self.options.encoding, function(err) {
				self.emit('settings.push', err, output);
				next(err);
			});
		} catch(err) {
			next(err);
		}
	});
};

Settings.prototype.getInstance = function(opt) {
	return new Settings(opt);
};

Settings.prototype.fixBooleanValues = function(src, dest) {
	var self = this;
	_.forOwn(src, function(value, key) {
		if(_.isObject(value) && dest[key]) {
			dest[key] = self.fixBooleanValues(value, dest[key]);
		} else if(_.isBoolean(value) || value === 'true') {
			if(_.isUndefined(dest[key])) {
				dest[key] = false;
			}
		}
	});
	return dest;
};

// ------------------------------------------------------------------------------------------ Module Exposure

module.exports = new Settings();
