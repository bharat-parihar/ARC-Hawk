import { post, get } from '@/utils/api-client';
import { IngestResult } from '@/types';

export const scansApi = {
    /**
     * Ingest a new scan result
     */
    ingestScan: async (scanData: any): Promise<IngestResult> => {
        // Backend returns wrapped data? Let's assume standard wrapper
        // and robustly handle it inside get/post if possible, but 
        // our new api-client returns .data directly.
        // Let's stick to the convention of explicit typing.
        return await post<IngestResult>('/scans/ingest', scanData);
    },

    /**
     * Get the last scan run details
     */
    getLastScanRun: async (): Promise<any> => {
        try {
            return await get<any>('/scans/latest');
        } catch (error) {
            console.error('Failed to fetch last scan:', error);
            return null;
        }
    }
};

export default scansApi;
