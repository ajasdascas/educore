package superadmin

import "testing"

func TestNormalizePlanRequestAcceptsOnlySelectableProductionModules(t *testing.T) {
	req := CreatePlanRequest{
		Name: "Profesional", Currency: "mxn", PriceMonthly: 100,
		Modules:  []string{"attendance", "schedules", "attendance"},
		Features: []string{"  Soporte operativo  ", ""},
	}
	if err := normalizePlanRequest(&req); err != nil {
		t.Fatalf("normalizePlanRequest() error = %v", err)
	}
	if len(req.Modules) != 2 || req.Modules[0] != "attendance" || req.Modules[1] != "schedules" {
		t.Fatalf("modules = %v, want unique production add-ons", req.Modules)
	}
	if req.Currency != "MXN" || len(req.Features) != 1 || req.Features[0] != "Soporte operativo" {
		t.Fatalf("request was not normalized: %#v", req)
	}
}

func TestNormalizePlanRequestRejectsBlockedOrCoreModulePromises(t *testing.T) {
	for _, module := range []string{"payments", "communications", "reports", "academic_core", "unknown"} {
		req := CreatePlanRequest{Name: "Plan seguro", Currency: "MXN", Modules: []string{module}}
		if err := normalizePlanRequest(&req); err == nil {
			t.Fatalf("module %q must not be sellable in a production plan", module)
		}
	}
}
