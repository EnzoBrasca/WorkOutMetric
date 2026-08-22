import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

import PushPullTabs from '../components/molecules/PushPullTabs';
import ExerciseCard from '../components/molecules/ExerciseCard';
import ExerciseModal from '../components/organisms/ExerciseModal';
import SessionModal from '../components/organisms/SessionModal';
import { useTrainScreen } from '../hooks/useTrainScreen';

export default function TrainScreen() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const {
    activeTab,
    setActiveTab,
    exercises,
    isLoading,
    removeExercise,

    modalVisible,
    editingExercise,
    handleOpenAdd,
    handleOpenEdit,
    handleCloseModal,
    handleSave,

    sessionModalVisible,
    sessionExercise,
    handleOpenSession,
    handleCloseSessionModal,
    handleSaveSession,
  } = useTrainScreen();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <PushPullTabs activeTab={activeTab} onTabSelect={setActiveTab} />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.exerciseList}>
            {exercises.filter(ex => ex.type === activeTab).map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                onEdit={handleOpenEdit}
                onDelete={removeExercise}
                onStart={handleOpenSession}
              />
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addExerciseBtn} onPress={handleOpenAdd} activeOpacity={0.8}>
          <Svg width="14" height="14" viewBox="0 0 14 14" fill={colors.primary}>
            <Path d="M 6 8 L 0 8 L 0 6 L 6 6 L 6 0 L 8 0 L 8 6 L 14 6 L 14 8 L 8 8 L 8 14 L 6 14 L 6 8 L 6 8" />
          </Svg>
          <Text style={styles.addExerciseText}>{t("ADD_EXERCISE")}</Text>
        </TouchableOpacity>

      </ScrollView>

      <ExerciseModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSave={handleSave}
        initialData={editingExercise}
      />

      <SessionModal
        visible={sessionModalVisible}
        onClose={handleCloseSessionModal}
        onSave={handleSaveSession}
        exercise={sessionExercise}
      />
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseList: {
    gap: 16,
  },
  addExerciseBtn: {
    height: 58,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  addExerciseText: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    letterSpacing: 2,
    color: colors.primary,
  },
});
