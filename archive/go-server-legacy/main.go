package main

import (
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	r.POST("/connection", AddConnectionHandler)
	r.POST("/regex", AddRegexHandler)
	r.POST("/scan", StartScanHandler)
	r.GET("/logs/:job_id", FetchLogsHandler)
	r.GET("/results", FetchResultsHandler)
	r.GET("/export/csv", ExportCSVHandler)
	r.POST("/lineage", LineageHandler)

	log.Println("Starting server on :8090")
	if err := r.Run(":8090"); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
