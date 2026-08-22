const fs = require('fs');
const path = require('path');

const fileReplacements = {
  'src/screens/LoginScreen.js': [
    { old: ">METRIC_LAB<", new: '>{t("METRIC_LAB")}<' },
    { old: ">// INICIO_SESIÓN<", new: '>{t("LOGIN")}<' },
    { old: ">USUARIO<", new: '>{t("USERNAME")}<' },
    { old: 'placeholder="INGRESAR_USUARIO"', new: 'placeholder={t("USERNAME")}' },
    { old: ">CONTRASEÑA<", new: '>{t("PASSWORD")}<' },
    { old: 'placeholder="INGRESAR_CONTRASEÑA"', new: 'placeholder={t("PASSWORD")}' },
    { old: ">INGRESAR<", new: '>{t("LOGIN")}<' },
    { old: ">¿NO_TIENES_CUENTA? [REGÍSTRATE]<", new: '>{t("NO_ACCOUNT_REGISTER")}<' }
  ],
  'src/screens/RegisterScreen.js': [
    { old: ">METRIC_LAB<", new: '>{t("METRIC_LAB")}<' },
    { old: ">// REGISTRO_SISTEMA<", new: '>{t("REGISTER")}<' },
    { old: ">NUEVO_USUARIO<", new: '>{t("USERNAME")}<' },
    { old: 'placeholder="INGRESAR_USUARIO"', new: 'placeholder={t("USERNAME")}' },
    { old: ">NUEVA_CONTRASEÑA<", new: '>{t("PASSWORD")}<' },
    { old: 'placeholder="INGRESAR_CONTRASEÑA"', new: 'placeholder={t("PASSWORD")}' },
    { old: ">REGISTRARSE<", new: '>{t("REGISTER")}<' },
    { old: ">¿YA_TIENES_CUENTA? [INGRESAR]<", new: '>{t("HAVE_ACCOUNT_LOGIN")}<' }
  ]
};

Object.entries(fileReplacements).forEach(([file, replacements]) => {
  const filePath = path.join('/Users/enzo/Desktop/work-out_app/metric-lab-mobile', file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  if (!content.includes('useTranslation()')) {
    const importLevel = file.startsWith('src/screens') ? '../i18n' : '../i18n';
    content = `import { useTranslation } from '${importLevel}';\n` + content;
    
    const componentMatch = content.match(/export (?:default )?function (\w+)\((.*?)\)\s*{/);
    if (componentMatch) {
      const originalDecl = componentMatch[0];
      const newDecl = originalDecl + '\n  const t = useTranslation();';
      content = content.replace(originalDecl, newDecl);
    }
  }

  replacements.forEach(rep => {
    content = content.replaceAll(rep.old, rep.new);
  });

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Auth i18n refactoring complete!');
