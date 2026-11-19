import React from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';

interface CardShadow {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

/**
 * View fino pros 4 tipos de "card" que existem hoje (Game, GameRanking,
 * DeviceContacts, QRShareModal, StatusStrip) — cada um com seu próprio
 * raio/sombra/fundo. Não tenta unificar visualmente nada; `backgroundColor`
 * aceita {ios, android} pra reproduzir por prop uma diferença que já
 * existe hoje entre as duas plataformas em algum caso (ex: DeviceContacts).
 */
export interface CardProps {
  backgroundColor?: string | { ios?: string; android?: string };
  borderRadius?: number;
  padding?: number;
  borderWidth?: number;
  borderColor?: string;
  shadow?: CardShadow | 'none';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

function resolveBackgroundColor(
  backgroundColor: CardProps['backgroundColor']
): string | undefined {
  if (typeof backgroundColor === 'string' || backgroundColor === undefined) {
    return backgroundColor;
  }
  return Platform.OS === 'ios' ? backgroundColor.ios : backgroundColor.android;
}

export function Card({
  backgroundColor,
  borderRadius,
  padding,
  borderWidth,
  borderColor,
  shadow,
  style,
  children,
}: CardProps) {
  const shadowStyle = shadow && shadow !== 'none' ? shadow : null;

  return (
    <View
      style={[
        {
          backgroundColor: resolveBackgroundColor(backgroundColor),
          borderRadius,
          padding,
          borderWidth,
          borderColor,
        },
        shadowStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}
