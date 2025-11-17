import { clearSession, loadSession, persistSession } from '../utils/storage';
import { escapeHtml } from '../utils/sanitize';

type ProfilePayload = {
  id: number;
  email: string;
  nickname: string;
  provider: 'local' | 'google';
  createdAt: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export const renderDashboardView = (container: HTMLElement) => {
  let session = loadSession();
  if (!session) {
    location.hash = '/auth';
    return;
  }

  const root = document.createElement('main');
  root.className = 'app dashboard';
  root.innerHTML = `
    <header class="dashboard__header">
      <div>
        <p class="dashboard__eyebrow">Profil</p>
        <h1 data-profile-field="nickname">${escapeHtml(session.nickname)}</h1>
        <p class="dashboard__muted">
          <span data-profile-field="email">${escapeHtml(session.email)}</span> •
          <span data-profile-field="provider">${session.provider === 'google' ? 'Google' : 'Manuel'} giriş</span>
        </p>
      </div>
      <div class="dashboard__actions">
        <button class="button" type="button" data-action="play">Play Now</button>
        <button class="button button--secondary" type="button" data-action="tournaments">Turnuvalar</button>
        <button class="button button--secondary" type="button" data-action="logout">Çıkış</button>
      </div>
    </header>
    <section class="dashboard__card">
      <h2>Hesap Özeti</h2>
      <dl class="dashboard__list">
        <div>
          <dt>Kullanıcı ID</dt>
          <dd data-profile-field="id">#${session.id}</dd>
        </div>
        <div>
          <dt>Takma Ad</dt>
          <dd>
            <div class="dashboard__nickname">
              <span data-profile-field="nicknameInline">${escapeHtml(session.nickname)}</span>
              <button class="icon-button" type="button" data-action="edit-nickname" aria-label="Takma adı düzenle">
                ✏️
              </button>
            </div>
            <form class="dashboard__nickname-form is-hidden" data-nickname-form>
              <input type="text" name="nickname" data-nickname-input value="${escapeHtml(
                session.nickname
              )}" minlength="3" maxlength="48" required/>
              <div class="dashboard__nickname-actions">
                <button class="button button--small" type="submit">Kaydet</button>
                <button class="button button--secondary button--small" type="button" data-action="cancel-nickname">Vazgeç</button>
              </div>
              <p class="status" data-status="nickname"></p>
            </form>
          </dd>
        </div>
        <div>
          <dt>Giriş Provider</dt>
          <dd data-profile-field="providerLabel">${session.provider === 'google' ? 'Google OAuth' : 'Local (manuel)'}</dd>
        </div>
        <div>
          <dt>Katılım Tarihi</dt>
          <dd data-profile-field="createdAt">-</dd>
        </div>
      </dl>
    </section>
    <section class="dashboard__card dashboard__card--placeholder">
      <h2>Turnuva / Oyun Durumu</h2>
      <p>Turnuva sistemi bu alanda listelenecek. Şimdilik Play Now ile Pong’a geçebilirsin.</p>
    </section>
  `;

  container.appendChild(root);

  const applyProfile = (profile: ProfilePayload) => {
    session = { ...session, nickname: profile.nickname };
    persistSession(session);
    const setText = (selector: string, value: string) => {
      const node = root.querySelector<HTMLElement>(selector);
      if (node) node.textContent = value;
    };

    setText('[data-profile-field="nickname"]', profile.nickname);
    setText('[data-profile-field="email"]', profile.email);
    setText(
      '[data-profile-field="provider"]',
      profile.provider === 'google' ? 'Google giriş' : 'Manuel giriş'
    );
    setText('[data-profile-field="id"]', `#${profile.id}`);
    setText('[data-profile-field="nicknameInline"]', profile.nickname);
    setText(
      '[data-profile-field="providerLabel"]',
      profile.provider === 'google' ? 'Google OAuth' : 'Local (manuel)'
    );
    setText('[data-profile-field="createdAt"]', formatDate(profile.createdAt));
  };

  void fetch('/api/users/profile', { credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) {
          clearSession();
          location.hash = '/auth';
        }
        return;
      }
      const profile = (await response.json()) as ProfilePayload;
      applyProfile(profile);
    })
    .catch((error) => {
      console.warn('Profil bilgisi alınamadı:', error);
    });

  const playButton = root.querySelector<HTMLButtonElement>('[data-action="play"]');
  playButton?.addEventListener('click', () => {
    location.hash = '/game';
  });

  const tournamentsButton = root.querySelector<HTMLButtonElement>('[data-action="tournaments"]');
  tournamentsButton?.addEventListener('click', () => {
    location.hash = '/tournament';
  });

  const logoutButton = root.querySelector<HTMLButtonElement>('[data-action="logout"]');
  logoutButton?.addEventListener('click', async () => {
    const gotoAuth = () => {
      if (location.hash !== '#/auth') {
        location.replace(`${location.origin}/#/auth`);
      }
    };

    gotoAuth();
    try {
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.warn('Logout isteği başarısız oldu:', error);
    } finally {
      clearSession();
      gotoAuth();
    }
  });

  const nicknameForm = root.querySelector<HTMLFormElement>('[data-nickname-form]');
  const nicknameInput = root.querySelector<HTMLInputElement>('[data-nickname-input]');
  const nicknameStatus = root.querySelector<HTMLElement>('[data-status="nickname"]');
  const editNicknameButton = root.querySelector<HTMLButtonElement>('[data-action="edit-nickname"]');
  const cancelNicknameButton = root.querySelector<HTMLButtonElement>('[data-action="cancel-nickname"]');

  const setNicknameEditing = (isEditing: boolean) => {
    nicknameForm?.classList.toggle('is-hidden', !isEditing);
    editNicknameButton?.classList.toggle('is-hidden', isEditing);
    if (isEditing) {
      nicknameInput?.focus();
      nicknameInput?.select();
    } else if (nicknameStatus) {
      nicknameStatus.textContent = '';
    }
  };

  editNicknameButton?.addEventListener('click', () => {
    if (nicknameInput) {
      nicknameInput.value = session.nickname;
    }
    setNicknameEditing(true);
  });

  cancelNicknameButton?.addEventListener('click', () => {
    setNicknameEditing(false);
  });

  nicknameForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!nicknameInput) return;
    const nextNickname = nicknameInput.value.trim();
    if (nextNickname.length < 3 || nextNickname.length > 48) {
      if (nicknameStatus) nicknameStatus.textContent = 'Takma ad 3-48 karakter arası olmalı.';
      return;
    }

    nicknameStatus!.textContent = 'Kaydediliyor...';
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nickname: nextNickname })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        nicknameStatus!.textContent = payload?.message ?? 'Güncelleme başarısız oldu.';
        return;
      }

      const profile = (await response.json()) as ProfilePayload;
      applyProfile(profile);
      nicknameStatus!.textContent = 'Güncellendi.';
      setNicknameEditing(false);
    } catch (error) {
      console.warn('Takma ad güncellenemedi:', error);
      nicknameStatus!.textContent = 'Beklenmeyen bir hata oluştu.';
    }
  });
};
