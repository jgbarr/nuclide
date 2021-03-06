#!/usr/bin/env node
'use strict';
/* @noflow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

/*eslint-disable no-var, prefer-const, no-console*/

// Regenerates the .proxy baseline files in the spec/fixtures directory.

require('../../nuclide-node-transpiler');

var parseServiceDefinition = require('../lib/service-parser').parseServiceDefinition;
var generateProxy = require('../lib/proxy-generator').generateProxy;

var fs = require('fs');
var path = require('path');

var dir = path.join(__dirname, '../spec/fixtures');
for (var file of fs.readdirSync(dir)) {
  if (file.endsWith('.def')) {
    var definitions = parseServiceDefinition(file, fs.readFileSync(path.join(dir, file), 'utf8'));

    var json = mapDefinitions(definitions);
    fs.writeFileSync(
      path.join(dir, file).replace('.def', '.def.json'), JSON.stringify(json, null, 4), 'utf8');

    var code = generateProxy(path.basename(file, '.def'), definitions);
    fs.writeFileSync(
      path.join(dir, file).replace('.def', '.proxy'), code, 'utf8');
  }
}

function mapDefinitions(map) {
  var obj = {};
  for (var it of map.values()) {
    var value;
    switch (it.kind) {
      case 'interface':
        value = {
          constructorArgs: it.constructorArgs,
          instanceMethods: mapToJSON(it.instanceMethods),
          staticMethods: mapToJSON(it.staticMethods),
        };
        break;
      default:
        value = it;
        break;
    }
    obj[it.name] = value;
  }
  return obj;
}

function mapToJSON(map) {
  var result = {};
  for (var it of map.entries()) {
    result[it[0]] = it[1];
  }
  return result;
}
