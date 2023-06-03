import { localStorageClear } from './LocalStorage';

const Logout = () => {
  localStorageClear();
  window.location.href = '/';
};

export default Logout;
