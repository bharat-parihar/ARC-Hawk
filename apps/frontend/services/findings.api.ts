import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

export interface FeedbackRequest {
    feedback_type: 'FALSE_POSITIVE' | 'FALSE_NEGATIVE' | 'CONFIRMED';
    original_classification?: string;
    proposed_classification?: string;
    comments?: string;
}

export const findingsApi = {
    submitFeedback: async (findingId: string, feedback: FeedbackRequest): Promise<void> => {
        try {
            await apiClient.post(`/findings/${findingId}/feedback`, feedback);
        } catch (error) {
            console.error(`Error submitting feedback for finding ${findingId}:`, error);
            throw new Error('Failed to submit feedback');
        }
    },
};

export default findingsApi;
