const React = require('react');

module.exports = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    toggleKeyboard: jest.fn(),
  }));

  if (props.onEmojiSelected) {
    setTimeout(() => {
      props.onEmojiSelected({
        emoji: '😊',
        name: 'smiling_face',
        slug: 'smiling_face',
        unicode_version: '6.0',
      });
    }, 0);
  }

  return React.createElement('View', { testID: 'emoji-keyboard' });
});
