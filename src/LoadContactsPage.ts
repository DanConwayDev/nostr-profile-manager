import { fetchCachedProfileEventHistory } from './fetchEvents';
import { generateHistoryTable } from './LoadHistory';

const loadContactsBackupHistory = (RootElementID:string) => {
  (document.getElementById(RootElementID) as HTMLDivElement)
    .innerHTML = `<div class="contactsbackuphistory">
    <h3>Contacts Backup History</h3>
    ${generateHistoryTable(fetchCachedProfileEventHistory(3))}
  </div>`;
};

const LoadContactsPage = () => {
  const o:HTMLElement = document.getElementById('PM-container') as HTMLElement;
  o.innerHTML = `
    <div id="contactspage" class="container">
      <div id="contactsbackuphistory"></div>
    <div>
  `;
  loadContactsBackupHistory('contactsbackuphistory');
};

export default LoadContactsPage;
