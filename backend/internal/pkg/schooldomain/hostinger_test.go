package schooldomain

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func testProvisioner(t *testing.T, handler http.HandlerFunc) *Provisioner {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	provisioner, err := New(Config{
		APIToken:   "test-token",
		Username:   "u550473909",
		Domain:     "onlineu.mx",
		Directory:  "educore",
		APIBaseURL: server.URL,
	}, server.Client())
	if err != nil {
		t.Fatal(err)
	}
	return provisioner
}

func TestEnsureCreatesMissingSubdomain(t *testing.T) {
	requests := 0
	p := testProvisioner(t, func(w http.ResponseWriter, r *http.Request) {
		requests++
		if r.Header.Get("Authorization") != "Bearer test-token" {
			t.Fatalf("missing bearer token")
		}
		switch r.Method {
		case http.MethodGet:
			_ = json.NewEncoder(w).Encode([]hostingerSubdomain{})
		case http.MethodPost:
			var body map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body["subdomain"] != "kinder-prueba" || body["directory"] != "educore" {
				t.Fatalf("unexpected body: %#v", body)
			}
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})

	result, err := p.Ensure(context.Background(), "kinder-prueba")
	if err != nil {
		t.Fatal(err)
	}
	if result.Status != "created" || requests != 2 {
		t.Fatalf("unexpected result: %#v requests=%d", result, requests)
	}
}

func TestEnsureKeepsExistingCorrectSubdomain(t *testing.T) {
	p := testProvisioner(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("unexpected mutation: %s", r.Method)
		}
		_ = json.NewEncoder(w).Encode([]hostingerSubdomain{{
			Domain:        "kinder-prueba.onlineu.mx",
			Subdomain:     "kinder-prueba",
			RootDirectory: "/home/u550473909/domains/onlineu.mx/public_html/educore",
		}})
	})

	result, err := p.Ensure(context.Background(), "kinder-prueba")
	if err != nil {
		t.Fatal(err)
	}
	if result.Status != "existing" {
		t.Fatalf("unexpected result: %#v", result)
	}
}

func TestEnsureRejectsWrongExistingRoot(t *testing.T) {
	p := testProvisioner(t, func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]hostingerSubdomain{{
			Domain:        "kinder-prueba.onlineu.mx",
			Subdomain:     "kinder-prueba",
			RootDirectory: "/home/u550473909/domains/onlineu.mx/public_html/kinder-prueba",
		}})
	})

	if _, err := p.Ensure(context.Background(), "kinder-prueba"); err == nil {
		t.Fatal("expected wrong-root error")
	}
}

func TestEnsureRejectsInvalidSlugBeforeCallingAPI(t *testing.T) {
	p := testProvisioner(t, func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("API must not be called for an invalid slug")
	})
	if _, err := p.Ensure(context.Background(), "api"); err == nil {
		t.Fatal("expected reserved-slug error")
	}
}

func TestNewRejectsNonOfficialRemoteAPIHost(t *testing.T) {
	_, err := New(Config{
		APIToken:   "test-token",
		Username:   "u550473909",
		Domain:     "onlineu.mx",
		Directory:  "educore",
		APIBaseURL: "http://attacker.example",
	}, nil)
	if err == nil {
		t.Fatal("expected unsafe API base URL to be rejected")
	}
}
