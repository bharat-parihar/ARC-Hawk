import { post, get, put } from '@/utils/api-client';

export const settingsApi = {
    /**
     * Get system settings
     */
    getSettings: async (): Promise<any> => {
        try {
            const response = await get<any>('/auth/settings');
            // If response is empty object, we might want to return null or defaults
            // But let the component handle defaults
            return response;
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            return null;
        }
    },

    /**
     * Update system settings
     */
    updateSettings: async (settings: any): Promise<any> => {
        return await put<any>('/auth/settings', { settings });
    }
};

export default settingsApi;
