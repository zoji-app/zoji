import React, { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { i18n } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';
import { getStyles } from './styles';

export const Loading: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size='large' color={colors.primary700} />
      <Text style={styles.loadingText}>{i18n.t('common.loading')}</Text>
    </View>
  );
};
