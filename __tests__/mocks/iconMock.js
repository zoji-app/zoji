// Este mock simula a biblioteca @expo/vector-icons para evitar erros nos testes
const IconMock = name => `Icon:${name}`;

const IconComponentMock = props => {
  return {
    type: 'Icon',
    props,
  };
};

// Um objeto com todas as bibliotecas de ícones comum usadas no Expo
const IconLibraries = [
  'AntDesign',
  'Entypo',
  'EvilIcons',
  'Feather',
  'FontAwesome',
  'FontAwesome5',
  'Fontisto',
  'Foundation',
  'Ionicons',
  'MaterialIcons',
  'MaterialCommunityIcons',
  'Octicons',
  'SimpleLineIcons',
  'Zocial',
];

// Criar e exportar cada biblioteca como uma função que retorna um mock de ícone
const iconExports = IconLibraries.reduce((acc, library) => {
  acc[library] = IconComponentMock;
  return acc;
}, {});

// Funções auxiliares
iconExports.createIconSet = () => IconComponentMock;
iconExports.createIconSetFromFontello = () => IconComponentMock;
iconExports.createIconSetFromIcoMoon = () => IconComponentMock;

module.exports = iconExports;
