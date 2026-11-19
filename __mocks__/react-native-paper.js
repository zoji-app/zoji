const React = require('react');

// Mock dos componentes do React Native Paper
const mockComponent = name => {
  return function MockComponent(props) {
    return React.createElement(name, props, props.children);
  };
};

module.exports = {
  TextInput: mockComponent('TextInput'),
  Button: mockComponent('Button'),
  Text: mockComponent('Text'),
  IconButton: mockComponent('IconButton'),
  ActivityIndicator: mockComponent('ActivityIndicator'),
  Menu: mockComponent('Menu'),
  Divider: mockComponent('Divider'),
  List: {
    Item: mockComponent('ListItem'),
    Icon: mockComponent('ListIcon'),
    Section: mockComponent('ListSection'),
  },
  Avatar: {
    Icon: mockComponent('AvatarIcon'),
    Text: mockComponent('AvatarText'),
    Image: mockComponent('AvatarImage'),
  },
  Card: {
    Title: mockComponent('CardTitle'),
    Content: mockComponent('CardContent'),
    Actions: mockComponent('CardActions'),
    Cover: mockComponent('CardCover'),
  },
  Checkbox: mockComponent('Checkbox'),
  Dialog: {
    Title: mockComponent('DialogTitle'),
    Content: mockComponent('DialogContent'),
    Actions: mockComponent('DialogActions'),
    Icon: mockComponent('DialogIcon'),
  },
  Drawer: {
    Item: mockComponent('DrawerItem'),
    Section: mockComponent('DrawerSection'),
  },
  FAB: mockComponent('FAB'),
  Paragraph: mockComponent('Paragraph'),
  Portal: mockComponent('Portal'),
  ProgressBar: mockComponent('ProgressBar'),
  RadioButton: {
    Group: mockComponent('RadioButtonGroup'),
    Item: mockComponent('RadioButtonItem'),
  },
  Searchbar: mockComponent('Searchbar'),
  Snackbar: mockComponent('Snackbar'),
  Surface: mockComponent('Surface'),
  Switch: mockComponent('Switch'),
  TouchableRipple: mockComponent('TouchableRipple'),
  useTheme: jest.fn(() => ({
    colors: {
      primary: '#6200ee',
      accent: '#03dac4',
      background: '#f6f6f6',
      surface: 'white',
      error: '#B00020',
      text: 'black',
      onSurface: '#000000',
      disabled: 'rgba(0, 0, 0, 0.26)',
      placeholder: 'rgba(0, 0, 0, 0.54)',
      backdrop: 'rgba(0, 0, 0, 0.5)',
      notification: '#f50057',
    },
    fonts: {
      regular: {
        fontFamily: 'sans-serif',
        fontWeight: 'normal',
      },
      medium: {
        fontFamily: 'sans-serif-medium',
        fontWeight: 'normal',
      },
      light: {
        fontFamily: 'sans-serif-light',
        fontWeight: 'normal',
      },
      thin: {
        fontFamily: 'sans-serif-thin',
        fontWeight: 'normal',
      },
    },
    animation: {
      scale: 1,
    },
    roundness: 4,
  })),
};
