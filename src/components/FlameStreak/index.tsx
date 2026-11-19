import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  StreakData,
  StreakState,
  getStreakLevel,
} from '../../services/streakService';

// ─── Flame geometry ───────────────────────────────────────────────────────────
// ViewBox: 100 × 150. Tip at top (y≈4), base at bottom (y≈122).
// Path is intentionally wide (x range 10–90) so the flame looks full,
// not needle-thin, even at small display sizes.
const VIEWBOX_W = 100;
const VIEWBOX_H = 150;

const FLAME_PATH =
  'M 50 4 C 70 16 90 38 87 58 C 85 70 90 82 82 96 C 76 108 63 116 50 120 C 37 116 24 108 18 96 C 10 82 15 70 13 58 C 10 38 30 16 50 4 Z';

const INNER_PATH =
  'M 50 36 C 60 46 70 60 68 72 C 66 82 69 90 64 99 C 61 104 55 107 50 108 C 45 107 39 104 36 99 C 31 90 34 82 32 72 C 30 60 40 46 50 36 Z';

const LEVEL_FILL: Record<0 | 1 | 2 | 3 | 4 | 5, number> = {
  0: 0,
  1: 0.25,
  2: 0.45,
  3: 0.62,
  4: 0.78,
  5: 1.0,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface FlameStreakProps {
  streakData: StreakData;
  streakState: StreakState;
  pendingMilestone: number | null;
  onMilestoneDismiss?: () => void;
  /** Width of the flame in pixels. Height = width × 1.5. Default: 28. */
  size?: number;
  style?: object;
}

export const FlameStreak: React.FC<FlameStreakProps> = ({
  streakData,
  streakState,
  pendingMilestone,
  onMilestoneDismiss,
  size = 28,
  style,
}) => {
  const isAtRisk = streakState === 'at-risk';
  const isBrokenOrNone = streakState === 'broken' || streakState === 'none';

  const displayCount = isBrokenOrNone ? 0 : streakData.count;
  const level = isBrokenOrNone ? 0 : getStreakLevel(streakData.count);
  const targetFill = LEVEL_FILL[level];
  const badgeLabel = displayCount > 99 ? '99+' : String(displayCount);

  const flameW = size;
  const flameH = size * (VIEWBOX_H / VIEWBOX_W);

  // ── Shared values ──────────────────────────────────────────────────────────
  const clipFill = useSharedValue(0);
  const milestoneScale = useSharedValue(1);

  useEffect(() => {
    clipFill.value = withTiming(targetFill, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetFill]);

  useEffect(() => {
    if (!pendingMilestone) return;
    milestoneScale.value = withSequence(
      withTiming(1.45, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(0.95, { duration: 180 }),
      withTiming(1.3, { duration: 180 }),
      withTiming(1.0, { duration: 520, easing: Easing.out(Easing.quad) })
    );
    const timer = setTimeout(() => onMilestoneDismiss?.(), 1300);
    return () => clearTimeout(timer);
  }, [pendingMilestone]);

  // ── Animated styles ────────────────────────────────────────────────────────

  const activeClipStyle = useAnimatedStyle(() => ({
    height: clipFill.value * flameH,
  }));

  const milestoneStyle = useAnimatedStyle(() => ({
    transform: [{ scale: milestoneScale.value }],
  }));

  // ── Colors ─────────────────────────────────────────────────────────────────
  const gradientColors = isAtRisk
    ? { bottom: '#AAAAAA', mid: '#888888', top: '#666666' }
    : { bottom: '#FFD700', mid: '#FF6B00', top: '#CC0000' };

  const innerGradColors = isAtRisk
    ? { bottom: 'rgba(200,200,200,0.7)', top: 'rgba(200,200,200,0)' }
    : { bottom: 'rgba(255,245,160,0.85)', top: 'rgba(255,200,80,0)' };

  return (
    <Animated.View style={[styles.container, milestoneStyle, style]}>
      {/* Positioning context for the badge */}
      <View style={{ width: flameW }}>
        {/* Flame */}
        <View style={{ width: flameW, height: flameH }}>
          {/* Ghost silhouette — always full height */}
          <Svg
            width={flameW}
            height={flameH}
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <Path
              d={FLAME_PATH}
              fill={isAtRisk ? 'rgba(100,100,100,0.18)' : 'rgba(0,0,0,0.10)'}
            />
          </Svg>

          {/* Active flame — revealed from bottom upward */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: flameW,
                overflow: 'hidden',
              },
              activeClipStyle,
            ]}
          >
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: flameW,
                height: flameH,
              }}
            >
              <Svg
                width={flameW}
                height={flameH}
                viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
              >
                <Defs>
                  <LinearGradient
                    id='flameGrad'
                    x1='50'
                    y1='120'
                    x2='50'
                    y2='4'
                    gradientUnits='userSpaceOnUse'
                  >
                    <Stop
                      offset='0'
                      stopColor={gradientColors.bottom}
                      stopOpacity='1'
                    />
                    <Stop
                      offset='0.5'
                      stopColor={gradientColors.mid}
                      stopOpacity='1'
                    />
                    <Stop
                      offset='1'
                      stopColor={gradientColors.top}
                      stopOpacity='1'
                    />
                  </LinearGradient>
                  <LinearGradient
                    id='innerGrad'
                    x1='50'
                    y1='108'
                    x2='50'
                    y2='36'
                    gradientUnits='userSpaceOnUse'
                  >
                    <Stop offset='0' stopColor={innerGradColors.bottom} />
                    <Stop offset='1' stopColor={innerGradColors.top} />
                  </LinearGradient>
                </Defs>
                <Path d={FLAME_PATH} fill='url(#flameGrad)' />
                <Path d={INNER_PATH} fill='url(#innerGrad)' />
              </Svg>
            </View>
          </Animated.View>
        </View>

        {/* Counter — notification badge at top-right of the flame */}
        {displayCount > 0 && pendingMilestone === null && (
          <View style={[styles.badge, isAtRisk && styles.badgeAtRisk]}>
            <Text style={styles.badgeText}>
              {isAtRisk ? `${badgeLabel}💧` : badgeLabel}
            </Text>
          </View>
        )}

        {/* Milestone badge — replaces counter badge briefly */}
        {pendingMilestone !== null && (
          <View style={styles.milestoneBadge}>
            <Text style={styles.milestoneText}>{pendingMilestone}🔥</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3D00',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
  },
  badgeAtRisk: {
    backgroundColor: '#999',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },
  milestoneBadge: {
    position: 'absolute',
    top: -6,
    right: -14,
    backgroundColor: '#FF3D00',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  milestoneText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
