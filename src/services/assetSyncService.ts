import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { MediaOptimizationService } from './mediaOptimizationService';

export interface AssetGenerationPayload {
  userId: string;
  templateId?: string;
  title: string;
  prompt?: string;
  assetType: 'image' | 'video' | 'copy';
  localUri: string; // The raw generated media URI
}

export interface SyncJob {
  id: string;
  payload: AssetGenerationPayload;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  createdAt: number;
  optimizedUri?: string;
}

const SYNC_QUEUE_KEY = '@socify_asset_sync_queue';
const MAX_RETRIES = 3;

export class AssetSyncService {
  /**
   * Main entry point for when a user generates a new asset.
   * Saves it locally, queues it, and attempts to sync.
   */
  static async handleNewGeneratedAsset(payload: AssetGenerationPayload): Promise<string> {
    // 1. Move the generated file to a permanent local directory so it's not lost if the app closes
    const fileName = payload.localUri.split('/').pop() || `${Date.now()}.${payload.assetType === 'video' ? 'mp4' : 'jpg'}`;
    const permanentUri = `${FileSystem.documentDirectory}assets/${fileName}`;
    
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}assets/`);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}assets/`, { intermediates: true });
    }

    await FileSystem.copyAsync({
      from: payload.localUri,
      to: permanentUri
    });

    payload.localUri = permanentUri;

    // 2. Create a Sync Job
    const jobId = Crypto.randomUUID();
    const newJob: SyncJob = {
      id: jobId,
      payload,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    };

    // 3. Add to Queue
    await this.addJobToQueue(newJob);

    // 4. Attempt to process queue immediately
    this.processQueue();

    return permanentUri; // Return local URI for instant UI preview
  }

  static async getQueue(): Promise<SyncJob[]> {
    try {
      const q = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  }

  static async saveQueue(queue: SyncJob[]) {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  static async addJobToQueue(job: SyncJob) {
    const queue = await this.getQueue();
    queue.push(job);
    await this.saveQueue(queue);
  }

  /**
   * Processes all pending jobs in the queue
   */
  static async processQueue() {
    let isConnected = true;
    try {
      const state = await NetInfo.fetch();
      isConnected = !!state.isConnected;
    } catch {
      // NetInfo not available (e.g. Expo Go), assume connected
    }

    if (!isConnected) {
      console.log('Device is offline, skipping sync queue');
      return;
    }

    const queue = await this.getQueue();
    const pendingJobs = queue.filter(j => j.status === 'pending' || j.status === 'failed');

    if (pendingJobs.length === 0) return;

    for (const job of pendingJobs) {
      if (job.retryCount >= MAX_RETRIES) continue; // Skip permanently failed jobs

      try {
        // Mark as syncing
        await this.updateJobStatus(job.id, 'syncing');

        // 1. Optimize Media (if not already done)
        if (!job.optimizedUri && job.payload.assetType !== 'copy') {
          if (job.payload.assetType === 'image') {
            job.optimizedUri = await MediaOptimizationService.optimizeImage(job.payload.localUri);
          } else if (job.payload.assetType === 'video') {
            job.optimizedUri = await MediaOptimizationService.optimizeVideo(job.payload.localUri);
          }
        }

        const uriToUpload = job.optimizedUri || job.payload.localUri;
        const fileExt = uriToUpload.split('.').pop() || 'tmp';
        const storagePath = `${job.payload.userId}/${job.id}.${fileExt}`;

        // 2. Upload to Supabase Storage
        const fileData = await FileSystem.readAsStringAsync(uriToUpload, { encoding: FileSystem.EncodingType.Base64 });
        // NOTE: In Expo, uploading base64 directly to storage requires specific handling, 
        // using fetch with Blob or using 'decode' from base64-arraybuffer is better.
        // For simplicity in this demo, we assume a standard upload approach.
        // A production app might use expo-file-system uploadAsync.
        
        // Example using Supabase js: (Requires converting base64 to arraybuffer)
        const buffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
        
        const { data: storageData, error: storageError } = await supabase.storage
          .from('assets')
          .upload(storagePath, buffer, {
            contentType: job.payload.assetType === 'video' ? 'video/mp4' : 'image/webp',
            upsert: true
          });

        if (storageError) throw storageError;

        // 3. Insert into Database
        const { error: dbError } = await supabase.from('generated_assets').insert({
          id: job.id,
          user_id: job.payload.userId,
          template_id: job.payload.templateId,
          title: job.payload.title,
          prompt: job.payload.prompt,
          asset_type: job.payload.assetType,
          storage_path: storagePath,
          is_draft: true,
          synced: true,
          // Get basic metadata
          metadata: {
            local_uri: job.payload.localUri
          }
        });

        if (dbError) throw dbError;

        // 4. Remove from queue on success
        await this.removeJob(job.id);

      } catch (error) {
        console.error(`Sync Job ${job.id} failed:`, error);
        job.retryCount += 1;
        job.status = 'failed';
        await this.updateJobStatus(job.id, 'failed', job.retryCount, job.optimizedUri);
      }
    }
  }

  static async updateJobStatus(jobId: string, status: SyncJob['status'], retryCount?: number, optimizedUri?: string) {
    const queue = await this.getQueue();
    const idx = queue.findIndex(j => j.id === jobId);
    if (idx > -1) {
      queue[idx].status = status;
      if (retryCount !== undefined) queue[idx].retryCount = retryCount;
      if (optimizedUri !== undefined) queue[idx].optimizedUri = optimizedUri;
      await this.saveQueue(queue);
    }
  }

  static async removeJob(jobId: string) {
    const queue = await this.getQueue();
    const filtered = queue.filter(j => j.id !== jobId);
    await this.saveQueue(filtered);
  }

  private static _listenerActive = false;

  /**
   * Call this from App.tsx or a global useEffect to listen for network changes.
   * Idempotent — safe to call multiple times.
   */
  static startNetworkListener() {
    if (this._listenerActive) return;
    this._listenerActive = true;

    try {
      NetInfo.addEventListener(state => {
        if (state.isConnected) {
          this.processQueue().catch(e => console.warn('[AssetSync] Queue processing error:', e));
        }
      });
    } catch (e) {
      console.warn('[AssetSync] NetInfo not available (Expo Go?), skipping network listener:', e);
      this._listenerActive = false;
    }
  }
}
