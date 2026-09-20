import type { LeaderboardPlayer } from '@/types/leaderboard';
import { el, formatScore } from '@/utils/dom';

import { createSectionEyebrow } from '../shared/section-eyebrow';

interface ColumnDef {
  key: string;
  full: string;
  short?: string;
}

// `short` is only shown at narrow widths (see leaderboard.scss); columns
// without one just keep their `full` label at every size.
const COLUMNS: ColumnDef[] = [
  { key: 'rank', full: 'Rank' },
  { key: 'player', full: 'Player' },
  { key: 'games', full: 'Games Played', short: 'Games' },
  { key: 'score', full: 'Total Score', short: 'Score' },
  { key: 'streak', full: 'Streak' },
  { key: 'favorite', full: 'Favorite Game' },
];

function renderHeaderLabel(column: ColumnDef): (Node | string)[] {
  if (!column.short) {
    return [column.full];
  }
  return [
    el('span', { className: 'leaderboard__label-full', text: column.full }),
    el('span', { className: 'leaderboard__label-short', text: column.short }),
  ];
}

function renderRow(player: LeaderboardPlayer): HTMLTableRowElement {
  const row = el('tr', { className: 'leaderboard__row' });
  const isTopRank = player.rank === 1;

  row.append(
    el('td', { className: 'leaderboard__cell leaderboard__cell--rank' }, [
      el('span', {
        className: `leaderboard__rank-badge${isTopRank ? ' leaderboard__rank-badge--top' : ''}`,
        text: `#${player.rank}`,
      }),
    ]),
    el('td', { className: 'leaderboard__cell leaderboard__cell--player' }, [
      el('span', {
        className: `leaderboard__avatar leaderboard__avatar--${player.rank}`,
        text: player.playerName.charAt(0).toUpperCase(),
      }),
      el('span', { className: 'leaderboard__player-name', text: player.playerName }),
    ]),
    el('td', {
      className: 'leaderboard__cell leaderboard__col--games',
      text: String(player.gamesPlayed),
    }),
    el('td', {
      className: 'leaderboard__cell leaderboard__cell--score',
      text: formatScore(player.totalScore),
    }),
    el('td', { className: 'leaderboard__cell' }, [
      el('span', { className: 'leaderboard__streak' }, [
        // The streak indicator is a plain 🔥 emoji, not a custom icon.
        el('span', { attrs: { 'aria-hidden': true }, text: '\u{1F525}' }),
        el('span', { className: 'leaderboard__label-full', text: `${player.streakDays} days` }),
        el('span', { className: 'leaderboard__label-short', text: `${player.streakDays}d` }),
      ]),
    ]),
    el('td', { className: 'leaderboard__cell leaderboard__col--favorite' }, [
      el('span', { className: 'leaderboard__badge', text: player.favoriteGameName }),
    ]),
  );

  return row;
}

export function createLeaderboard(players: LeaderboardPlayer[]): HTMLElement {
  const wrapper = el('div', { className: 'leaderboard-wrapper' });
  wrapper.append(createSectionEyebrow('Top Players This Week'));

  const scrollArea = el('div', { className: 'leaderboard__scroll-area' });
  const table = el('table', {
    className: 'leaderboard',
    attrs: { 'aria-label': 'Top players this week' },
  });

  const thead = el('thead', {}, [
    el(
      'tr',
      {},
      COLUMNS.map((column) =>
        el(
          'th',
          {
            className: `leaderboard__col--${column.key}`,
            attrs: { scope: 'col' },
          },
          renderHeaderLabel(column),
        ),
      ),
    ),
  ]);

  const tbody = el(
    'tbody',
    {},
    players.map((player) => renderRow(player)),
  );

  table.append(thead, tbody);
  scrollArea.append(table);
  wrapper.append(scrollArea);

  return wrapper;
}
