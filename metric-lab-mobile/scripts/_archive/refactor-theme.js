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

  // Skip if already refactored
  if (content.includes('useTheme(')) return;

  // Replace import
  if (file === 'App.js') {
    content = content.replace(
      "import { colors } from './src/theme/colors';",
      "import { useTheme } from './src/theme/useTheme';"
    );
  } else {
    content = content.replace(
      "import { colors } from '../theme/colors';",
      "import { useTheme } from '../theme/useTheme';"
    );
  }

  // Find component function definition
  const componentMatch = content.match(/export (?:default )?function (\w+)\((.*?)\)\s*{/);
  
  if (componentMatch) {
    const componentName = componentMatch[1];
    const originalDecl = componentMatch[0];
    
    // Check if it uses styles
    const usesStyles = content.includes('styles.');
    const hasStyleSheet = content.includes('const styles = StyleSheet.create({');

    let newDecl = originalDecl + '\n  const colors = useTheme();';
    if (usesStyles && hasStyleSheet) {
      newDecl += '\n  const styles = getStyles(colors);';
      
      // Update StyleSheet.create to getStyles
      content = content.replace(
        'const styles = StyleSheet.create({',
        'const getStyles = (colors) => StyleSheet.create({'
      );
    }
    
    content = content.replace(originalDecl, newDecl);
  }

  // Special cases for components defined as const (like TabBarIcon)
  const constComponentMatch = content.match(/export const (\w+) = \((.*?)\) => {/);
  if (constComponentMatch) {
    const componentName = constComponentMatch[1];
    const originalDecl = constComponentMatch[0];
    let newDecl = originalDecl + '\n  const colors = useTheme();';
    content = content.replace(originalDecl, newDecl);
  }

  // Special case for AppTabs in App.js
  if (file === 'App.js') {
    content = content.replace(
      'function AppTabs() {',
      'function AppTabs() {\n  const colors = useTheme();\n  const styles = getStyles(colors);'
    );
    content = content.replace(
      'const styles = StyleSheet.create({',
      'const getStyles = (colors) => StyleSheet.create({'
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Refactoring complete!');
