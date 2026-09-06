module.exports = function override(config, env) {
  // For production build - reduce memory usage
  if (env === 'production') {
    // Disable source maps
    config.devtool = false;
    
    // Optimize chunk splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        maxSize: 100000,
        minSize: 30000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 100000,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
            name: 'react-vendor',
            chunks: 'all',
            priority: 10,
          },
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui-vendor',
            chunks: 'all',
            priority: 10,
          },
          firebase: {
            test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            name: 'firebase-vendor',
            chunks: 'all',
            priority: 10,
          },
        },
      },
      minimizer: config.optimization.minimizer,
    };
    
    // Reduce performance hints
    config.performance = {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    };
    
    // Ignore warnings
    config.ignoreWarnings = [
      { module: /node_modules\/html2pdf\.js/ },
      { module: /node_modules\/source-map-loader/ },
    ];
  }

  return config;
};