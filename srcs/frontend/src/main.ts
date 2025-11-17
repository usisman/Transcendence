import { Router } from './router';
import { renderAuthView } from './views/auth';
import { renderDashboardView } from './views/dashboard';
import { renderGameView } from './views/game';
import { renderTournamentView } from './views/tournament';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Uygulama için kök element bulunamadı.');
}

const router = new Router(root);
router.register({ path: '/auth', render: renderAuthView });
router.register({ path: '/dashboard', render: renderDashboardView });
router.register({ path: '/game', render: renderGameView });
router.register({ path: '/tournament', render: renderTournamentView });
router.init();
