/**
 * Lineage API Service
 * 
 * Dedicated service for lineage and semantic graph API calls
 */

import axios from 'axios';
import { LineageGraph, LineageFilters, SemanticGraph, SemanticGraphFilters } from '@/modules/lineage/lineage.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

// ============================================
// LINEAGE API
// =======================================
/**
 * Get PostgreSQL-based lineage graph
 */
export async function getLineage(filters?: LineageFilters): Promise<LineageGraph> {
    try {
        const response = await apiClient.get('/lineage', { params: filters });
        return response.data.data;
    } catch (error) {
        console.error('Error fetching lineage:', error);
        throw new Error('Failed to fetch lineage graph');
    }
}

/**
 * Get Neo4j semantic graph
 */
export async function getSemanticGraph(filters?: SemanticGraphFilters): Promise<SemanticGraph> {
    try {
        const response = await apiClient.get('/graph/semantic', { params: filters });
        return response.data.data;
    } catch (error) {
        console.error('Error fetching semantic graph:', error);
        throw new Error('Failed to fetch semantic graph');
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if backend is healthy
 */
export async function checkHealth(): Promise<boolean> {
    try {
        const response = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`, {
            timeout: 3000,
        });
        return response.data.status === 'healthy';
    } catch (error) {
        console.error('Health check failed:', error);
        return false;
    }
}

export const lineageApi = {
    getLineage,
    getSemanticGraph,
    checkHealth,
};

export default lineageApi;
