#!/usr/bin/env node

const Tracer = require('nmmes-tracer');
const config = require('../config/config.json');

const logger = new Tracer.Logger({
    transports: [
        new Tracer.transports.Console(),
        new Tracer.transports.File({
          path: config.LOG_PATH
          // testing locally
            // path: '../lib/output.log'
        }),
    ]
});

module.exports = logger;
