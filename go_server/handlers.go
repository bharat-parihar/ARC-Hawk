package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

const (
	ProjectRoot = ".."
	DefaultConnectionFile = "connection.yml"
	DefaultFingerprintFile = "fingerprint.yml"
	DefaultOutputJSON = "output.json"
	DefaultOutputCSV = "output.csv"
)

func AddConnectionHandler(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	connPath := filepath.Join(ProjectRoot, DefaultConnectionFile)
	
	// Read existing
	data, err := ioutil.ReadFile(connPath)
	var config map[string]interface{}
	if err == nil {
		yaml.Unmarshal(data, &config)
	}
	if config == nil {
		config = make(map[string]interface{})
	}

	// Merge sources
	if config["sources"] == nil {
		config["sources"] = make(map[string]interface{})
	}
	
	sources := config["sources"].(map[string]interface{})
	// Assuming req contains the specific source config to add, e.g. {"postgresql": {...}}
	for k, v := range req {
		sources[k] = v
	}

	// Write back
	out, err := yaml.Marshal(config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal config"})
		return
	}
	
	err = ioutil.WriteFile(connPath, out, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write config file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func AddRegexHandler(c *gin.Context) {
	var req AddRegexRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fpPath := filepath.Join(ProjectRoot, DefaultFingerprintFile)
	data, err := ioutil.ReadFile(fpPath)
	var fingerprint map[string]string
	if err == nil {
		yaml.Unmarshal(data, &fingerprint)
	}
	if fingerprint == nil {
		fingerprint = make(map[string]string)
	}

	// Add new pattern
	fingerprint[req.PatternName] = req.Regex

	out, err := yaml.Marshal(fingerprint)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal fingerprint"})
		return
	}
	
	ioutil.WriteFile(fpPath, out, 0644)
	c.JSON(http.StatusOK, gin.H{"status": "added"})
}

func StartScanHandler(c *gin.Context) {
	var req ScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate Job ID
	jobID := fmt.Sprintf("scan_%d", time.Now().Unix())
	logFile := filepath.Join(ProjectRoot, "logs", jobID+".log")

	// Command construction
	cmdArgs := []string{
		"hawk_scanner/main.py",
		req.Command,
		"--connection", req.ConnectionFile,
		"--json", DefaultOutputJSON,
		"--csv", DefaultOutputCSV,
	}

	absRoot, _ := filepath.Abs(ProjectRoot)
	pythonPath := filepath.Join(absRoot, ".venv", "bin", "python3")

	cmd := exec.Command(pythonPath, cmdArgs...)
	cmd.Dir = absRoot

	// Open log file
	outfile, err := os.Create(logFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create log file"})
		return
	}
	
	cmd.Stdout = outfile
	cmd.Stderr = outfile

	// Start async
	if err := cmd.Start(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start scanner"})
		return
	}

	// We won't wait here for simplicity of the "trigger" model, 
	// but normally you'd want a goroutine to wait and close file.
	go func() {
		defer outfile.Close()
		cmd.Wait()
	}()

	c.JSON(http.StatusOK, gin.H{
		"status": "started",
		"job_id": jobID,
		"message": "Scan started in background",
	})
}

func FetchLogsHandler(c *gin.Context) {
	jobID := c.Param("job_id")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job ID required"})
		return
	}
	
	// sanitize jobID for basic security (alphanumeric + underscore)
	// For now just basic path join
	logPath := filepath.Join(ProjectRoot, "logs", jobID+".log")
	
	data, err := ioutil.ReadFile(logPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Log not found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"job_id": jobID,
		"logs": string(data),
	})
}

func min(a, b int) int {
	if a < b { return a }
	return b
}

func FetchResultsHandler(c *gin.Context) {
	jsonPath := filepath.Join(ProjectRoot, DefaultOutputJSON)
	c.File(jsonPath)
}

func ExportCSVHandler(c *gin.Context) {
	csvPath := filepath.Join(ProjectRoot, DefaultOutputCSV)
	c.Header("Content-Disposition", "attachment; filename=scan_results.csv")
	c.File(csvPath)
}

func LineageHandler(c *gin.Context) {
	var req LineageRequest
	// Try binding, if fails or empty, use default
	c.ShouldBindJSON(&req)
	
	filename := DefaultOutputJSON
	if req.ScanResultFile != "" {
		filename = req.ScanResultFile
	}

	// Read output.json
	jsonPath := filepath.Join(ProjectRoot, filename)
	data, err := ioutil.ReadFile(jsonPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read results: " + err.Error()})
		return
	}

	// Parse grouped results
	// The structure is map[string][]HawkFinding
	var results map[string][]HawkFinding
	err = json.Unmarshal(data, &results)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse JSON: " + err.Error()})
		return
	}

	var nodes []LineageNode
	var edges []LineageEdge
	nodeSet := make(map[string]bool)

	// Helper to add node
	addNode := func(id, dtype, label string) {
		if !nodeSet[id] {
			nodes = append(nodes, LineageNode{ID: id, Type: dtype, Label: label})
			nodeSet[id] = true
		}
	}

	for group, findings := range results {
		for _, finding := range findings {
			// Source Node
			sourceID := ""
			sourceLabel := ""
			
			if group == "fs" {
				sourceID = "fs:" + finding.FilePath
				sourceLabel = finding.FilePath
			} else if group == "s3" {
				sourceID = "s3:" + finding.Bucket + "/" + finding.FilePath
				sourceLabel = finding.Bucket + "/" + finding.FilePath
			} else {
				// Generic fallback
				sourceID = group + ":" + finding.Host + "/" + finding.Database + "/" + finding.Table
				sourceLabel = finding.Host + " > " + finding.Table
			}
			
			addNode(sourceID, "source", sourceLabel)

			// PII Node
			piiID := "pii:" + finding.PatternName
			piiLabel := finding.PatternName
			addNode(piiID, "pii", piiLabel)

			// Edge
			edges = append(edges, LineageEdge{
				Source: sourceID,
				Target: piiID,
				Label:  "contains",
			})
		}
	}

	c.JSON(http.StatusOK, LineageResponse{
		Nodes: nodes,
		Edges: edges,
	})
}
