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
    error: 'Failed to update profile.'
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
    error: 'Error al actualizar el perfil.'
  }
};

export function useProfileScreen() {
  const { user, token, logout, set: setAuth } = useAuthStore();
  const { theme, font, language, setTheme, setFont, setLanguage, customColors, setCustomColor } = useSettingsStore();

  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const currentT = translations[language] || translations.en;

  const handleUpdate = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          user_id: user.id,
          new_username: newUsername.trim() || undefined,
          new_password: newPassword.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMessage(currentT.success);
      setNewPassword(''); // clear password field

      // Update local username state if it changed
      if (newUsername.trim()) {
        const updatedUser = { ...user, username: newUsername.trim() };
        setAuth({ user: updatedUser });
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
