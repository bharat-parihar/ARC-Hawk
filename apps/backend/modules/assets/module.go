package assets

import (
	"log"

	"github.com/arc-platform/backend/modules/assets/api"
	"github.com/arc-platform/backend/modules/assets/service"
	"github.com/arc-platform/backend/modules/shared/infrastructure/persistence"
	"github.com/arc-platform/backend/modules/shared/interfaces"
	"github.com/gin-gonic/gin"
)

type AssetsModule struct {
	assetService    *service.AssetService
	findingsService *service.FindingsService
	datasetService  *service.DatasetService

	assetHandler    *api.AssetHandler
	findingsHandler *api.FindingsHandler
	datasetHandler  *api.DatasetHandler

	deps *interfaces.ModuleDependencies
}

func (m *AssetsModule) Name() string {
	return "assets"
}

func (m *AssetsModule) Initialize(deps *interfaces.ModuleDependencies) error {
	m.deps = deps
	log.Printf("📦 Initializing Assets Module...")

	repo := persistence.NewPostgresRepository(deps.DB)

	m.assetService = service.NewAssetService(repo)
	m.findingsService = service.NewFindingsService(repo)
	m.datasetService = service.NewDatasetService(repo)

	m.assetHandler = api.NewAssetHandler(m.assetService)
	m.findingsHandler = api.NewFindingsHandler(m.findingsService)
	m.datasetHandler = api.NewDatasetHandler(m.datasetService)

	log.Printf("✅ Assets Module initialized")
	return nil
}

func (m *AssetsModule) RegisterRoutes(router *gin.RouterGroup) {
	router.GET("/assets", m.assetHandler.ListAssets)
	router.GET("/assets/:id", m.assetHandler.GetAsset)
	router.GET("/findings", m.findingsHandler.GetFindings)
	router.POST("/findings/:id/feedback", m.findingsHandler.SubmitFeedback)
	router.GET("/dataset/golden", m.datasetHandler.GetGoldenDataset)
	log.Printf("📦 Assets routes registered")
}

func (m *AssetsModule) Shutdown() error {
	log.Printf("🔌 Shutting down Assets Module...")
	return nil
}

func NewAssetsModule() *AssetsModule {
	return &AssetsModule{}
}
