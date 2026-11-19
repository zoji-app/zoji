import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

/**
 * Mock do componente MessageItem
 */
export const MessageItemMock = ({ message, isCurrentUser }) => {
  const formattedTime = new Date(
    message.createdAt.seconds * 1000
  ).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      testID='message-item'
      style={{
        alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
        backgroundColor: isCurrentUser ? '#e3f2fd' : '#f5f5f5',
        padding: 10,
        borderRadius: 8,
        marginVertical: 5,
      }}
    >
      <Text testID='message-emoji' style={{ fontSize: 40 }}>
        {message.emoji}
      </Text>
      <Text testID='message-timestamp' style={{ fontSize: 12, color: '#777' }}>
        {formattedTime}
      </Text>
      {message.pending && <Text testID='pending-indicator'>✓</Text>}
    </View>
  );
};

/**
 * Mock do componente ChatHeader
 */
export const ChatHeaderMock = ({
  contact,
  onGoBack,
  onClearChat,
  onDeleteContact,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuPress = () => {
    setMenuVisible(!menuVisible);
  };

  const handleClearChat = () => {
    setMenuVisible(false);
    if (onClearChat) onClearChat();
  };

  const handleDeleteContact = () => {
    setMenuVisible(false);
    if (onDeleteContact) onDeleteContact();
  };

  const handleGoBack = () => {
    if (onGoBack) onGoBack();
  };

  return (
    <View
      testID='chat-header'
      style={{
        flexDirection: 'row',
        padding: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <TouchableOpacity testID='back-button' onPress={handleGoBack}>
        <Text>Voltar</Text>
      </TouchableOpacity>

      <View
        testID='contact-info'
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        <Text testID='contact-emoji' style={{ fontSize: 24, marginRight: 8 }}>
          {contact.profileEmoji}
        </Text>
        <Text testID='contact-name'>{contact.nickname}</Text>
      </View>

      <TouchableOpacity testID='menu-button' onPress={handleMenuPress}>
        <Text>Menu</Text>
      </TouchableOpacity>

      {menuVisible && (
        <View
          testID='menu-options'
          style={{
            position: 'absolute',
            top: 40,
            right: 10,
            backgroundColor: 'white',
            borderRadius: 4,
            padding: 10,
          }}
        >
          <TouchableOpacity
            testID='clear-chat-option'
            onPress={handleClearChat}
          >
            <Text>Limpar Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID='delete-contact-option'
            onPress={handleDeleteContact}
          >
            <Text>Excluir Contato</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/**
 * Mock do componente MessageInput
 */
export const MessageInputMock = ({ onSendEmoji }) => {
  const [selectedEmojis, setSelectedEmojis] = useState([]);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isEmojiPaletteVisible, setIsEmojiPaletteVisible] = useState(false);

  const handleSendEmoji = async () => {
    if (selectedEmojis.length === 0) return;

    for (const emoji of selectedEmojis) {
      await onSendEmoji(emoji);
    }

    setSelectedEmojis([]);
  };

  const handleAddEmoji = emoji => {
    setSelectedEmojis(prev => {
      if (prev.length >= 3) return prev;
      return [...prev, emoji];
    });
    setIsEmojiPaletteVisible(false);
  };

  return (
    <View testID='message-input-container'>
      {isEmojiPickerVisible ? (
        <View testID='emoji-input-container'>
          <View>
            {selectedEmojis.length > 0 ? (
              <View>
                {selectedEmojis.map((emoji, index) => (
                  <Text key={index} testID='selected-emoji'>
                    {emoji}
                  </Text>
                ))}
              </View>
            ) : (
              <Text>Selecione emojis</Text>
            )}
          </View>

          <View>
            <TouchableOpacity
              testID='show-palette-button'
              onPress={() => setIsEmojiPaletteVisible(!isEmojiPaletteVisible)}
            >
              <Text>😀</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID='backspace-button'
              onPress={() => {
                if (selectedEmojis.length > 0) {
                  setSelectedEmojis(prev => prev.slice(0, -1));
                }
              }}
            >
              <Text>⌫</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID='clear-button'
              onPress={() => setSelectedEmojis([])}
            >
              <Text>✕</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID='send-button'
              onPress={handleSendEmoji}
              disabled={selectedEmojis.length === 0}
            >
              <Text>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          testID='add-emoji-button'
          onPress={() => setIsEmojiPickerVisible(true)}
        >
          <Text>+</Text>
        </TouchableOpacity>
      )}

      {isEmojiPaletteVisible && (
        <View testID='emoji-palette'>
          <ScrollView>
            <View>
              {['😀', '😂', '😍', '🤩', '😎'].map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  testID={`emoji-palette-item-${index}`}
                  onPress={() => handleAddEmoji(emoji)}
                >
                  <Text>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};
