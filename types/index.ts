export interface UserProfile {
    alias: string;
    primaryFocus: string;
    credits: number;
    subscriptionLevel: 'free' | 'pro';
}

export interface DesignTemplate {
    id: string;
    title: string;
    category: string;
    thumbnailUrl?: string;
}

export interface GeneratedAsset {
    id: string;
    title: string;
    prompt: string;
    createdAt: Date;
    type: 'image' | 'video' | 'copy';
}
