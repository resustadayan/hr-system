// config-overrides.js
module.exports = function override(config, env) {
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    {
      module: /node_modules\/html2pdf\.js/,
    },
  ];
  return config;
};