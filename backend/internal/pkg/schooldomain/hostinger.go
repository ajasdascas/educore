// Package schooldomain provisions the public Hostinger subdomain associated
// with a tenant slug. It never stores or logs the Hostinger API token.
package schooldomain

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"strings"
	"time"

	"educore/internal/pkg/slug"
)

const defaultAPIBaseURL = "https://developers.hostinger.com"

type Config struct {
	APIToken   string
	Username   string
	Domain     string
	Directory  string
	APIBaseURL string
}

type Result struct {
	Host          string `json:"host"`
	Status        string `json:"status"`
	RootDirectory string `json:"root_directory,omitempty"`
}

type hostingerSubdomain struct {
	Domain        string `json:"domain"`
	Subdomain     string `json:"subdomain"`
	RootDirectory string `json:"root_directory"`
}

type Provisioner struct {
	config Config
	client *http.Client
}

func ConfigFromEnv() Config {
	return Config{
		APIToken:   strings.TrimSpace(os.Getenv("HOSTINGER_API_TOKEN")),
		Username:   strings.TrimSpace(os.Getenv("HOSTINGER_HOSTING_USERNAME")),
		Domain:     envOrDefault("HOSTINGER_WEBSITE_DOMAIN", "onlineu.mx"),
		Directory:  strings.Trim(strings.TrimSpace(envOrDefault("HOSTINGER_SUBDOMAIN_DIRECTORY", "educore")), "/"),
		APIBaseURL: strings.TrimRight(strings.TrimSpace(envOrDefault("HOSTINGER_API_BASE_URL", defaultAPIBaseURL)), "/"),
	}
}

func New(config Config, client *http.Client) (*Provisioner, error) {
	config.APIToken = strings.TrimSpace(config.APIToken)
	config.Username = strings.TrimSpace(config.Username)
	config.Domain = strings.ToLower(strings.TrimSpace(config.Domain))
	config.Directory = strings.Trim(strings.TrimSpace(config.Directory), "/")
	config.APIBaseURL = strings.TrimRight(strings.TrimSpace(config.APIBaseURL), "/")

	if config.APIToken == "" || config.Username == "" {
		return nil, errors.New("HOSTINGER_API_TOKEN and HOSTINGER_HOSTING_USERNAME are required")
	}
	if config.Domain != "onlineu.mx" || config.Directory != "educore" {
		return nil, errors.New("Hostinger provisioning is restricted to onlineu.mx and the educore directory")
	}
	base, err := url.Parse(config.APIBaseURL)
	if err != nil || base.Host == "" || base.User != nil || base.RawQuery != "" || base.Fragment != "" || (base.Path != "" && base.Path != "/") {
		return nil, errors.New("invalid Hostinger API base URL")
	}
	apiHost := strings.ToLower(base.Hostname())
	isLoopback := apiHost == "localhost" || apiHost == "127.0.0.1" || apiHost == "::1"
	if (apiHost != "developers.hostinger.com" && !isLoopback) || (base.Scheme != "https" && !(base.Scheme == "http" && isLoopback)) {
		return nil, errors.New("Hostinger API base URL must use the official HTTPS host")
	}
	if client == nil {
		client = &http.Client{Timeout: 20 * time.Second}
	}
	return &Provisioner{config: config, client: client}, nil
}

func NewFromEnv() (*Provisioner, error) {
	return New(ConfigFromEnv(), nil)
}

// Ensure creates the subdomain when missing and leaves an existing correct
// mapping unchanged. Hostinger's directory is relative to the website root.
func (p *Provisioner) Ensure(ctx context.Context, tenantSlug string) (Result, error) {
	tenantSlug = strings.ToLower(strings.TrimSpace(tenantSlug))
	result := Result{Host: tenantSlug + "." + p.config.Domain}
	if err := slug.Validate(tenantSlug); err != nil {
		return result, fmt.Errorf("invalid school slug: %w", err)
	}

	existing, err := p.list(ctx)
	if err != nil {
		return result, err
	}
	for _, item := range existing {
		if strings.EqualFold(item.Subdomain, tenantSlug) || strings.EqualFold(item.Domain, result.Host) {
			result.Status = "existing"
			result.RootDirectory = item.RootDirectory
			if !rootMatchesDirectory(item.RootDirectory, p.config.Directory) {
				return result, fmt.Errorf("subdomain already exists with unexpected root directory %q", item.RootDirectory)
			}
			return result, nil
		}
	}

	body, err := json.Marshal(map[string]interface{}{
		"subdomain":                 tenantSlug,
		"directory":                 p.config.Directory,
		"is_using_public_directory": false,
	})
	if err != nil {
		return result, err
	}
	request, err := p.request(ctx, http.MethodPost, p.endpoint(), bytes.NewReader(body))
	if err != nil {
		return result, err
	}
	response, err := p.client.Do(request)
	if err != nil {
		return result, fmt.Errorf("Hostinger create subdomain request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return result, hostingerAPIError("create subdomain", response)
	}

	result.Status = "created"
	return result, nil
}

func (p *Provisioner) list(ctx context.Context) ([]hostingerSubdomain, error) {
	request, err := p.request(ctx, http.MethodGet, p.endpoint(), nil)
	if err != nil {
		return nil, err
	}
	response, err := p.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("Hostinger list subdomains request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, hostingerAPIError("list subdomains", response)
	}

	var raw json.RawMessage
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&raw); err != nil {
		return nil, fmt.Errorf("invalid Hostinger subdomain response: %w", err)
	}
	var items []hostingerSubdomain
	if err := json.Unmarshal(raw, &items); err == nil {
		return items, nil
	}
	var wrapped struct {
		Data []hostingerSubdomain `json:"data"`
	}
	if err := json.Unmarshal(raw, &wrapped); err != nil || wrapped.Data == nil {
		return nil, errors.New("invalid Hostinger subdomain response shape")
	}
	return wrapped.Data, nil
}

func (p *Provisioner) endpoint() string {
	return p.config.APIBaseURL + "/api/hosting/v1/accounts/" +
		url.PathEscape(p.config.Username) + "/websites/" +
		url.PathEscape(p.config.Domain) + "/subdomains"
}

func (p *Provisioner) request(ctx context.Context, method, endpoint string, body io.Reader) (*http.Request, error) {
	request, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Authorization", "Bearer "+p.config.APIToken)
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	return request, nil
}

func hostingerAPIError(operation string, response *http.Response) error {
	body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
	message := strings.TrimSpace(string(body))
	if message == "" {
		message = http.StatusText(response.StatusCode)
	}
	return fmt.Errorf("Hostinger %s failed with HTTP %d: %s", operation, response.StatusCode, message)
}

func rootMatchesDirectory(rootDirectory, directory string) bool {
	cleanRoot := strings.ReplaceAll(path.Clean(strings.ReplaceAll(rootDirectory, "\\", "/")), "\\", "/")
	cleanDirectory := strings.Trim(strings.ReplaceAll(directory, "\\", "/"), "/")
	return cleanRoot == cleanDirectory || strings.HasSuffix(cleanRoot, "/"+cleanDirectory)
}

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
