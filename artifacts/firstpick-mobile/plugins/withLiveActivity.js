/**
 * Expo Config Plugin — FirstPick Live Activity (Dynamic Island)
 *
 * Adds ActivityKit / Live Activities support to the iOS build.
 * The Swift extension source lives in ios/FirstPickLiveActivity/.
 *
 * This plugin:
 *   1. Sets NSSupportsLiveActivities = true in Info.plist
 *   2. Sets NSSupportsLiveActivitiesFrequentUpdates = true
 *   3. Copies Swift source files into the iOS project
 *   4. Adds a new "FirstPickLiveActivity" extension target to Xcode project
 */

const {
  withInfoPlist,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const EXTENSION_NAME = 'FirstPickLiveActivity';
const BUNDLE_ID_SUFFIX = 'liveactivity';

function withLiveActivityInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    config.modResults['NSSupportsLiveActivities'] = true;
    config.modResults['NSSupportsLiveActivitiesFrequentUpdates'] = true;
    return config;
  });
}

function withLiveActivityFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      const extensionDir = path.join(platformProjectRoot, EXTENSION_NAME);

      // Create extension directory if it doesn't exist
      if (!fs.existsSync(extensionDir)) {
        fs.mkdirSync(extensionDir, { recursive: true });
      }

      // Source Swift files
      const srcDir = path.join(__dirname, '..', 'ios', EXTENSION_NAME);
      if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.swift'));
        for (const file of files) {
          fs.copyFileSync(path.join(srcDir, file), path.join(extensionDir, file));
        }
      }

      // Write Info.plist for the extension
      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>FirstPickLiveActivity</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>XPC!</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`;
      fs.writeFileSync(path.join(extensionDir, 'Info.plist'), infoPlist);

      return config;
    },
  ]);
}

function withLiveActivityXcode(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const { platformProjectRoot } = config.modRequest;
    const mainBundleId = config.ios?.bundleIdentifier ?? 'com.firstpick.mobile';
    const extensionBundleId = `${mainBundleId}.${BUNDLE_ID_SUFFIX}`;

    // Check if target already exists
    const existingTargets = xcodeProject.pbxNativeTargetSection();
    const alreadyExists = Object.values(existingTargets).some(
      (t) => t && t.name === EXTENSION_NAME
    );
    if (alreadyExists) return config;

    // Add the widget extension target
    const widgetTarget = xcodeProject.addTarget(
      EXTENSION_NAME,
      'app_extension',
      EXTENSION_NAME,
      extensionBundleId
    );

    if (widgetTarget) {
      // Add build settings
      xcodeProject.addBuildProperty(
        'SWIFT_VERSION',
        '5.0',
        'Release',
        EXTENSION_NAME
      );
      xcodeProject.addBuildProperty(
        'SWIFT_VERSION',
        '5.0',
        'Debug',
        EXTENSION_NAME
      );

      // Add Swift files to the target
      const extensionDir = path.join(platformProjectRoot, EXTENSION_NAME);
      if (fs.existsSync(extensionDir)) {
        const files = fs.readdirSync(extensionDir).filter((f) => f.endsWith('.swift'));
        for (const file of files) {
          xcodeProject.addSourceFile(
            `${EXTENSION_NAME}/${file}`,
            { target: widgetTarget.uuid },
            widgetTarget.pbxNativeTarget.productReference
          );
        }
      }
    }

    return config;
  });
}

module.exports = function withLiveActivity(config) {
  config = withLiveActivityInfoPlist(config);
  config = withLiveActivityFiles(config);
  config = withLiveActivityXcode(config);
  return config;
};
