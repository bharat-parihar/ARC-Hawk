import { get, post } from '@/utils/api-client';

export interface FeedbackRequest {
    feedback_type: 'FALSE_POSITIVE' | 'FALSE_NEGATIVE' | 'CONFIRMED';
    original_classification?: string;
    proposed_classification?: string;
    comments?: string;
}

export const findingsApi = {
    submitFeedback: async (findingId: string, feedback: FeedbackRequest): Promise<void> => {
        try {
            await post<void>(`/findings/${findingId}/feedback`, feedback);
        } catch (error) {
            console.error(`Error submitting feedback for finding ${findingId}:`, error);
            throw new Error('Failed to submit feedback');
        }
    },

    getFindings: async (params?: {
        page?: number;
        page_size?: number;
        severity?: string;
        asset_id?: string;
    }): Promise<{ findings: any[], total: number }> => {
        // Backend returns wrapped response: { data: { findings: [], total: ... } }
        const res = await get<any>('/findings', params);

        // Debug Log
        // console.log('Findings API Response:', JSON.stringify(res, null, 2));

        // Handle the wrapper { data: { findings: [], total: ... } }
        let findingsList: any[] = [];
        let totalCount = 0;

        if (res.data && Array.isArray(res.data.findings)) {
            findingsList = res.data.findings;
            totalCount = res.data.total || 0;
        } else if (Array.isArray(res.data)) {
            // Fallback for legacy unwrapped array
            findingsList = res.data;
            totalCount = findingsList.length;
        } else if (res.findings && Array.isArray(res.findings)) {
            // Fallback if 'data' wrapper is missing but 'findings' key exists
            findingsList = res.findings;
            totalCount = res.total || 0;
        }

        return {
            findings: findingsList,
            total: totalCount,
        };
    }
};

export default findingsApi;
