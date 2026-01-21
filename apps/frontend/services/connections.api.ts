
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ConnectionConfig {
    source_type: string;
    profile_name: string;
    config: {
        host?: string;
        username?: string;
        password?: string;
        database?: string;
        environment?: string;
        [key: string]: any;
    };
}

export async function addConnection(data: ConnectionConfig) {
    const response = await fetch(`${API_BASE}/api/v1/connections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || `Failed to add connection: ${response.statusText}`);
    }

    return response.json();
}

export const connectionsApi = {
    addConnection,
};
