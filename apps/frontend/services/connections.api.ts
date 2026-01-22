
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

export interface Connection {
    id: string;
    source_type: string;
    profile_name: string;
    validation_status: string;
    created_at: string;
    updated_at: string;
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

export async function getConnections(): Promise<{ connections: Connection[] }> {
    const response = await fetch(`${API_BASE}/api/v1/connections`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch connections: ${response.statusText}`);
    }

    return response.json();
}

export async function syncConnections() {
    const response = await fetch(`${API_BASE}/api/v1/connections/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to sync connections: ${response.statusText}`);
    }

    return response.json();
}

export async function validateSync() {
    const response = await fetch(`${API_BASE}/api/v1/connections/sync/validate`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to validate sync: ${response.statusText}`);
    }

    return response.json();
}

export async function testConnection(data: ConnectionConfig) {
    const response = await fetch(`${API_BASE}/api/v1/connections/test`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || `Connection test failed: ${response.statusText}`);
    }

    return response.json();
}

export const connectionsApi = {
    addConnection,
    getConnections,
    syncConnections,
    validateSync,
    testConnection,
};
