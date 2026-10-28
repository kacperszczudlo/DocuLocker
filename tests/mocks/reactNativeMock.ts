export const View = 'View';
export const Text = 'Text';
export const Modal = 'Modal';
export const TouchableOpacity = 'TouchableOpacity';
export const StyleSheet = {
  create: (styles: any) => styles,
};
export const Platform = {
  OS: 'android',
  select: (obj: any) => obj.android || obj.default,
};
export const Alert = {
  alert: () => {},
};
export const Linking = {
  openURL: () => Promise.resolve(),
};
