import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { API_URL } from '../config/api';

const translations = {
  en: {
    title: 'PROFILE',
    account: 'ACCOUNT SETTINGS',
    username: 'NEW USERNAME',
    password: 'NEW PASSWORD',
    save: 'SAVE CHANGES',
    personalization: 'PERSONALIZATION',
    theme: 'THEME',
    font: 'FONT',
    language: 'LANGUAGE',
    logout: 'LOGOUT',
    success: 'Profile updated successfully!',
    error: 'Failed to update profile.',
    nothingToUpdate: 'Enter a new username or password first.',
    usernameTooShort: 'Username must be at least 3 characters.',
    passwordTooShort: 'Password must be at least 6 characters.'
  },
  es: {
    title: 'PERFIL',
    account: 'AJUSTES DE CUENTA',
    username: 'NUEVO USUARIO',
    password: 'NUEVA CONTRASEÑA',
    save: 'GUARDAR CAMBIOS',
    personalization: 'PERSONALIZACIÓN',
    theme: 'TEMA',
    font: 'FUENTE',
    language: 'IDIOMA',
    logout: 'CERRAR SESIÓN',
    success: '¡Perfil actualizado con éxito!',
    error: 'Error al actualizar el perfil.',
    nothingToUpdate: 'Ingresá un nuevo usuario o contraseña primero.',
    usernameTooShort: 'El usuario debe tener al menos 3 caracteres.',
    passwordTooShort: 'La contraseña debe tener al menos 6 caracteres.'
  }
};

const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 6;

export function useProfileScreen() {
  const { user, token, logout, setUsername } = useAuthStore();
  const { theme, font, language, setTheme, setFont, setLanguage, customColors, setCustomColor } = useSettingsStore();

  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const currentT = translations[language] || translations.en;

  const handleUpdate = async () => {
    // The form accepted anything, including a submit with both fields empty,
    // which fired a pointless request. An unchanged username is not an edit:
    // only send what actually differs.
    const username = newUsername.trim();
    const password = newPassword.trim();
    const usernameChanged = username && username !== user?.username;

    if (!usernameChanged && !password) {
      setMessage(currentT.nothingToUpdate);
      return;
    }
    if (usernameChanged && username.length < MIN_USERNAME_LENGTH) {
      setMessage(currentT.usernameTooShort);
      return;
    }
    if (password && password.length < MIN_PASSWORD_LENGTH) {
      setMessage(currentT.passwordTooShort);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          user_id: user.id,
          new_username: usernameChanged ? username : undefined,
          new_password: password || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMessage(currentT.success);
      setNewPassword(''); // clear password field

      // Update local username state if it changed
      if (usernameChanged) {
        setUsername(username);
      }
    } catch (err) {
      setMessage(err.message || currentT.error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDarkBackground = () => {
    setCustomColor('background', '#131313');
    setCustomColor('backgroundCard', '#1F1F1F');
    setCustomColor('textPrimary', '#E2E2E2');
  };

  const handleSelectLightBackground = () => {
    setCustomColor('background', '#ffffff');
    setCustomColor('backgroundCard', '#f4f4f5');
    setCustomColor('textPrimary', '#09090b');
  };

  const handleSelectAccentColor = (colorHex) => {
    setCustomColor('primary', colorHex);
  };

  return {
    currentT,
    message,
    loading,

    newUsername,
    setNewUsername,
    newPassword,
    setNewPassword,
    handleUpdate,

    theme,
    font,
    language,
    setTheme,
    setFont,
    setLanguage,

    customColors,
    handleSelectDarkBackground,
    handleSelectLightBackground,
    handleSelectAccentColor,

    logout,
  };
}
