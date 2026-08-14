/**
 * Expo Config Plugin — FirstPick Home Screen Widget (WidgetKit)
 *
 * Adds a WidgetKit extension that shows the latest order status.
 * Data is shared via App Groups (group.com.firstpick.mobile).
 *
 * The Swift extension source lives in ios/FirstPickWidget/.
 *
 * This plugin:
 *   1. Adds the App Group entitlement to the main app
 *   2. Copies Swift source files into the iOS project
 *   3. Adds a new "FirstPickWidget" extension target to Xcode project
 */

const {
  withEntitlementsPlist,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const EXTENSION_NAME = 'FirstPickWidget';
const APP_GROUP = 'group.com.firstpick.mobile';
const BUNDLE_ID_SUFFIX = 'widget';

function withWidgetEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    const entitlements = config.modResults;
    const existingGroups = entitlements['com.apple.security.application-groups'] ?? [];
    if (!existingGroups.includes(APP_GROUP)) {
      entitlements['com.apple.security.application-groups'] = [
        ...existingGroups,
        APP_GROUP,
      ];
    }
    return config;
  });
}

function withWidgetFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      const extensionDir = path.join(platformProjectRoot, EXTENSION_NAME);

      if (!fs.existsSync(extensionDir)) {
        fs.mkdirSync(extensionDir, { recursive: true });
      }

      // Copy Swift source files
      const srcDir = path.join(__dirname, '..', 'ios', EXTENSION_NAME);
      if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.swift'));
        for (const file of files) {
          fs.copyFileSync(path.join(srcDir, file), path.join(extensionDir, file));
        }
      }

      // Widget extension Info.plist
      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>FirstPickWidget</string>
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

      // Widget extension entitlements (App Group)
      const entitlementsPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>`;
      fs.writeFileSync(
        path.join(extensionDir, `${EXTENSION_NAME}.entitlements`),
        entitlementsPlist
      );

      return config;
    },
  ]);
}

function withWidgetXcode(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const { platformProjectRoot } = config.modRequest;
    const mainBundleId = config.ios?.bundleIdentifier ?? 'com.firstpick.mobile';
    const extensionBundleId = `${mainBundleId}.${BUNDLE_ID_SUFFIX}`;

    // Skip if already added
    const existingTargets = xcodeProject.pbxNativeTargetSection();
    const alreadyExists = Object.values(existingTargets).some(
      (t) => t && t.name === EXTENSION_NAME
    );
    if (alreadyExists) return config;

    const widgetTarget = xcodeProject.addTarget(
      EXTENSION_NAME,
      'app_extension',
      EXTENSION_NAME,
      extensionBundleId
    );

    if (widgetTarget) {
      xcodeProject.addBuildProperty('SWIFT_VERSION', '5.0', 'Release', EXTENSION_NAME);
      xcodeProject.addBuildProperty('SWIFT_VERSION', '5.0', 'Debug', EXTENSION_NAME);

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

module.exports = function withWidget(config) {
  config = withWidgetEntitlements(config);
  config = withWidgetFiles(config);
  config = withWidgetXcode(config);
  return config;
};
