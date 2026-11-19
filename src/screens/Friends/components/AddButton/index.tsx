import React, { useCallback } from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../../../theme/colors';
import { i18n } from '../../../../i18n';
import { styles } from './styles';

interface AddButtonProps {
  navigation: any;
}

const AddButton: React.FC<AddButtonProps> = ({ navigation }) => {
  const handlePress = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    navigation.navigate('AddContact');
  }, [navigation]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.button}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={i18n.t('friends.addContact')}
      accessibilityRole='button'
    >
      <Ionicons name='person-add-outline' size={24} color={colors.primary700} />
    </TouchableOpacity>
  );
};

export default AddButton;
