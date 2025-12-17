/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.test.js'],
  transform: {},
  moduleFileExtensions: ['js', 'json'],
  verbose: false
};

export default config;
