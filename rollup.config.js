'use strict';

const ResolvePlugin  = require('@rollup/plugin-node-resolve');
const CommonJSPlugin = require('@rollup/plugin-commonjs');
const ScreepsPlugin  = require('rollup-plugin-screeps');

module.exports = (TargetServer) => {
  const Servers      = require('./servers.json');
  if (!TargetServer) {
    console.log('No destination specified - code will be compiled but not uploaded');
  } else if (Servers[TargetServer] == null) {
    throw new Error('Invalid upload destination');
  }
  
  return {
    input: 'temp-typescript/index.js',
    output: {
      file      : 'dist/main.js',
      format    : 'cjs',
      sourcemap : true,
    },
  
    plugins: [
      ResolvePlugin(),
      CommonJSPlugin(),
      ScreepsPlugin({ config : Servers[TargetServer], dryRun : Servers[TargetServer] == null }),
    ],
  };
};