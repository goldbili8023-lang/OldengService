import type { EntertainmentSource } from '../types/entertainment';

// Keep this registry small and editable. These are public YouTube playlists that already lean
// toward short-form clips, so we can avoid search queries and keep quota cost low.
export const ENTERTAINMENT_SOURCES: EntertainmentSource[] = [
  {
    id: 'disney-jr-shorts',
    kind: 'playlist',
    playlistId: 'PL2m1vjiMH_hNUSRHljPR-deOEKs8G_5nK',
    label: 'Disney Jr Shorts',
  },
  {
    id: 'mus1ca-shorts',
    kind: 'playlist',
    playlistId: 'PLdFaYOdskzI-lFJyaHChlDPFCBeEhkJsY',
    label: 'MUS1CA Shorts',
  },
  {
    id: 'comedy-jokes-central',
    kind: 'playlist',
    playlistId: 'PLAPRrKsireEqUZKtlnU5tqpgtpUn2axw9',
    label: 'Comedy Jokes Central',
  },
  {
    id: 'funny-mix',
    kind: 'playlist',
    playlistId: 'PLBGxkiI_EtRNg7p0OEw8zLLWusxJinbe0',
    label: 'Funny Mix',
  },
];
