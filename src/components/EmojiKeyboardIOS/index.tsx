import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmojisByCategory, EmojiType } from 'rn-emoji-keyboard';
import { useThemeColors } from '../../contexts/ThemeContext';
import { i18n } from '../../i18n';
import { useLanguage } from '../../contexts/LanguageContext';
import { searchEmojis } from '../../utils/emojiSearch';
import {
  getEmojiKeywords,
  type KeywordsMap,
} from '../../services/emojiKeywordsApi';

// JsonEmoji is not exported by rn-emoji-keyboard, mirror it here
type JsonEmoji = {
  emoji: string;
  name: string;
  v: string;
  toneEnabled: boolean;
  tones?: Record<string, string>; // tone key (e.g. '1F3FB') → toned emoji string
  keywords?: string[];
};

// iOS-style category order: smileys+people merged, activities before travel
const CATEGORY_ORDER = [
  'recently_used',
  'smileys_people',
  'animals_nature',
  'food_drink',
  'activities',
  'travel_places',
  'objects',
  'symbols',
  'flags',
] as const;

type CategoryKey = (typeof CATEGORY_ORDER)[number];

const CATEGORY_ICONS: Record<CategoryKey, string> = {
  recently_used: '🕐',
  smileys_people: '😀',
  animals_nature: '🐻',
  food_drink: '🍔',
  activities: '⚽',
  travel_places: '🌇',
  objects: '💡',
  symbols: '🔣',
  flags: '🏁',
};

const RECENT_KEY = '@zoji:recently_used_emojis';
const TONE_KEY = '@zoji:skin_tone';
// Increment when the stored format changes to force a cache reset on next load.
const CACHE_VERSION = '2';
const CACHE_VERSION_KEY = '@zoji:emoji_cache_version';
const MAX_RECENT = 32;
const NUM_COLS = 8;
const TAB_HEIGHT = 44;
const SECTION_HEADER_HEIGHT = 28;
const TAB_ITEM_WIDTH = 44;
const TONE_PICKER_HEIGHT = 56;
const TONE_ITEM_SIZE = 44;

// '' = default (no tone), then light → dark (Fitzpatrick scale keys)
const TONE_KEYS = ['', '1F3FB', '1F3FC', '1F3FD', '1F3FE', '1F3FF'];

function getToned(jsonEmoji: JsonEmoji, toneKey: string): string {
  if (!toneKey) return jsonEmoji.emoji;
  return jsonEmoji.tones?.[toneKey] ?? jsonEmoji.emoji;
}

type EmojiRow = JsonEmoji[];

interface Section {
  key: CategoryKey;
  data: EmojiRow[];
}

interface Props {
  onEmojiSelected: (emoji: EmojiType) => void;
  emojisByCategory: EmojisByCategory[];
  emojiSize?: number;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size)
    result.push(arr.slice(i, i + size));
  return result;
}

export const EmojiKeyboardIOS: React.FC<Props> = ({
  onEmojiSelected,
  emojisByCategory,
  emojiSize = 35,
}) => {
  const { width } = useWindowDimensions();
  const { language } = useLanguage();
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const sectionListRef = useRef<SectionList<EmojiRow, Section>>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const [activeCategory, setActiveCategory] =
    useState<CategoryKey>('smileys_people');
  const [recentEmojis, setRecentEmojis] = useState<JsonEmoji[]>([]);
  const activeCategoryRef = useRef<CategoryKey>('smileys_people');
  const [globalTone, setGlobalTone] = useState('');
  const globalToneRef = useRef('');
  const [tonePicker, setTonePicker] = useState<{
    emoji: JsonEmoji;
    pageX: number;
    pageY: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const isSearching = searchQuery.trim().length > 0;
  const [emojiKeywords, setEmojiKeywords] = useState<KeywordsMap | undefined>(
    undefined
  );

  useEffect(() => {
    getEmojiKeywords()
      .then(setEmojiKeywords)
      .catch(() => {});
  }, []);

  // Cell size fits NUM_COLS across the screen with small padding
  const cellSize = useMemo(() => Math.floor((width - 16) / NUM_COLS), [width]);

  // Load recently used and skin tone from storage on mount.
  // If the cache version doesn't match, clear stale data (old concatenated tone format).
  useEffect(() => {
    AsyncStorage.multiGet([CACHE_VERSION_KEY, RECENT_KEY, TONE_KEY])
      .then(([[, version], [, raw], [, tone]]) => {
        if (version !== CACHE_VERSION) {
          AsyncStorage.multiSet([
            [CACHE_VERSION_KEY, CACHE_VERSION],
            [RECENT_KEY, '[]'],
          ]).catch(() => {});
          AsyncStorage.removeItem(TONE_KEY).catch(() => {});
          return;
        }
        if (raw) setRecentEmojis(JSON.parse(raw));
        if (tone && TONE_KEYS.includes(tone)) {
          setGlobalTone(tone);
          globalToneRef.current = tone;
        }
      })
      .catch(() => {});
  }, []);

  // Build sections: merge smileys+people, apply iOS order
  const sections = useMemo<Section[]>(() => {
    const byTitle = new Map<string, JsonEmoji[]>();
    for (const cat of emojisByCategory)
      byTitle.set(cat.title, cat.data as JsonEmoji[]);

    const emojiMap: Partial<Record<CategoryKey, JsonEmoji[]>> = {
      smileys_people: [
        ...(byTitle.get('smileys_emotion') ?? []),
        ...(byTitle.get('people_body') ?? []),
      ],
      animals_nature: byTitle.get('animals_nature') ?? [],
      food_drink: byTitle.get('food_drink') ?? [],
      activities: byTitle.get('activities') ?? [],
      travel_places: byTitle.get('travel_places') ?? [],
      objects: byTitle.get('objects') ?? [],
      symbols: byTitle.get('symbols') ?? [],
      flags: byTitle.get('flags') ?? [],
    };

    const result: Section[] = [];

    if (recentEmojis.length > 0) {
      result.push({
        key: 'recently_used',
        data: chunk(recentEmojis, NUM_COLS),
      });
    }

    for (const key of CATEGORY_ORDER) {
      if (key === 'recently_used') continue;
      const emojis = emojiMap[key];
      if (emojis && emojis.length > 0)
        result.push({ key, data: chunk(emojis, NUM_COLS) });
    }

    return result;
  }, [emojisByCategory, recentEmojis]);

  const presentCategories = useMemo(() => sections.map(s => s.key), [sections]);

  // Flat deduplicated list for search (all categories, recently_used excluded to avoid duplicates)
  const allEmojis = useMemo<JsonEmoji[]>(() => {
    const seen = new Set<string>();
    const result: JsonEmoji[] = [];
    for (const section of sections) {
      if (section.key === 'recently_used') continue;
      for (const row of section.data) {
        for (const e of row) {
          if (!seen.has(e.emoji)) {
            seen.add(e.emoji);
            result.push(e);
          }
        }
      }
    }
    return result;
  }, [sections]);

  const searchResults = useMemo<JsonEmoji[]>(
    () =>
      isSearching
        ? searchEmojis(searchQuery, allEmojis, language, emojiKeywords)
        : [],
    [searchQuery, allEmojis, language, isSearching, emojiKeywords]
  );

  // Sync tab bar scroll when active category changes via list scrolling
  useEffect(() => {
    const idx = presentCategories.indexOf(activeCategory);
    if (idx < 0 || !tabScrollRef.current) return;
    tabScrollRef.current.scrollTo({ x: idx * TAB_ITEM_WIDTH, animated: true });
  }, [activeCategory, presentCategories]);

  const dispatchEmoji = useCallback(
    (jsonEmoji: JsonEmoji) => {
      const emojiType: EmojiType = {
        emoji: jsonEmoji.emoji,
        name: jsonEmoji.name,
        slug: jsonEmoji.name.replace(/\s+/g, '_'),
        unicode_version: jsonEmoji.v,
        toneEnabled: jsonEmoji.toneEnabled,
      };
      setRecentEmojis(prev => {
        const next = [
          jsonEmoji,
          ...prev.filter(e => e.emoji !== jsonEmoji.emoji),
        ].slice(0, MAX_RECENT);
        AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      onEmojiSelected(emojiType);
    },
    [onEmojiSelected]
  );

  const handleEmojiPress = useCallback(
    (jsonEmoji: JsonEmoji) => {
      setTonePicker(null);
      const tonedStr = jsonEmoji.toneEnabled
        ? getToned(jsonEmoji, globalToneRef.current)
        : jsonEmoji.emoji;
      // Store toneEnabled:false so recents don't re-apply tone on next tap
      dispatchEmoji({ ...jsonEmoji, emoji: tonedStr, toneEnabled: false });
    },
    [dispatchEmoji]
  );

  const handleEmojiLongPress = useCallback(
    (jsonEmoji: JsonEmoji, pageX: number, pageY: number) => {
      if (jsonEmoji.toneEnabled && jsonEmoji.tones) {
        setTonePicker({ emoji: jsonEmoji, pageX, pageY });
      }
    },
    []
  );

  const handleToneSelect = useCallback(
    (toneKey: string) => {
      if (!tonePicker) return;
      setGlobalTone(toneKey);
      globalToneRef.current = toneKey;
      AsyncStorage.setItem(TONE_KEY, toneKey).catch(() => {});
      const tonedStr = getToned(tonePicker.emoji, toneKey);
      const toned: JsonEmoji = {
        ...tonePicker.emoji,
        emoji: tonedStr,
        toneEnabled: false,
      };
      setTonePicker(null);
      dispatchEmoji(toned);
    },
    [tonePicker, dispatchEmoji]
  );

  const handleTabPress = useCallback(
    (key: CategoryKey) => {
      const sectionIndex = sections.findIndex(s => s.key === key);
      if (sectionIndex < 0) return;
      activeCategoryRef.current = key;
      setActiveCategory(key);
      sectionListRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: SECTION_HEADER_HEIGHT,
      });
    },
    [sections]
  );

  // Stable callback — reads active state via ref to avoid recreating
  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: { isViewable: boolean; section?: Section }[];
    }) => {
      const first = viewableItems.find(v => v.isViewable && v.section);
      if (!first?.section) return;
      const key = first.section.key;
      if (key !== activeCategoryRef.current) {
        activeCategoryRef.current = key;
        setActiveCategory(key);
      }
    }
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 20 });

  // getItemLayout: flat index = 1 header + N rows per section
  // header height: SECTION_HEADER_HEIGHT; row height: cellSize
  const getItemLayout = useCallback(
    (_: any, index: number) => {
      let offset = 0;
      let flatIndex = 0;

      for (const section of sections) {
        // section header
        if (flatIndex === index)
          return { length: SECTION_HEADER_HEIGHT, offset, index };
        offset += SECTION_HEADER_HEIGHT;
        flatIndex++;

        // rows inside this section
        for (let r = 0; r < section.data.length; r++) {
          if (flatIndex === index) return { length: cellSize, offset, index };
          offset += cellSize;
          flatIndex++;
        }
      }

      return { length: cellSize, offset, index };
    },
    [sections, cellSize]
  );

  const onScrollToIndexFailed = useCallback(
    ({
      averageItemLength,
      index,
    }: {
      averageItemLength: number;
      index: number;
    }) => {
      // fallback: rara com getItemLayout presente; usa cast para o ScrollView interno
      (sectionListRef.current as any)?.scrollToOffset?.({
        offset: averageItemLength * index,
        animated: true,
      });
    },
    []
  );

  const renderRow = useCallback(
    ({ item: row, section }: { item: EmojiRow; section: Section }) => (
      <View style={[styles.row, { height: cellSize }]}>
        {row.map((emoji, idx) => (
          <Pressable
            key={`${section.key}-${emoji.emoji}-${idx}`}
            onPress={() => handleEmojiPress(emoji)}
            onLongPress={e =>
              handleEmojiLongPress(
                emoji,
                e.nativeEvent.pageX,
                e.nativeEvent.pageY
              )
            }
            delayLongPress={350}
            style={[styles.cell, { width: cellSize, height: cellSize }]}
            android_ripple={{ color: '#0001', radius: cellSize / 2 }}
          >
            <Text style={[styles.emojiText, { fontSize: emojiSize }]}>
              {emoji.emoji}
            </Text>
          </Pressable>
        ))}
      </View>
    ),
    [
      cellSize,
      emojiSize,
      handleEmojiPress,
      handleEmojiLongPress,
      globalTone,
      styles,
    ]
  );

  const renderSearchItem = useCallback(
    ({ item }: { item: JsonEmoji }) => (
      <Pressable
        onPress={() => handleEmojiPress(item)}
        onLongPress={e =>
          handleEmojiLongPress(item, e.nativeEvent.pageX, e.nativeEvent.pageY)
        }
        delayLongPress={350}
        style={[styles.cell, { width: cellSize, height: cellSize }]}
        android_ripple={{ color: '#0001', radius: cellSize / 2 }}
      >
        <Text style={[styles.emojiText, { fontSize: emojiSize }]}>
          {item.emoji}
        </Text>
      </Pressable>
    ),
    [cellSize, emojiSize, handleEmojiPress, handleEmojiLongPress, styles]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>
          {i18n.t(`emoji.categories.${section.key}`)}
        </Text>
      </View>
    ),
    [styles]
  );

  const keyExtractor = useCallback(
    (row: EmojiRow, index: number) => `row-${index}-${row[0]?.emoji ?? index}`,
    []
  );

  const searchKeyExtractor = useCallback(
    (item: JsonEmoji) => `search-${item.emoji}`,
    []
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={i18n.t('emoji.search')}
            placeholderTextColor={colors.textSecondary}
            returnKeyType='search'
            autoCorrect={false}
            autoCapitalize='none'
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.clearBtn}
              hitSlop={8}
            >
              <Text style={styles.clearBtnText}>✕</Text>
            </Pressable>
          )}
        </View>
        {searchFocused && (
          <Pressable
            onPress={() => {
              setSearchQuery('');
              searchInputRef.current?.blur();
            }}
            style={styles.cancelBtn}
            hitSlop={8}
          >
            <Text style={styles.cancelBtnText}>{i18n.t('common.cancel')}</Text>
          </Pressable>
        )}
      </View>

      {isSearching ? (
        searchResults.length === 0 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsEmoji}>🤷</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={searchKeyExtractor}
            renderItem={renderSearchItem}
            numColumns={NUM_COLS}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps='handled'
            onScrollBeginDrag={() => setTonePicker(null)}
          />
        )
      ) : (
        <SectionList<EmojiRow, Section>
          ref={sectionListRef}
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          renderSectionHeader={renderSectionHeader}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          initialNumToRender={24}
          maxToRenderPerBatch={16}
          windowSize={7}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={onScrollToIndexFailed}
          onScrollBeginDrag={() => setTonePicker(null)}
          keyboardShouldPersistTaps='handled'
        />
      )}

      {/* Skin tone picker modal — positioned near the long-pressed emoji */}
      {tonePicker &&
        (() => {
          const pickerWidth = TONE_KEYS.length * TONE_ITEM_SIZE + 16;
          const left = Math.max(
            8,
            Math.min(
              width - pickerWidth - 8,
              tonePicker.pageX - pickerWidth / 2
            )
          );
          const top = tonePicker.pageY - TONE_PICKER_HEIGHT - 12;
          return (
            <Modal
              transparent
              animationType='none'
              onRequestClose={() => setTonePicker(null)}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setTonePicker(null)}
              >
                <View
                  style={[
                    styles.tonePicker,
                    { position: 'absolute', left, top },
                  ]}
                >
                  {TONE_KEYS.map((key, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.toneOption,
                        globalTone === key && styles.toneOptionSelected,
                      ]}
                      onPress={() => handleToneSelect(key)}
                    >
                      <Text
                        style={[styles.emojiText, { fontSize: emojiSize - 2 }]}
                      >
                        {getToned(tonePicker.emoji, key)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Pressable>
            </Modal>
          );
        })()}

      {/* Category tab bar — hidden while searching */}
      {!isSearching && (
        <View style={styles.tabBar}>
          <ScrollView
            ref={tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.tabBarContent,
              { minWidth: presentCategories.length * TAB_ITEM_WIDTH },
            ]}
          >
            {presentCategories.map(key => (
              <TouchableOpacity
                key={key}
                onPress={() => handleTabPress(key)}
                style={[styles.tab, activeCategory === key && styles.tabActive]}
                activeOpacity={0.7}
              >
                <Text style={styles.tabIcon}>{CATEGORY_ICONS[key]}</Text>
                {activeCategory === key && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.cardBackground,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 8,
      marginTop: 8,
      marginBottom: 4,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.pageBackground,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 36,
    },
    searchIcon: {
      fontSize: 14,
      marginRight: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
      padding: 0,
    },
    clearBtn: {
      paddingHorizontal: 4,
    },
    clearBtnText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    cancelBtn: {
      paddingLeft: 8,
      paddingVertical: 4,
    },
    cancelBtnText: {
      fontSize: 15,
      color: colors.primary700,
    },
    noResults: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noResultsEmoji: {
      fontSize: 48,
      opacity: 0.4,
    },
    listContent: {
      paddingHorizontal: 8,
      paddingBottom: 4,
    },
    sectionHeader: {
      height: SECTION_HEADER_HEIGHT,
      justifyContent: 'flex-end',
      paddingHorizontal: 4,
      paddingBottom: 4,
    },
    sectionHeaderText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    row: {
      flexDirection: 'row',
    },
    cell: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    emojiText: {
      textAlign: 'center',
    },
    tabBar: {
      height: TAB_HEIGHT,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
      backgroundColor: colors.pageBackground,
    },
    tabBarContent: {
      alignItems: 'center',
      paddingHorizontal: 4,
      flexGrow: 1,
      justifyContent: 'space-around',
    },
    tab: {
      width: TAB_ITEM_WIDTH,
      height: TAB_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabActive: {
      // indicator handles the visual feedback
    },
    tabIcon: {
      fontSize: 22,
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 4,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary700,
    },
    tonePicker: {
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      paddingHorizontal: 6,
      paddingVertical: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      gap: 4,
    },
    toneOption: {
      width: 40,
      height: 40,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toneOptionSelected: {
      // Estado selecionado — não é papel de fundo de página/card nem borda,
      // fica com o valor fixo de propósito (ambíguo, ver relatório).
      backgroundColor: colors.neutral300,
    },
  });
