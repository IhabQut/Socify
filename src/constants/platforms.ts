export interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const PLATFORMS: Platform[] = [
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E1306C' },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { id: 'tiktok', name: 'TikTok', icon: 'logo-tiktok', color: '#000000' },
  { id: 'twitter', name: 'Twitter/X', icon: 'logo-twitter', color: '#1DA1F2' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  { id: 'threads', name: 'Threads', icon: 'ellipsis-horizontal-circle', color: '#000000' },
  { id: 'pinterest', name: 'Pinterest', icon: 'logo-pinterest', color: '#E60023' }
];

export const getPlatformById = (id: string): Platform | undefined => {
  return PLATFORMS.find(p => p.id === id);
};
