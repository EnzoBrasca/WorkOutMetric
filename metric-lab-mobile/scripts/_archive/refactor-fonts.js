const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'App.js',
  'src/screens/LogsScreen.js',
  'src/screens/RegisterScreen.js',
  'src/screens/ProfileScreen.js',
  'src/screens/DataScreen.js',
  'src/screens/ConfigScreen.js',
  'src/screens/TrainScreen.js',
  'src/screens/LoginScreen.js',
  'src/components/PushPullTabs.js',
  'src/components/ExerciseCard.js',
  'src/components/Header.js',
  'src/components/SessionModal.js',
  'src/components/ExerciseModal.js',
  'src/components/TabBarIcon.js'
];

filesToUpdate.forEach(file => {
  const filePath = path.join('/Users/enzo/Desktop/work-out_app/metric-lab-mobile', file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace const colors = useTheme(); with const { colors, fonts } = useTheme();
  content = content.replace(
    /const colors = useTheme\(\);/g,
    'const { colors, fonts } = useTheme();'
  );

  // Replace getStyles(colors) with getStyles(colors, fonts)
  content = content.replace(
    /const styles = getStyles\(colors\);/g,
    'const styles = getStyles(colors, fonts);'
  );
  
  content = content.replace(
    /const getStyles = \(colors\) =>/g,
    'const getStyles = (colors, fonts) =>'
  );

  // Replace font families
  content = content.replace(/fontFamily:\s*'PixelifySans_400Regular'/g, 'fontFamily: fonts.regular');
  content = content.replace(/fontFamily:\s*'PixelifySans_500Medium'/g, 'fontFamily: fonts.medium');
  content = content.replace(/fontFamily:\s*'PixelifySans_600SemiBold'/g, 'fontFamily: fonts.semiBold');
  content = content.replace(/fontFamily:\s*'PixelifySans_700Bold'/g, 'fontFamily: fonts.bold');

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Fonts refactoring complete!');
