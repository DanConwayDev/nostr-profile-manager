import { loadBackupHistory } from './LoadHistory';

const LoadContactsPage = () => {
  const o:HTMLElement = document.getElementById('PM-container') as HTMLElement;
  o.innerHTML = `
    <div id="contactspage" class="container">
      <div id="contactsbackuphistory"></div>
    <div>
  `;
  loadBackupHistory('contactsbackuphistory', 3);
};

export default LoadContactsPage;
