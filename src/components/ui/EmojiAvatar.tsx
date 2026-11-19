import React from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';

/**
 * O padrão real hoje é emoji renderizado num fontSize por tela, às vezes
 * dentro de uma caixa de centralização (Friends), às vezes só o texto
 * cru (DeviceContacts, AddContact, ProfileSetup) — nunca um círculo
 * colorido de verdade. `containerSize` é opcional por isso.
 */
export interface EmojiAvatarProps {
  emoji: string;
  containerSize?: number;
  fontSize: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function EmojiAvatar({
  emoji,
  containerSize,
  fontSize,
  style,
  textStyle,
}: EmojiAvatarProps) {
  const text = <Text style={[{ fontSize }, textStyle]}>{emoji}</Text>;

  if (containerSize === undefined) {
    return text;
  }

  return (
    <View
      style={[
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {text}
    </View>
  );
}
