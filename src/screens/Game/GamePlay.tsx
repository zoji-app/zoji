import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { i18n } from '../../i18n';
import { useGame } from '../../hooks/useGame';
import { gameApi } from '../../services/gameApi';
import { getStyles } from './styles';
import { useTheme } from '../../contexts/ThemeContext';
import { PressableButton } from '../../components/ui';

type Props = {
  navigation: any;
  route: { params: { lang?: string } };
};

export const GamePlay: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const lang = route.params?.lang ?? 'pt';
  const {
    question,
    phase,
    selectedOption,
    displayScore,
    displayStreak,
    totalAnswered,
    handleAnswer,
    stop,
    getResults,
  } = useGame(lang);

  const handleQuit = () => {
    stop();
    const results = getResults();
    gameApi
      .saveScore({
        score: results.score,
        correct: results.correct,
        total: results.total,
        streak_max: results.streakMax,
      })
      .catch(() => {});
    navigation.replace('GameResult', {
      score: results.score,
      correct: results.correct,
      total: results.total,
      streakMax: results.streakMax,
    });
  };

  const getOptionStyle = (option: string) => {
    if (phase !== 'answered' || selectedOption === null)
      return styles.optionButton;
    if (option === question?.answer)
      return [styles.optionButton, styles.optionButtonCorrect];
    if (option === selectedOption)
      return [styles.optionButton, styles.optionButtonWrong];
    return styles.optionButton;
  };

  const getOptionTextStyle = (option: string) => {
    if (phase !== 'answered' || selectedOption === null)
      return styles.optionText;
    if (option === question?.answer)
      return [styles.optionText, styles.optionTextCorrect];
    if (option === selectedOption)
      return [styles.optionText, styles.optionTextWrong];
    return styles.optionText;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.gameplayHeader}>
          <Text style={styles.progressText}>
            {i18n.t('game.progress', { current: totalAnswered })}
          </Text>
          <Text style={styles.scoreText}>{displayScore} pts</Text>
          {displayStreak >= 2 && (
            <Text style={styles.streakBadge}>🔥 ×{displayStreak}</Text>
          )}
          <TouchableOpacity
            onPress={handleQuit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='exit-outline' size={24} color={colors.primary700} />
          </TouchableOpacity>
        </View>

        {/* Primeira carga — sem pergunta ainda */}
        {phase === 'loading' && !question ? (
          <View style={styles.hubContent}>
            <ActivityIndicator size='large' color={colors.primary700} />
          </View>
        ) : (
          <>
            <View style={styles.emojiArea}>
              {phase === 'loading' ? (
                <ActivityIndicator size='large' color={colors.primary700} />
              ) : (
                <Text style={styles.bigEmoji}>{question!.emoji}</Text>
              )}
            </View>

            {phase !== 'loading' && question && (
              <View style={styles.optionsArea}>
                {question.options.map(option => (
                  <PressableButton
                    key={option}
                    style={getOptionStyle(option)}
                    onPress={() => handleAnswer(option)}
                    disabled={phase === 'answered'}
                    activeOpacity={0.75}
                  >
                    <Text style={getOptionTextStyle(option)}>{option}</Text>
                  </PressableButton>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};
