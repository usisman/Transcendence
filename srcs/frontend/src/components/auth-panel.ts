import { createStyles } from '../utils/styles';
import { createSessionBanner } from './session-banner';
import { clearSession, loadSession, persistSession, type StoredUser } from '../utils/storage';

// Her form için endpoint, payload hazırlama ve başarı mesajını tarif eden yapı.
type SubmitConfig = {
  formId: string;
  endpoint: string;
  buildPayload: (formData: FormData) => Record<string, unknown>;
  successMessage: (data: Record<string, unknown>) => string;
  onSuccess?: (data: Record<string, unknown>) => void;
};

// Form alanlarını şablon halinde üretmek için metadata.
type FormMetadata = {
  formId: string;
  title: string;
  buttonLabel: string;
  renderFields: () => string;
};

const getString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value : '';

// Ortak input markup'ını constraint'leriyle birlikte üretir.
const inputTemplate = (
  label: string,
  name: string,
  type: string,
  placeholder: string,
  options?: { minlength?: number; maxlength?: number }
) => {
  const constraints = [
    options?.minlength ? `minlength="${options.minlength}"` : '',
    options?.maxlength ? `maxlength="${options.maxlength}"` : ''
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <label class="form__field">
      <span>${label}</span>
      <input type="${type}" name="${name}" required ${constraints} placeholder="${placeholder}"/>
      <small data-feedback-for="${name}" class="form__feedback"></small>
    </label>
  `;
};

const formMetadata: FormMetadata[] = [
  {
    formId: 'manual-register-form',
    title: 'Manuel Kayıt',
    buttonLabel: 'Kaydı Gönder',
    renderFields: () => `
      ${inputTemplate('E-posta', 'email', 'email', 'ornek@mail.com')}
      ${inputTemplate('Kullanıcı adı', 'nickname', 'text', 'nickname', { minlength: 3, maxlength: 48 })}
      ${inputTemplate('Şifre', 'password', 'password', 'En az 8 karakter', { minlength: 8 })}
    `
  },
  {
    formId: 'manual-login-form',
    title: 'Manuel Giriş',
    buttonLabel: 'Giriş Yap',
    renderFields: () => `
      ${inputTemplate('E-posta', 'email', 'email', 'ornek@mail.com')}
      ${inputTemplate('Şifre', 'password', 'password', 'Şifren')}
    `
  }
];

// API yanıtından tip güvenli StoredUser nesnesi çıkartır.
const createUserFromPayload = (data: Record<string, unknown>): StoredUser | null => {
  const id = Number(data.id);
  const email = data.email;
  const nickname = data.nickname;
  const provider = data.provider;

  if (
    Number.isNaN(id) ||
    typeof email !== 'string' ||
    typeof nickname !== 'string' ||
    (provider !== 'local' && provider !== 'google')
  ) {
    return null;
  }

  return { id, email, nickname, provider };
};

const getSubmitConfigs = (onSessionChange: () => void): SubmitConfig[] => [
  {
    formId: 'manual-register-form',
    endpoint: '/api/users/register',
    buildPayload: (formData) => ({
      email: getString(formData.get('email')),
      nickname: getString(formData.get('nickname')),
      password: getString(formData.get('password'))
    }),
    successMessage: (data) =>
      `Kayıt tamamlandı: ${(data.nickname as string) ?? 'kullanıcı'} (id: ${data.id}).`
  },
  {
    formId: 'manual-login-form',
    endpoint: '/api/users/login',
    buildPayload: (formData) => ({
      email: getString(formData.get('email')),
      password: getString(formData.get('password'))
    }),
    successMessage: () => 'Giriş başarılı. Oturum cookie üzerinde saklandı.',
    onSuccess: (data) => {
      const user = createUserFromPayload(data);
      if (user) {
        persistSession(user);
        onSessionChange();
      }
    }
  },
  // Google kayıt/giriş test formları kaldırıldı; gerçek OAuth akışı artık aşağıdaki karttan başlatılıyor.
];

const updateStatus = (
  container: HTMLElement,
  formId: string,
  type: 'loading' | 'success' | 'error',
  message = ''
) => {
  const status = container.querySelector<HTMLDivElement>(`.status[data-status-for="${formId}"]`);
  if (!status) return;

  status.classList.remove('status--success', 'status--error');

  if (type === 'loading') {
    status.textContent = 'İstek gönderiliyor...';
    return;
  }

  status.textContent = message;

  if (type === 'success') status.classList.add('status--success');
  if (type === 'error') status.classList.add('status--error');
};

// Access token süresi dolmuşsa refresh endpoint'i çağırarak oturumu yeniler.
const attemptRefresh = async () => {
  try {
    const response = await fetch('/api/users/refresh', {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      return false;
    }

    const refreshed = (await response.json()) as StoredUser;
    persistSession(refreshed);
    return true;
  } catch (error) {
    console.warn('Oturum yenilemesi sırasında hata oluştu:', error);
    return false;
  }
};

// Sayfa açıldığında cookie'lerdeki oturumu backend ile doğrular.
const syncSessionWithServer = async (onSessionChange: () => void) => {
  try {
    const response = await fetch('/api/users/me', { credentials: 'include' });
    if (response.ok) {
      const payload = (await response.json()) as StoredUser;
      persistSession(payload);
    } else if (response.status === 401) {
      const refreshed = await attemptRefresh();
      if (!refreshed) {
        clearSession();
      }
    } else {
      clearSession();
    }
  } catch (error) {
    console.warn('Oturum doğrulaması sırasında hata oluştu:', error);
  } finally {
    onSessionChange();
  }
};

const consumeOauthStatusFromHash = () => {
  const hash = window.location.hash;
  if (!hash.includes('?')) {
    return null;
  }

  const [pathPart, queryPart] = hash.split('?');
  const params = new URLSearchParams(queryPart);
  const status = params.get('oauth');

  if (!status) {
    return null;
  }

  params.delete('oauth');
  const remaining = params.toString();
  const nextHash = remaining ? `${pathPart}?${remaining}` : pathPart || '#/auth';
  history.replaceState(null, '', nextHash);

  return status;
};

const oauthStatusCopy: Record<string, { type: 'success' | 'error'; message: string }> = {
  success: {
    type: 'success',
    message: 'Google ile giriş tamamlandı.'
  },
  denied: {
    type: 'error',
    message: 'Google yetkilendirmesi iptal edildi.'
  },
  missing_params: {
    type: 'error',
    message: 'Google dönüşünde gerekli parametreler eksikti.'
  },
  state_mismatch: {
    type: 'error',
    message: 'Oturum doğrulaması zaman aşımına uğradı, lütfen tekrar deneyin.'
  },
  token_error: {
    type: 'error',
    message: 'Google token alınırken hata oluştu.'
  },
  profile_error: {
    type: 'error',
    message: 'Google profil bilgileri okunamadı.'
  },
  email_unverified: {
    type: 'error',
    message: 'Google hesabınız doğrulanmamış bir e-posta içeriyor.'
  },
  email_conflict: {
    type: 'error',
    message: 'Bu e-posta zaten manuel kayıtla kullanıldığı için Google ile bağlanamadı.'
  },
  internal_error: {
    type: 'error',
    message: 'Google OAuth akışında beklenmeyen bir hata oluştu.'
  }
};

export const createAuthPanel = () => {
  createStyles();
  const oauthStatus = consumeOauthStatusFromHash();

  const wrapper = document.createElement('main');
  wrapper.className = 'app';

  wrapper.innerHTML = `
    <header class="app__header">
      <div>
        <h1>Transcendence</h1>
      </div>
    </header>
  `;

  const actionsSection = document.createElement('section');
  actionsSection.className = 'auth-stack';

  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'auth-stack__buttons';

  const contentContainer = document.createElement('div');
  contentContainer.className = 'auth-stack__content';

  actionsSection.append(buttonsContainer, contentContainer);
  wrapper.appendChild(actionsSection);

  formMetadata.forEach((meta) => {
    const section = document.createElement('section');
    section.className = 'card form-section';
    section.dataset.section = meta.formId;
    section.innerHTML = `
      <h2>${meta.title}</h2>
      <form id="${meta.formId}" class="form">
        ${meta.renderFields()}
        <button type="submit" class="button">${meta.buttonLabel}</button>
      </form>
      <div class="status" data-status-for="${meta.formId}"></div>
    `;
    contentContainer.appendChild(section);
  });

  const header = wrapper.querySelector('.app__header');

  const oauthAlert = document.createElement('div');
  oauthAlert.className = 'alert is-hidden';
  header?.insertAdjacentElement('afterend', oauthAlert);

  const renderOauthAlert = (status: string | null) => {
    if (!status) {
      oauthAlert.classList.add('is-hidden');
      oauthAlert.textContent = '';
      oauthAlert.classList.remove('alert--success', 'alert--error');
      return;
    }

    const copy = oauthStatusCopy[status] ?? {
      type: 'error',
      message: 'Google OAuth akışı tamamlanamadı.'
    };

    oauthAlert.textContent = copy.message;
    oauthAlert.classList.toggle('alert--success', copy.type === 'success');
    oauthAlert.classList.toggle('alert--error', copy.type === 'error');
    oauthAlert.classList.remove('is-hidden');
  };

  renderOauthAlert(oauthStatus);

  const formSections = Array.from(
    contentContainer.querySelectorAll<HTMLElement>('.form-section')
  );

  const googleIcon = `
    <span class="tab-button__icon" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" role="img">
        <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-2 3l3.2 2.5c1.9-1.8 3-4.5 3-7.5 0-.7-.1-1.3-.2-1.9H12z"/>
        <path fill="#34A853" d="M5.3 14.3 4.4 15.7 1.4 17.8C3.4 21.2 7.4 24 12 24c3 0 5.5-1 7.3-2.7l-3.2-2.5c-.9.6-2 1-3.1 1-2.4 0-4.5-1.6-5.2-3.8z"/>
        <path fill="#4A90E2" d="M1.4 6.2C.5 7.9 0 9.9 0 12s.5 4.1 1.4 5.8l3.9-3c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2z"/>
        <path fill="#FBBC05" d="M12 4.8c1.6 0 3 .6 4 1.6l3-3C17.5 1.3 15 0 12 0 7.4 0 3.4 2.8 1.4 6.2l3.9 3.1c.7-2.2 2.8-3.8 5.2-3.8z"/>
      </svg>
    </span>
  `;

  const actionButtons: Array<{
    id: string;
    label: string;
    type: 'form' | 'google';
  }> = [
    { id: 'manual-register-form', label: 'Kayıt Ol', type: 'form' },
    { id: 'manual-login-form', label: 'Giriş Yap', type: 'form' },
    { id: 'google', label: 'Google ile Devam Et', type: 'google' }
  ];

  const setActiveSection = (targetId: string) => {
    formSections.forEach((section) => {
      const isActive = section.dataset.section === targetId;
      section.classList.toggle('is-active', isActive);
    });
  };

  const setActiveButton = (targetId: string) => {
    buttonsContainer
      .querySelectorAll<HTMLButtonElement>('.tab-button')
      .forEach((button) => {
        button.classList.toggle('is-active', button.dataset.target === targetId);
      });
  };

  actionButtons.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tab-button${action.type === 'google' ? ' tab-button--google' : ''}`;
    button.dataset.target = action.id;
    button.innerHTML =
      action.type === 'google'
        ? `${googleIcon}<span>${action.label}</span>`
        : `<span>${action.label}</span>`;

    button.addEventListener('click', () => {
      if (action.type === 'google') {
        window.location.href = '/api/users/oauth/google/start';
        return;
      }
      setActiveButton(action.id);
      setActiveSection(action.id);
    });

    buttonsContainer.appendChild(button);
  });

  setActiveButton('manual-register-form');
  setActiveSection('manual-register-form');

  // Oturum açıldıktan sonra formları gizleyip yerine tek bir CTA kartı gösterebilmek için hazırda tutuyoruz.
  const playSection = document.createElement('section');
  playSection.className = 'card card--cta is-hidden';
  playSection.innerHTML = `
    <h2>Giriş başarılı</h2>
    <p>Artık oyuna bağlanabilirsin. "Play Now" düğmesi seni doğrudan oyun ekranına götürür.</p>
    <button type="button" class="button">Play Now</button>
  `;
  wrapper.appendChild(playSection);

  const playNowButton = playSection.querySelector<HTMLButtonElement>('button');
  if (playNowButton) {
    playNowButton.addEventListener('click', () => {
      location.hash = '/game';
    });
  }

  const renderBanner = () => {
    if (!header) return;
    const banner = createSessionBanner(renderBanner);
    const existing = header.querySelector('.session-banner');
    if (existing) {
      existing.replaceWith(banner);
    } else {
      header.appendChild(banner);
    }
  };

  renderBanner();

  const toggleAuthLayout = () => {
    const hasSession = Boolean(loadSession());
    actionsSection.classList.toggle('is-hidden', hasSession);
    playSection.classList.toggle('is-hidden', !hasSession);
  };

  const ensureRouteMatchesSession = () => {
    const hasSession = Boolean(loadSession());
    const currentPath = location.hash.replace('#', '');
    if (hasSession && currentPath === '/auth') {
      location.hash = '/dashboard';
    } else if (!hasSession && currentPath !== '/auth') {
      location.hash = '/auth';
    }
  };

  toggleAuthLayout();
  ensureRouteMatchesSession();

  const handleSessionChange = () => {
    renderBanner();
    toggleAuthLayout();
    ensureRouteMatchesSession();
  };

  const submitConfigs = getSubmitConfigs(handleSessionChange);

  submitConfigs.forEach((config) => {
    const form = wrapper.querySelector<HTMLFormElement>(`#${config.formId}`);
    if (!form) return;

    attachLiveValidation(form);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      updateStatus(wrapper, config.formId, 'loading');

      try {
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(config.buildPayload(formData))
        });

        const payload = (await response
          .clone()
          .json()
          .catch(() => undefined)) as Record<string, unknown> | undefined;

        if (!response.ok) {
          const fallbackText = await response
            .clone()
            .text()
            .catch(() => 'İstek başarısız oldu.');
          const message =
            (payload?.message as string) ??
            (fallbackText.startsWith('<') ? 'İstek başarısız oldu.' : fallbackText);
          updateStatus(wrapper, config.formId, 'error', message);
          return;
        }

        if (payload) {
          config.onSuccess?.(payload);
          updateStatus(wrapper, config.formId, 'success', config.successMessage(payload));
        } else {
          config.onSuccess?.({});
          updateStatus(wrapper, config.formId, 'success', config.successMessage({}));
        }
        form.reset();
      } catch (error) {
        const fallback =
          error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
        updateStatus(wrapper, config.formId, 'error', fallback);
      }
    });
  });

  void syncSessionWithServer(handleSessionChange);

  return wrapper;
};

// HTML constraint API üzerinden canlı validasyon mesajlarını günceller.
const attachLiveValidation = (form: HTMLFormElement) => {
  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[name]'));

  inputs.forEach((input) => {
    const feedbackEl = form.querySelector<HTMLSpanElement>(`[data-feedback-for="${input.name}"]`);
    if (!feedbackEl) return;

    const validate = () => {
      if (input.validity.valid) {
        feedbackEl.textContent = '';
        feedbackEl.classList.remove('form__feedback--error');
        return;
      }

      let message = '';
      if (input.validity.valueMissing) {
        message = 'Bu alan zorunlu.';
      } else if (input.validity.typeMismatch && input.type === 'email') {
        message = 'Lütfen geçerli bir e-posta gir.';
      } else if (input.validity.tooShort) {
        message = `En az ${input.minLength} karakter olmalı.`;
      } else if (input.validity.tooLong) {
        message = `En fazla ${input.maxLength} karakter olabilir.`;
      } else if (input.validity.patternMismatch) {
        message = 'Girdi beklenen formata uymuyor.';
      }

      feedbackEl.textContent = message;
      feedbackEl.classList.toggle('form__feedback--error', Boolean(message));
    };

    input.addEventListener('input', validate);
    input.addEventListener('blur', validate);
  });
};
