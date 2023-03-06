const loadRelaysBackupHistory = (RootElementID:string) => {
  (document.getElementById(RootElementID) as HTMLDivElement)
    .innerHTML = `<div class="relaysbackuphistory">
    <h3>Relays</h3>
    <p>TODO</p>
  </div>`;
};

const LoadRelaysPage = () => {
  const o:HTMLElement = document.getElementById('PM-container') as HTMLElement;
  o.innerHTML = `
    <div id="relayspage" class="container">
      <div id="relaysbackuphistory"></div>
    <div>
  `;
  loadRelaysBackupHistory('relaysbackuphistory');
};

export default LoadRelaysPage;
