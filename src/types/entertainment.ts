export interface EntertainmentVideo {
  id: string;
  title: string;
  channelTitle: string;
  embedUrl: string;
  openUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  sourceId: string;
  sourceLabel: string;
}

export interface EntertainmentSource {
  id: string;
  kind: 'playlist';
  playlistId: string;
  label: string;
  active?: boolean;
}
