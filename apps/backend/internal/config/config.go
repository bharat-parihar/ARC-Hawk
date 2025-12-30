package config

import (
	"os"
	"strconv"
)

type Config struct {
	Classification ClassificationConfig
}

type ClassificationConfig struct {
	WeightRules    float64
	WeightPresidio float64
	WeightContext  float64
	WeightEntropy  float64
	Threshold      float64
}

func LoadConfig() *Config {
	return &Config{
		Classification: ClassificationConfig{
			WeightRules:    getEnvFloat("CLASSIFICATION_WEIGHT_RULES", 0.30),
			WeightPresidio: getEnvFloat("CLASSIFICATION_WEIGHT_PRESIDIO", 0.50),
			WeightContext:  getEnvFloat("CLASSIFICATION_WEIGHT_CONTEXT", 0.15),
			WeightEntropy:  getEnvFloat("CLASSIFICATION_WEIGHT_ENTROPY", 0.05),
			Threshold:      getEnvFloat("CLASSIFICATION_THRESHOLD", 0.60),
		},
	}
}

func getEnvFloat(key string, defaultVal float64) float64 {
	if val, exists := os.LookupEnv(key); exists {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return defaultVal
}
