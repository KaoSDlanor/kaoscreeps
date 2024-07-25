'use strict';

const ResolvePlugin  = require('@rollup/plugin-node-resolve');
const CommonJSPlugin = require('@rollup/plugin-commonjs');
const ScreepsPlugin  = require('rollup-plugin-screeps');

const getServerConfig = (targetServer) => {
	try {
		if (!targetServer) {
			throw new Error('No target server specified');
		}
		const servers = require('./servers.json');
		if (!(targetServer in servers)) {
			throw new Error('Could not find config for target server');
		}
		const config = servers[targetServer];
		return config;
	} catch(e) {
		console.warn(e.message ?? e);
		console.warn('Code will be compiled but not uploaded');
		return undefined;
	}
}

module.exports = (targetServer) => {
	const serverConfig = getServerConfig(targetServer);

  return {
    input: 'temp-typescript/index.js',
    output: {
      file      : 'dist/main.js',
      format    : 'cjs',
      sourcemap : true,
    },

    plugins: [
      ResolvePlugin({ browser : true }),
      CommonJSPlugin(),
      ScreepsPlugin({ config : serverConfig, dryRun : serverConfig == null }),
    ],
  };
};