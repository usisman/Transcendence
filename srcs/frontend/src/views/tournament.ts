import { loadSession } from '../utils/storage';

type TournamentDTO = {
  id: number;
  name: string;
  ownerId: number | null;
  ownerNickname: string | null;
  status: 'pending' | 'active';
  maxPlayers: number;
  currentPlayers: number;
  createdAt: string;
  startedAt?: string;
  bracket?: {
    rounds: Array<{
      matches: Array<{
        match: number;
        playerA: { alias: string; isAi: boolean };
        playerB: { alias: string; isAi: boolean };
      }>;
    }>;
  } | null;
};

const powerOfTwoOptions = [2, 4, 8, 16, 32];

const renderBracket = (tournament: TournamentDTO) => {
  if (!tournament.bracket || tournament.bracket.rounds.length === 0) {
    return '<p>Bracket oluşturulduğunda burada görünecek.</p>';
  }
  const [firstRound] = tournament.bracket.rounds;
  return `
    <div class="bracket">
      ${firstRound.matches
        .map(
          (match) => `
          <div class="bracket__match">
            <p>Match #${match.match}</p>
            <div>
              <span>${match.playerA.alias}</span>
              <span>vs</span>
              <span>${match.playerB.alias}</span>
            </div>
          </div>
        `
        )
        .join('')}
    </div>
  `;
};

export const renderTournamentView = (container: HTMLElement) => {
  const session = loadSession();
  if (!session) {
    location.hash = '/auth';
    return;
  }

  const root = document.createElement('main');
  root.className = 'app tournament';
  root.innerHTML = `
    <header class="tournament__header">
      <div>
        <h1>Turnuvalar</h1>
        <p>Yeni turnuva oluştur veya mevcut turnuvalara katıl.</p>
      </div>
    </header>
    <section class="tournament__tabs">
      <button class="tab-button is-active" data-tab="create">Turnuva Oluştur</button>
      <button class="tab-button" data-tab="list">Aktif Turnuvalar</button>
    </section>
    <section class="tournament__content" data-tab-panel="create">
      <form class="tournament__form" data-form="create">
        <label>
          <span>Turnuva adı</span>
          <input type="text" name="name" placeholder="Örn. Akşam Ligi" required minlength="3" maxlength="64"/>
        </label>
        <label>
          <span>Maksimum oyuncu (2^x)</span>
          <select name="maxPlayers">
            ${powerOfTwoOptions
              .map((size) => `<option value="${size}">${size} oyuncu</option>`)
              .join('')}
          </select>
        </label>
        <button class="button" type="submit">Turnuvayı Oluştur</button>
        <p class="status" data-status="create"></p>
      </form>
    </section>
    <section class="tournament__content is-hidden" data-tab-panel="list">
      <div data-list></div>
      <p class="status" data-status="list"></p>
    </section>
  `;

  container.appendChild(root);

  const switchTab = (target: 'create' | 'list') => {
    root
      .querySelectorAll<HTMLButtonElement>('.tab-button')
      .forEach((button) => button.classList.toggle('is-active', button.dataset.tab === target));
    root
      .querySelectorAll<HTMLElement>('[data-tab-panel]')
      .forEach((panel) => panel.classList.toggle('is-hidden', panel.dataset.tabPanel !== target));
  };

  root.querySelectorAll<HTMLButtonElement>('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab === 'list' ? 'list' : 'create');
      if (button.dataset.tab === 'list') {
        void fetchTournaments();
      }
    });
  });

  const createStatus = root.querySelector<HTMLElement>('[data-status="create"]');
  const listStatus = root.querySelector<HTMLElement>('[data-status="list"]');
  const listContainer = root.querySelector<HTMLElement>('[data-list]');

  const fetchTournaments = async () => {
    listStatus!.textContent = 'Turnuvalar yükleniyor...';
    try {
      const response = await fetch('/api/tournaments', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 401) {
          location.hash = '/auth';
        }
        listStatus!.textContent = 'Turnuvalar alınamadı.';
        return;
      }
      const tournaments = (await response.json()) as TournamentDTO[];
      listStatus!.textContent = '';
      if (!tournaments.length) {
        listContainer!.innerHTML = '<p>Aktif turnuva yok.</p>';
        return;
      }
      listContainer!.innerHTML = tournaments
        .map(
          (tournament) => `
            <article class="tournament-card ${tournament.status === 'active' ? 'is-active' : ''}">
              <header>
                <div>
                  <p class="tournament-card__status">${tournament.status === 'active' ? 'Başladı' : 'Beklemede'}</p>
                  <h3>${tournament.name}</h3>
                  <p class="tournament-card__meta">Sahip: ${
                    tournament.ownerNickname ?? 'Bilinmiyor'
                  }</p>
                </div>
                <div class="tournament-card__badge">${tournament.currentPlayers}/${tournament.maxPlayers}</div>
              </header>
              <div class="tournament-card__body">
                ${
                  tournament.status === 'pending'
                    ? `
                      <form data-join="${tournament.id}" class="tournament-card__join">
                        <button class="button" type="submit">Takma adım ile katıl</button>
                      </form>
                      ${
                        tournament.ownerId === session.id
                          ? `<button class="button button--secondary" data-action="start" data-id="${tournament.id}">Turnuvayı Başlat</button>`
                          : ''
                      }
                    `
                    : renderBracket(tournament)
                }
              </div>
            </article>
          `
        )
        .join('');

      listContainer!.querySelectorAll<HTMLFormElement>('[data-join]').forEach((form) => {
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const id = Number(form.dataset.join);
          void joinTournament(id);
        });
      });

      listContainer!.querySelectorAll<HTMLButtonElement>('[data-action="start"]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = Number(button.dataset.id);
          void startTournament(id);
        });
      });
    } catch (error) {
      console.warn('Turnuvalar alınamadı:', error);
      listStatus!.textContent = 'Turnuvalar alınamadı.';
    }
  };

  const joinTournament = async (id: number) => {
    listStatus!.textContent = 'Katılım gönderiliyor...';
    try {
      const response = await fetch(`/api/tournaments/${id}/join`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        listStatus!.textContent = payload?.message ?? 'Katılım başarısız oldu.';
        return;
      }
      listStatus!.textContent = 'Turnuvaya katıldın!';
      await fetchTournaments();
    } catch (error) {
      console.warn('Katılım hatası:', error);
      listStatus!.textContent = 'Katılım sırasında hata oluştu.';
    }
  };

  const startTournament = async (id: number) => {
    listStatus!.textContent = 'Turnuva başlatılıyor...';
    try {
      const response = await fetch(`/api/tournaments/${id}/start`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        listStatus!.textContent = payload?.message ?? 'Turnuva başlatılamadı.';
        return;
      }
      listStatus!.textContent = 'Turnuva başlatıldı!';
      await fetchTournaments();
    } catch (error) {
      console.warn('Başlatma hatası:', error);
      listStatus!.textContent = 'Turnuva başlatılırken hata oluştu.';
    }
  };

  const createForm = root.querySelector<HTMLFormElement>('[data-form="create"]');
  createForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!createForm.checkValidity()) {
      createForm.reportValidity();
      return;
    }
    createStatus!.textContent = 'Turnuva oluşturuluyor...';
    const formData = new FormData(createForm);
    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.get('name'),
          maxPlayers: Number(formData.get('maxPlayers'))
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        createStatus!.textContent = payload?.message ?? 'Turnuva oluşturulamadı.';
        return;
      }
      createStatus!.textContent = 'Turnuva oluşturuldu!';
      createForm.reset();
      switchTab('list');
      await fetchTournaments();
    } catch (error) {
      console.warn('Turnuva oluşturma hatası:', error);
      createStatus!.textContent = 'Turnuva oluşturulamadı.';
    }
  });

  // Varsayılan olarak liste sekmesini yükle.
  void fetchTournaments();
};
