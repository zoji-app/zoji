import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { i18n } from '../../i18n';
import { gameApi } from '../../services/gameApi';
import {
  GameRankingEntry,
  RankingResponse,
  RankingSection,
} from '../../types/game';
import { getStyles } from './styles';
import { colors as staticColors } from '../../theme/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, PressableButton } from '../../components/ui';

type Tab = 'today' | 'alltime';
type Props = { navigation: any };

function RankingRow({
  entry,
  position,
  isMe,
  rankStyles,
}: {
  entry: GameRankingEntry;
  position: number;
  isMe: boolean;
  rankStyles: ReturnType<typeof getRankStyles>;
}) {
  const medal =
    position === 1
      ? '🥇'
      : position === 2
        ? '🥈'
        : position === 3
          ? '🥉'
          : null;
  return (
    <View style={[rankStyles.row, isMe && rankStyles.rowMe]}>
      <Text style={rankStyles.position}>{medal ?? `${position}.`}</Text>
      <Text style={rankStyles.profileEmoji}>{entry.profile_emoji}</Text>
      <View style={rankStyles.nameCol}>
        <Text
          style={[rankStyles.nickname, isMe && rankStyles.nicknameMe]}
          numberOfLines={1}
        >
          {entry.nickname}
        </Text>
        {entry.is_friend && <Text style={rankStyles.friendBadge}>amigo</Text>}
      </View>
      <View style={rankStyles.scoreCol}>
        <Text style={[rankStyles.score, isMe && rankStyles.scoreMe]}>
          {entry.score}
        </Text>
        <Text style={rankStyles.sub}>
          {entry.correct}/{entry.total}
        </Text>
      </View>
    </View>
  );
}

function RankingList({
  section,
  myUserId,
  isToday,
  styles,
  rankStyles,
}: {
  section: RankingSection;
  myUserId: number;
  isToday: boolean;
  styles: ReturnType<typeof getStyles>;
  rankStyles: ReturnType<typeof getRankStyles>;
}) {
  if (section.ranking.length === 0) {
    return (
      <Text style={[styles.errorText, { marginTop: 32, textAlign: 'center' }]}>
        {i18n.t('game.noRankingYet')}
      </Text>
    );
  }

  const userInTop = section.ranking.some(e => e.user_id === myUserId);
  const hasNotPlayed = isToday && !userInTop && !section.my_entry;

  return (
    <>
      <Card style={rankStyles.list}>
        {section.ranking.map((entry, index) => (
          <RankingRow
            key={entry.user_id}
            entry={entry}
            position={index + 1}
            isMe={entry.user_id === myUserId}
            rankStyles={rankStyles}
          />
        ))}
      </Card>

      {section.my_entry && section.my_rank !== null && (
        <>
          <View style={rankStyles.separator}>
            <Text style={rankStyles.separatorText}>• • •</Text>
          </View>
          <Card style={rankStyles.list}>
            <View style={rankStyles.myRankLabelRow}>
              <Text style={rankStyles.myRankLabel}>
                {i18n.t('game.myPosition', { rank: section.my_rank })}
              </Text>
            </View>
            <RankingRow
              entry={section.my_entry}
              position={section.my_rank}
              isMe={true}
              rankStyles={rankStyles}
            />
          </Card>
        </>
      )}

      {hasNotPlayed && (
        <Text
          style={[styles.errorText, { marginTop: 16, textAlign: 'center' }]}
        >
          {i18n.t('game.notPlayedToday')}
        </Text>
      )}
    </>
  );
}

export const GameRanking: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const rankStyles = useMemo(() => getRankStyles(colors), [colors]);
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('today');

  useEffect(() => {
    gameApi
      .fetchRanking()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={rankStyles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={rankStyles.backButton}
          >
            <Ionicons name='arrow-back' size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={rankStyles.headerCenter}>
            <Text style={rankStyles.headerTitle}>{i18n.t('game.ranking')}</Text>
            {data && (
              <Text style={rankStyles.headerSubtitle}>
                {tab === 'today'
                  ? data.date.split('-').reverse().join('/')
                  : `${i18n.t('game.rankingSince')} ${data.since.split('-').reverse().join('/')}`}
              </Text>
            )}
          </View>
          <View style={rankStyles.headerSpacer} />
        </View>

        {/* Abas */}
        <View style={rankStyles.tabBar}>
          <PressableButton
            style={[rankStyles.tab, tab === 'today' && rankStyles.tabActive]}
            onPress={() => setTab('today')}
          >
            <Text
              style={[
                rankStyles.tabText,
                tab === 'today' && rankStyles.tabTextActive,
              ]}
            >
              {i18n.t('game.rankingToday')}
            </Text>
          </PressableButton>
          <PressableButton
            style={[rankStyles.tab, tab === 'alltime' && rankStyles.tabActive]}
            onPress={() => setTab('alltime')}
          >
            <Text
              style={[
                rankStyles.tabText,
                tab === 'alltime' && rankStyles.tabTextActive,
              ]}
            >
              {i18n.t('game.rankingAllTime')}
            </Text>
          </PressableButton>
        </View>

        {loading ? (
          <View style={styles.hubContent}>
            <ActivityIndicator size='large' color={colors.primary700} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {data && (
              <RankingList
                section={tab === 'today' ? data.today : data.alltime}
                myUserId={data.my_user_id}
                isToday={tab === 'today'}
                styles={styles}
                rankStyles={rankStyles}
              />
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const getRankStyles = (colors: typeof staticColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    backButton: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontFamily: 'Fredoka_600SemiBold',
      fontSize: 30,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    headerSpacer: {
      width: 36,
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
      backgroundColor: colors.cardBackground,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary700,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.primary700,
      fontWeight: '700',
    },
    list: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.hairline,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
      gap: 10,
    },
    rowMe: {
      backgroundColor: colors.primary700 + '15',
    },
    position: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      width: 28,
      textAlign: 'center',
    },
    profileEmoji: {
      fontSize: 22,
    },
    nameCol: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    nickname: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    nicknameMe: {
      fontWeight: '700',
    },
    friendBadge: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary700,
      backgroundColor: colors.primary700 + '15',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 99,
      overflow: 'hidden',
    },
    scoreCol: {
      alignItems: 'flex-end',
    },
    score: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    scoreMe: {
      color: colors.primary700,
    },
    sub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    separator: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    separatorText: {
      color: colors.textSecondary,
      fontSize: 16,
      letterSpacing: 4,
    },
    myRankLabelRow: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 4,
    },
    myRankLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary700,
    },
  });
