const { withAppBuildGradle, withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withNativeBuildInputs(config) {
  config = withAppBuildGradle(config, config => {
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
  return withProjectBuildGradle(config, config => {
    const marker = '// WEAVE short Windows CMake paths';
    const block = `${marker}
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
    subprojects { subproject ->
        ['com.android.library', 'com.android.application'].each { pluginId ->
            subproject.plugins.withId(pluginId) {
                subproject.android.externalNativeBuild.cmake.buildStagingDirectory =
                    rootProject.file('../.cache/cxx/' + subproject.name)
                def ninja = rootProject.file('../.cache/toolchains/ninja/ninja.exe')
                if (ninja.exists()) {
                    subproject.android.defaultConfig.externalNativeBuild.cmake.arguments.add(
                        '-DCMAKE_MAKE_PROGRAM=' + ninja.absolutePath.replace('\\\\', '/'))
                }
            }
        }
    }
}
`;
    // Expo's root plugin evaluates subprojects, so register the callback first.
    let contents = config.modResults.contents.replace(/\/\/ WEAVE short Windows CMake paths[\s\S]*?^}\r?$\s*/m, '');
    if (!contents.includes('apply plugin: "expo-root-project"')) contents += '\napply plugin: "expo-root-project"\n';
    if (!contents.includes('apply plugin: "com.facebook.react.rootproject"')) contents += '\napply plugin: "com.facebook.react.rootproject"\n';
    config.modResults.contents = contents.replace('apply plugin: "expo-root-project"', block + '\napply plugin: "expo-root-project"');
    return config;
  });
};
