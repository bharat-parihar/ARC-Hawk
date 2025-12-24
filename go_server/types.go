package main

type ScanRequest struct {
	Command        string `json:"command"` // "fs", "postgresql", etc.
	ConnectionFile string `json:"connection_file"`
}

type ScanResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	JobID   string `json:"job_id,omitempty"`
}

type LineageRequest struct {
	ScanResultFile string `json:"scan_result_file"` // Optional, defaults to output.json
}

type LineageResponse struct {
	Nodes []LineageNode `json:"nodes"`
	Edges []LineageEdge `json:"edges"`
}

type LineageNode struct {
	ID    string `json:"id"`
	Type  string `json:"type"` // "source", "pii_type"
	Label string `json:"label"`
}

type LineageEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Label  string `json:"label"`
}

// HawkFinding represents the structure of a finding in output.json
type HawkFinding struct {
    DataSource   string   `json:"data_source"` // e.g., "s3", "fs"
    Profile      string   `json:"profile"`
    Bucket       string   `json:"bucket,omitempty"`
    FilePath     string   `json:"file_path,omitempty"`
    FileName     string   `json:"file_name,omitempty"`
    Host         string   `json:"host,omitempty"`
    Database     string   `json:"database,omitempty"`
    Table        string   `json:"table,omitempty"`
    Column       string   `json:"column,omitempty"`
    PatternName  string   `json:"pattern_name"`
    Matches      []string   `json:"matches"`
    SampleText   string     `json:"sample_text"`
    MetaData     map[string]interface{} `json:"file_data,omitempty"`
}

type AddRegexRequest struct {
    PatternName string `json:"pattern_name"`
    Regex       string `json:"regex"`
    Description string `json:"description"`
}

// Minimal structure for connection.yml to allow generic addition
// We'll treat it as a map to preserve other fields
type ConnectionFile struct {
    Sources map[string]interface{} `yaml:"sources"`
    Notify  map[string]interface{} `yaml:"notify,omitempty"`
}
