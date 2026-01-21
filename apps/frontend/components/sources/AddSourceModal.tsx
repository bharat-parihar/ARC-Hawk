import React, { useState } from 'react';
import { X, Database, HardDrive, Cloud, Server, FileText, Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { connectionsApi } from '@/services/connections.api';

interface SourceType {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    templates?: string[];
}

const SOURCE_TYPES: SourceType[] = [
    {
        id: 'database',
        name: 'Database',
        icon: <Database className="w-6 h-6" />,
        description: 'MySQL, PostgreSQL, Oracle, MongoDB',
        templates: ['PostgreSQL', 'MySQL', 'Oracle', 'MongoDB', 'SQL Server']
    },
    {
        id: 'filesystem',
        name: 'Filesystem',
        icon: <HardDrive className="w-6 h-6" />,
        description: 'Local or network file systems',
        templates: ['Linux FS', 'Windows FS', 'NFS', 'SMB']
    },
    {
        id: 's3',
        name: 'S3',
        icon: <Cloud className="w-6 h-6" />,
        description: 'AWS S3 buckets',
        templates: ['AWS S3', 'MinIO', 'DigitalOcean Spaces']
    },
    {
        id: 'gcs',
        name: 'GCS',
        icon: <Cloud className="w-6 h-6" />,
        description: 'Google Cloud Storage',
        templates: ['GCS Standard', 'GCS Nearline']
    },
    {
        id: 'other',
        name: 'Other',
        icon: <Server className="w-6 h-6" />,
        description: 'Custom data sources',
        templates: []
    }
];

interface AddSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddSourceModal({ isOpen, onClose }: AddSourceModalProps) {
    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        environment: 'prod',
        host: '',
        username: '',
        password: '',
        readOnly: true,
        allowRemediation: false
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const selectedSourceType = SOURCE_TYPES.find(s => s.id === selectedType);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, checked } = e.target;
        if (id === 'read-only') setFormData(prev => ({ ...prev, readOnly: checked }));
        if (id === 'allow-remediation') setFormData(prev => ({ ...prev, allowRemediation: checked }));
    };

    const handleSubmit = async (runScan: boolean) => {
        if (!selectedType || !formData.name || !formData.host) {
            setError('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await connectionsApi.addConnection({
                source_type: selectedType,
                profile_name: formData.name,
                config: {
                    host: formData.host,
                    username: formData.username,
                    password: formData.password,
                    environment: formData.environment,
                    read_only: formData.readOnly,
                    allow_remediation: formData.allowRemediation,
                    template: selectedTemplate || undefined
                }
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setStep(1);
                setFormData({
                    name: '',
                    environment: 'prod',
                    host: '',
                    username: '',
                    password: '',
                    readOnly: true,
                    allowRemediation: false
                });
                setSuccess(false);
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to add connection');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Add Data Source</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Step {step} of 2: {step === 1 ? 'Select Source Type' : 'Connection Details'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto overflow-x-hidden flex-1">
                    {success ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border border-green-500/20">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Connection Added!</h3>
                            <p className="text-slate-400">Successfully connected to {formData.name}</p>
                        </div>
                    ) : step === 1 ? (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            {/* Source Type Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                {SOURCE_TYPES.map((source) => (
                                    <button
                                        key={source.id}
                                        onClick={() => setSelectedType(source.id)}
                                        className={`
                      p-4 rounded-lg border-2 transition-all text-left group
                      ${selectedType === source.id
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-slate-800 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                                            }
                    `}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`
                        p-3 rounded-lg transition-colors
                        ${selectedType === source.id ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 group-hover:bg-slate-600 text-slate-400 group-hover:text-slate-200'}
                      `}>
                                                {source.icon}
                                            </div>
                                            <div className="flex-1">
                                                <div className={`font-semibold ${selectedType === source.id ? 'text-white' : 'text-slate-200'}`}>
                                                    {source.name}
                                                </div>
                                                <div className="text-sm text-slate-400 mt-1">{source.description}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Advanced Templates */}
                            {selectedType && selectedSourceType?.templates && selectedSourceType.templates.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <button
                                        onClick={() => setShowTemplates(!showTemplates)}
                                        className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Advanced Templates</span>
                                    </button>

                                    {showTemplates && (
                                        <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {selectedSourceType.templates.map((template) => (
                                                <button
                                                    key={template}
                                                    onClick={() => setSelectedTemplate(template)}
                                                    className={`
                            px-3 py-2 rounded-lg text-sm font-medium transition-colors border
                            ${selectedTemplate === template
                                                            ? 'bg-blue-600/20 border-blue-500 text-white'
                                                            : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                                        }
                          `}
                                                >
                                                    {template}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Source Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Production Database"
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Environment *
                                        </label>
                                        <select
                                            name="environment"
                                            value={formData.environment}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="prod">Production</option>
                                            <option value="dev">Development</option>
                                            <option value="qa">QA</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Connection Method
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button className="px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium">
                                                Credential
                                            </button>
                                            <button className="px-3 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-700 opacity-50 cursor-not-allowed">
                                                Key / Token
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Host *
                                        </label>
                                        <input
                                            type="text"
                                            name="host"
                                            value={formData.host}
                                            onChange={handleInputChange}
                                            placeholder="localhost:5432"
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            placeholder="admin"
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                                <label className="block text-sm font-medium text-slate-300">
                                    Connection Scope
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="read-only"
                                            checked={formData.readOnly}
                                            onChange={handleCheckboxChange}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-slate-900"
                                        />
                                        <label htmlFor="read-only" className="text-sm text-slate-400 select-none cursor-pointer">
                                            Read-only access
                                        </label>
                                    </div>
                                    <div className="w-px h-4 bg-slate-700 mx-2"></div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="allow-remediation"
                                            checked={formData.allowRemediation}
                                            onChange={handleCheckboxChange}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-slate-900"
                                        />
                                        <label htmlFor="allow-remediation" className="text-sm text-slate-400 select-none cursor-pointer">
                                            Allow remediation actions
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    {!success && (
                        <div className="flex gap-3">
                            {step === 2 && (
                                <button
                                    onClick={() => setStep(1)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700 disabled:opacity-50"
                                >
                                    Back
                                </button>
                            )}
                            {step === 1 ? (
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!selectedType}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                                >
                                    Next Step
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleSubmit(false)}
                                        disabled={isSubmitting}
                                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Connection'
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

