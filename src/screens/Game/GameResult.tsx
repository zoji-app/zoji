import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { i18n } from '../../i18n';
import { gameApi } from '../../services/gameApi';
import { RankingResponse } from '../../types/game';
import { getStyles } from './styles';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, ScreenHeader } from '../../components/ui';

type Props = {
  navigation: any;
  route: {
    params: {
      score: number;
      correct: number;
      total: number;
      streakMax: number;
    };
  };
};

export const GameResult: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { score, correct, total, streakMax } = route.params;
  const [rankingData, setRankingData] = useState<RankingResponse | null>(null);
  const [rankingLoading, setRankingLoading] = useState(true);

  useEffect(() => {
    gameApi
      .fetchRanking()
      .then(setRankingData)
      .catch(() => {})
      .finally(() => setRankingLoading(false));
  }, []);

  const trophy = score >= 500 ? '🏆' : score >= 300 ? '🥈' : '🎮';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader
          title={i18n.t('game.resultTitle')}
          onBack={() => navigation.navigate('MainApp', { screen: 'Game' })}
        />

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultContent}>
            <Text style={styles.resultTrophy}>{trophy}</Text>
            <Text style={styles.resultScore}>{score}</Text>
            <Text style={styles.resultScoreLabel}>{i18n.t('game.points')}</Text>

            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>
                  {correct}/{total}
                </Text>
                <Text style={styles.statLabel}>{i18n.t('game.correct')}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>🔥 {streakMax}</Text>
                <Text style={styles.statLabel}>
                  {i18n.t('game.bestStreak')}
                </Text>
              </Card>
            </View>

            <Text style={styles.rankingTitle}>{i18n.t('game.ranking')}</Text>

            {rankingLoading ? (
              <ActivityIndicator
                size='small'
                color={colors.primary700}
                style={{ marginBottom: 24 }}
              />
            ) : !rankingData || rankingData.today.ranking.length === 0 ? (
              <Text style={[styles.errorText, { marginBottom: 24 }]}>
                {i18n.t('game.noRankingYet')}
              </Text>
            ) : (
              <Card style={styles.rankingList}>
                {rankingData.today.ranking.map((entry, index) => (
                  <View
                    key={entry.user_id}
                    style={[
                      styles.rankingRow,
                      entry.user_id === rankingData.my_user_id &&
                        ({ backgroundColor: colors.primary700 + '15' } as any),
                    ]}
                  >
                    <Text style={styles.rankingPosition}>
                      {index === 0
                        ? '🥇'
                        : index === 1
                          ? '🥈'
                          : index === 2
                            ? '🥉'
                            : `${index + 1}.`}
                    </Text>
                    <Text style={styles.rankingEmoji}>
                      {entry.profile_emoji}
                    </Text>
                    <Text style={styles.rankingNickname} numberOfLines={1}>
                      {entry.nickname}
                      {entry.is_friend ? ' 💜' : ''}
                    </Text>
                    <Text style={styles.rankingScore}>{entry.score}</Text>
                  </View>
                ))}
              </Card>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
