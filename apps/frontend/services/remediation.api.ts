import { post, get } from '@/utils/api-client';

export interface ExecuteRemediationRequest {
    finding_ids: string[];
    action_type: 'MASK' | 'DELETE' | 'ENCRYPT';
    user_id: string;
}

export interface ExecuteRemediationResponse {
    action_ids: string[];
    success: number;
    failed: number;
    errors?: string[];
}

export const remediationApi = {
    executeRemediation: async (data: ExecuteRemediationRequest): Promise<ExecuteRemediationResponse> => {
        return await post<ExecuteRemediationResponse>('/remediation/execute', data);
    },

    getRemediationHistory: async (assetId: string): Promise<any> => {
        return await get<any>(`/remediation/history/${assetId}`);
    }
};

export default remediationApi;
