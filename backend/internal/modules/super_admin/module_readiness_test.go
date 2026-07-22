package superadmin

import (
	"reflect"
	"testing"
)

func TestDecodePlanModules(t *testing.T) {
	modules, err := decodePlanModules(`["auth","schedules","attendance"]`)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"auth", "schedules", "attendance"}
	if !reflect.DeepEqual(modules, want) {
		t.Fatalf("decodePlanModules() = %#v, want %#v", modules, want)
	}
	if _, err := decodePlanModules(`{"not":"an-array"}`); err == nil {
		t.Fatal("decodePlanModules should reject a non-array contract")
	}
}

func TestClassifyPlanModules(t *testing.T) {
	ready, unavailable := classifyPlanModules([]string{
		"auth", "schedules", "SCHEDULES", "qr_access", "unknown_module",
	})
	if !reflect.DeepEqual(ready, []string{"schedules"}) {
		t.Fatalf("ready = %#v", ready)
	}
	if !reflect.DeepEqual(unavailable, []string{"qr_access", "unknown_module"}) {
		t.Fatalf("unavailable = %#v", unavailable)
	}
}

func TestClassifyRequestedAddonsRejectsCorePlannedAndUnknown(t *testing.T) {
	ready, invalid := classifyRequestedAddons([]string{
		" attendance ", "attendance", "auth", "workshops", "made_up",
	})
	if !reflect.DeepEqual(ready, []string{"attendance"}) {
		t.Fatalf("ready = %#v", ready)
	}
	if !reflect.DeepEqual(invalid, []string{"auth", "workshops", "made_up"}) {
		t.Fatalf("invalid = %#v", invalid)
	}
}

func TestEducationLevelContractsContainOnlyImplementedModules(t *testing.T) {
	for level, modules := range modulesByEducationLevel {
		for _, moduleKey := range modules {
			if !isProductionReadyTenantModule(moduleKey) {
				t.Errorf("level %s provisions non-operational module %s", level, moduleKey)
			}
		}
	}
}

func TestSelectableModulesAreProductionReady(t *testing.T) {
	for moduleKey := range tenantSelectableProductionModules {
		if !isProductionReadyTenantModule(moduleKey) {
			t.Errorf("selectable module %s is not production-ready", moduleKey)
		}
		for level, requiredModules := range modulesByEducationLevel {
			for _, requiredKey := range requiredModules {
				if moduleKey == requiredKey {
					t.Errorf("selectable module %s is also required by level %s", moduleKey, level)
				}
			}
		}
	}
}

func TestCoreModulesAreProductionReadyAndNeverSelectable(t *testing.T) {
	for moduleKey := range productionCoreTenantModules {
		if !isProductionReadyTenantModule(moduleKey) {
			t.Errorf("core module %s is not production-ready", moduleKey)
		}
		if isTenantSelectableProductionModule(moduleKey) {
			t.Errorf("core module %s must not be tenant-selectable", moduleKey)
		}
	}
}
