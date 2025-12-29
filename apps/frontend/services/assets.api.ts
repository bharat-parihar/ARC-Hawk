/**
 * Assets API Service
 * 
 * Service for asset-specific API calls
 */

import axios from 'axios';
import { Asset } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// ============================================
// ASSETS API
// ============================================

/**
 * Get asset by ID
 */
export async function getAsset(id: string): Promise<Asset> {
    try {
        const response = await apiClient.get(`/assets/${id}`);
        return response.data.data;
    } catch (error) {
        console.error(`Error fetching asset ${id}:`, error);
        throw new Error('Failed to fetch asset details');
    }
}

/**
 * Get all assets
 */
export async function getAssets(params?: {
    page?: number;
    page_size?: number;
    sort_by?: string;
}): Promise<{ assets: Asset[]; total: number }> {
    try {
        const response = await apiClient.get('/assets', { params });
        return response.data.data;
    } catch (error) {
        console.error('Error fetching assets:', error);
        throw new Error('Failed to fetch assets');
    }
}

export const assetsApi = {
    getAsset,
    getAssets,
};

export default assetsApi;
