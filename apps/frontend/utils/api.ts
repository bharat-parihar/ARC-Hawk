import axios from 'axios';
import {
    LineageGraph,
    FindingsResponse,
    ClassificationSummary,
    IngestResult,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const api = {
    ingestScan: async (scanData: any): Promise<IngestResult> => {
        const response = await apiClient.post('/scans/ingest', scanData);
        return response.data.data;
    },

    getLineage: async (filters?: {
        source?: string;
        severity?: string;
        data_type?: string;
        asset_id?: string;
        level?: string;
    }): Promise<LineageGraph> => {
        const response = await apiClient.get('/lineage', { params: filters });
        return response.data.data;
    },

    getAsset: async (id: string): Promise<any> => {
        const response = await apiClient.get(`/assets/${id}`);
        return response.data.data;
    },

    getFindings: async (params?: {
        page?: number;
        page_size?: number;
        severity?: string;
        pattern_name?: string;
        scan_run_id?: string;
        asset_id?: string;
    }): Promise<FindingsResponse> => {
        const response = await apiClient.get('/findings', { params });
        return response.data.data;
    },

    getClassificationSummary: async (): Promise<ClassificationSummary> => {
        const response = await apiClient.get('/classification/summary');
        return response.data.data;
    },

    getSemanticGraph: async (filters?: {
        system_id?: string;
        risk_level?: string;
        category?: string;
    }): Promise<{ nodes: any[]; edges: any[] }> => {
        const response = await apiClient.get('/graph/semantic', { params: filters });
        return response.data.data;
    },

    healthCheck: async (): Promise<{ status: string; service: string }> => {
        const response = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`);
        return response.data;
    },
};
