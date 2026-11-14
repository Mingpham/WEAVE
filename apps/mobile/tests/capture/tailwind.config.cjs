const path = require('node:path');
const base = require('../../tailwind.config.cjs');
module.exports = {...base, content: [path.resolve(__dirname, '../../src/**/*.{ts,tsx}')]};
