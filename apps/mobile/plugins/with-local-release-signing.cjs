const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withLocalReleaseSigning(config) {
  return withAppBuildGradle(config, config => {
    let source = config.modResults.contents;
    if (source.includes('// WEAVE local release signing')) return config;
    source = `// WEAVE local release signing: credentials are local and gitignored.\ndef weaveSigning = new Properties()\ndef weaveSigningFile = rootProject.file('../.cache/signing/release.properties')\nif (weaveSigningFile.exists()) { weaveSigningFile.withInputStream { weaveSigning.load(it) } }\n` + source;
    source = source.replace(/signingConfigs\s*\{/, `signingConfigs {
        weaveLocal {
            if (weaveSigningFile.exists()) {
                storeFile file(weaveSigning.getProperty('storeFile'))
                storePassword weaveSigning.getProperty('storePassword')
                keyAlias weaveSigning.getProperty('keyAlias')
                keyPassword weaveSigning.getProperty('keyPassword')
            }
        }`);
    source = source.replace(/(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, `$1if (weaveSigningFile.exists()) {
                signingConfig signingConfigs.weaveLocal
            } else if (System.getenv('WEAVE_REQUIRE_RELEASE_SIGNING') == '1') {
                throw new GradleException('Local release signing credentials are missing. Run scripts/build-android.ps1.')
            } else {
                signingConfig signingConfigs.debug
            }`);
    config.modResults.contents = source;
    return config;
  });
};
