export interface UserProfile {
    alias: string;
    primaryFocus: string;
    credits: number;
    subscriptionLevel: 'free' | 'pro';
}

export type TemplateRequirementType = 'photo' | 'video' | 'text';

export interface TemplateRequirement {
    id: string;
    type: TemplateRequirementType;
    label: string;
    description?: string;
}

export interface DesignTemplate {
    id: string;
    title: string;
    category: string;
    thumbnail_url?: string;
    video_preview_url?: string;
    tutorial_video_url?: string;
    requirements?: TemplateRequirement[];
    defaultCaptionMode?: 'auto' | 'manual' | 'none';
    is_pro?: boolean;
    pro?: boolean;
}

export interface GeneratedAsset {
    id: string;
    title: string;
    prompt: string;
    createdAt: Date;
    type: 'image' | 'video' | 'copy';
}
