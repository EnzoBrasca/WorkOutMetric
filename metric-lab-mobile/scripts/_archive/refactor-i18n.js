const fs = require('fs');
const path = require('path');

const fileReplacements = {
  'src/components/PushPullTabs.js': [
    { old: '>PUSH<', new: '>{t("PUSH")}<' },
    { old: '>PULL<', new: '>{t("PULL")}<' }
  ],
  'src/components/ExerciseCard.js': [
    { old: '>START<', new: '>{t("START")}<' },
    { old: '>EDIT<', new: '>{t("EDIT")}<' },
    { old: '>DEL<', new: '>{t("DEL")}<' },
    { old: '>TARGET_WEIGHT<', new: '>{t("TARGET_WEIGHT")}<' },
    { old: '>KG<', new: '>{t("KG")}<' },
    { old: '>SETS_X_REPS<', new: '>{t("SETS_X_REPS")}<' }
  ],
  'src/components/Header.js': [
    { old: '>METRIC_LAB_V1.0<', new: '>{t("METRIC_LAB")}<' },
    { old: '>LOGOUT<', new: '>{t("LOGOUT")}<' }
  ],
  'src/screens/TrainScreen.js': [
    { old: '>ADD_EXERCISE<', new: '>{t("ADD_EXERCISE")}<' }
  ],
  'src/screens/DataScreen.js': [
    { old: '>1RM_ANALYTICS<', new: '>{t("1RM_ANALYTICS")}<' },
    { old: '>COMPOUND_LIFTS<', new: '>{t("COMPOUND_LIFTS")}<' },
    { old: '>ISOLATION_WORK<', new: '>{t("ISOLATION_WORK")}<' },
    { old: '>KG<', new: '>{t("KG")}<' }
  ],
  'src/components/ExerciseModal.js': [
    { old: ">'EDIT_EXERCISE'<", new: ">t('EDIT_EXERCISE')<" },
    { old: ">'NEW_EXERCISE'<", new: ">t('NEW_EXERCISE')<" },
    { old: ">NAME<", new: '>{t("EXERCISE_NAME")}<' },
    { old: ">WEIGHT (KG)<", new: '>{t("WEIGHT")} (KG)<' },
    { old: ">SETS_X_REPS<", new: '>{t("SETS_X_REPS")}<' },
    { old: ">CANCEL<", new: '>{t("CANCEL")}<' },
    { old: ">SAVE<", new: '>{t("SAVE")}<' }
  ],
  'src/components/SessionModal.js': [
    { old: ">SESSION_LOG<", new: '>{t("SESSION_LOG")}<' },
    { old: ">EXERCISE_NAME<", new: '>{t("EXERCISE_NAME")}<' },
    { old: ">TARGET_WEIGHT<", new: '>{t("TARGET_WEIGHT")}<' },
    { old: ">TARGET_SETS<", new: '>{t("TARGET_SETS")}<' },
    { old: ">COMPLETED_SETS<", new: '>{t("COMPLETED_SETS")}<' },
    { old: ">COMPLETED_REPS<", new: '>{t("COMPLETED_REPS")}<' },
    { old: ">CANCEL<", new: '>{t("CANCEL")}<' },
    { old: ">FINISH<", new: '>{t("FINISH")}<' }
  ],
  'src/screens/ConfigScreen.js': [
    { old: '>TRUE_1RM_CONFIG<', new: '>{t("TRUE_1RM_CONFIG")}<' },
    { old: '>SAVE<', new: '>{t("SAVE")}<' },
    { old: '>KG<', new: '>{t("KG")}<' }
  ]
};

Object.entries(fileReplacements).forEach(([file, replacements]) => {
  const filePath = path.join('/Users/enzo/Desktop/work-out_app/metric-lab-mobile', file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  if (!content.includes('useTranslation()')) {
    // Add import
    const importLevel = file.startsWith('src/screens') ? '../i18n' : '../i18n';
    content = `import { useTranslation } from '${importLevel}';\n` + content;
    
    // Add hook to component
    const componentMatch = content.match(/export (?:default )?function (\w+)\((.*?)\)\s*{/);
    if (componentMatch) {
      const originalDecl = componentMatch[0];
      const newDecl = originalDecl + '\n  const t = useTranslation();';
      content = content.replace(originalDecl, newDecl);
    }
  }

  // Do replacements
  replacements.forEach(rep => {
    content = content.replaceAll(rep.old, rep.new);
  });

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('i18n refactoring complete!');
