import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ASSET_CACHE_KEY = '@socify_asset_cache';
const CACHE_DIR = `${FileSystem.documentDirectory}generated_assets/`;

export interface CachedAsset {
  id: string;
  title: string;
  asset_type: string;
  local_uri: string | null;
  remote_url: string | null;
  created_at: string;
}

export class AssetCacheService {
  private static async ensureDir() {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  }

  static async cacheAsset(asset: any, uri: string): Promise<string | null> {
    try {
      await this.ensureDir();
      const filename = `${asset.id}_${Date.now()}.jpg`; // Assuming JPG for now
      const localUri = `${CACHE_DIR}${filename}`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: localUri
      });

      const cachedItem: CachedAsset = {
        id: asset.id,
        title: asset.title,
        asset_type: asset.asset_type,
        local_uri: localUri,
        remote_url: asset.remote_url || null,
        created_at: asset.created_at || new Date().toISOString(),
      };

      const existing = await this.getCachedAssets();
      await AsyncStorage.setItem(ASSET_CACHE_KEY, JSON.stringify([cachedItem, ...existing]));
      
      return localUri;
    } catch (e) {
      console.error("[AssetCache] Cache failed:", e);
      return null;
    }
  }

  static async getCachedAssets(): Promise<CachedAsset[]> {
    try {
      const data = await AsyncStorage.getItem(ASSET_CACHE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async clearCache() {
    try {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await AsyncStorage.removeItem(ASSET_CACHE_KEY);
    } catch (e) {
      console.error("[AssetCache] Clear failed:", e);
    }
  }
}
