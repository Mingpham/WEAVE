const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withNativeBuildInputs(config) {
  return withAppBuildGradle(config, config => {
    const marker = '// WEAVE native bundle inputs';
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents += `\n${marker}
tasks.withType(com.facebook.react.tasks.BundleHermesCTask).configureEach {
    sources.exclude('**/.cache/**', '**/.expo/**', '**/dist/**', '**/dist-demo/**', '**/artifacts/**')
}
`;
    }
    return config;
  });
};
