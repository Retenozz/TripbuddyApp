const appJson = require('./app.json');

const existingPlugins = appJson.expo.plugins || [];
const hasImagePickerPlugin = existingPlugins.some((plugin) => {
  if (typeof plugin === 'string') return plugin === 'expo-image-picker';
  return Array.isArray(plugin) && plugin[0] === 'expo-image-picker';
});

// กรอง react-native-maps ออกจาก plugins เผื่อมีอยู่ใน app.json
const plugins = existingPlugins.filter((plugin) => {
  if (typeof plugin === 'string') return plugin !== 'react-native-maps';
  return !(Array.isArray(plugin) && plugin[0] === 'react-native-maps');
});

if (!hasImagePickerPlugin) {
  plugins.push('expo-image-picker');
}

module.exports = {
  expo: {
    ...appJson.expo,

     android: {
      package: "com.metenozz.travel"
    },
    extra: {
      ...(appJson.expo.extra || {}),
      eas: {
        projectId: "e4cdb1e4-0221-4c56-9b85-ea446b34036c"
      }
    },

    plugins,
  },
};