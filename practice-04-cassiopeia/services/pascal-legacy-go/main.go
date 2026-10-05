package main

import (
	"encoding/csv"
	"fmt"
	"math/rand"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func main() {
	outDir := env("CSV_OUT_DIR", "/data/csv")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		fatal(err)
	}

	now := time.Now().UTC()
	filename := "telemetry_" + now.Format("20060102_150405") + ".csv"
	path := filepath.Join(outDir, filename)
	file, err := os.Create(path)
	if err != nil {
		fatal(err)
	}
	writer := csv.NewWriter(file)
	if err := writer.Write([]string{"recorded_at", "voltage", "temp", "source_file"}); err != nil {
		file.Close()
		fatal(err)
	}
	row := []string{
		now.Format("2006-01-02 15:04:05"),
		fmt.Sprintf("%.2f", 3.2+rand.Float64()*(12.6-3.2)),
		fmt.Sprintf("%.2f", -50+rand.Float64()*130),
		filename,
	}
	if err := writer.Write(row); err != nil {
		file.Close()
		fatal(err)
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		file.Close()
		fatal(err)
	}
	if err := file.Close(); err != nil {
		fatal(err)
	}

	if err := importCSV(path); err != nil {
		fatal(err)
	}
	fmt.Printf("[legacy-go] generated %s\n", path)
}

func importCSV(path string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	args := []string{
		"--host", env("PGHOST", "db"),
		"--port", env("PGPORT", "5432"),
		"--username", env("PGUSER", "monouser"),
		"--dbname", env("PGDATABASE", "monolith"),
		"-c", `\copy telemetry_legacy(recorded_at, voltage, temp, source_file) FROM STDIN WITH (FORMAT csv, HEADER true)`,
	}
	command := exec.Command("psql", args...)
	command.Stdin = file
	command.Env = append(os.Environ(), "PGPASSWORD="+os.Getenv("PGPASSWORD"))
	output, err := command.CombinedOutput()
	if err != nil {
		return fmt.Errorf("psql import: %w: %s", err, strings.TrimSpace(string(output)))
	}
	return nil
}

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "[legacy-go] error: %v\n", err)
	os.Exit(1)
}
