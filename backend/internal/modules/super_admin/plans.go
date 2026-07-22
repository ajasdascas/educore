package superadmin

import (
	"educore/internal/pkg/response"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

// Registrar rutas de planes
func (h *Handler) RegisterPlanRoutes(router fiber.Router) {
	router.Get("/plans", h.ListPlans)
	router.Post("/plans", h.CreatePlan)
	router.Get("/plans/:id", h.GetPlan)
	router.Put("/plans/:id", h.UpdatePlan)
	router.Delete("/plans/:id", h.DeletePlan)
	router.Patch("/plans/:id/toggle", h.TogglePlan)
}

func (h *Handler) ListPlans(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT id, name, description, price_monthly, price_annual, currency, 
		 max_students, max_teachers, modules, features, is_active, is_featured, created_at 
		 FROM subscription_plans ORDER BY price_monthly ASC`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching plans")
	}
	defer rows.Close()

	var plans []fiber.Map
	for rows.Next() {
		var id, name, currency string
		var description *string
		var priceMonthly, priceAnnual float64
		var maxStudents, maxTeachers int
		var modules, features []byte
		var isActive, isFeatured bool
		var createdAt interface{}

		if err := rows.Scan(&id, &name, &description, &priceMonthly, &priceAnnual, &currency,
			&maxStudents, &maxTeachers, &modules, &features, &isActive, &isFeatured, &createdAt); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error reading plans")
		}

		desc := ""
		if description != nil {
			desc = *description
		}

		plans = append(plans, fiber.Map{
			"id":            id,
			"name":          name,
			"description":   desc,
			"price_monthly": priceMonthly,
			"price_annual":  priceAnnual,
			"currency":      currency,
			"max_students":  maxStudents,
			"max_teachers":  maxTeachers,
			"modules":       string(modules),  // will parse in frontend
			"features":      string(features), // will parse in frontend
			"is_active":     isActive,
			"is_featured":   isFeatured,
			"created_at":    createdAt,
		})
	}
	if err := rows.Err(); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error reading plans")
	}

	if plans == nil {
		plans = []fiber.Map{}
	}

	return response.Success(c, fiber.Map{"plans": plans}, "Plans retrieved")
}

type CreatePlanRequest struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	PriceMonthly float64  `json:"price_monthly"`
	PriceAnnual  float64  `json:"price_annual"`
	Currency     string   `json:"currency"`
	MaxStudents  int      `json:"max_students"`
	MaxTeachers  int      `json:"max_teachers"`
	Modules      []string `json:"modules"`
	Features     []string `json:"features"`
	IsActive     bool     `json:"is_active"`
	IsFeatured   bool     `json:"is_featured"`
}

func normalizePlanRequest(req *CreatePlanRequest) error {
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.Currency = strings.ToUpper(strings.TrimSpace(req.Currency))
	if req.Currency == "" {
		req.Currency = "MXN"
	}
	if len([]rune(req.Name)) < 2 || len([]rune(req.Name)) > 100 {
		return fmt.Errorf("el nombre del plan debe tener entre 2 y 100 caracteres")
	}
	if len([]rune(req.Description)) > 1000 {
		return fmt.Errorf("la descripción del plan no puede exceder 1000 caracteres")
	}
	if len(req.Currency) != 3 || strings.IndexFunc(req.Currency, func(r rune) bool { return r < 'A' || r > 'Z' }) >= 0 {
		return fmt.Errorf("la moneda debe ser un código ISO de tres letras")
	}
	if req.PriceMonthly < 0 || req.PriceAnnual < 0 || math.IsNaN(req.PriceMonthly) || math.IsNaN(req.PriceAnnual) || math.IsInf(req.PriceMonthly, 0) || math.IsInf(req.PriceAnnual, 0) {
		return fmt.Errorf("los precios deben ser valores finitos no negativos")
	}
	if req.MaxStudents < 0 || req.MaxTeachers < 0 || req.MaxStudents > 1_000_000 || req.MaxTeachers > 1_000_000 {
		return fmt.Errorf("los límites del plan no son válidos")
	}
	modules, invalid := classifyRequestedAddons(req.Modules)
	if len(invalid) > 0 {
		return fmt.Errorf("módulos no disponibles para planes de producción: %s", strings.Join(invalid, ", "))
	}
	req.Modules = modules
	if len(req.Features) > 20 {
		return fmt.Errorf("un plan no puede tener más de 20 características")
	}
	features := make([]string, 0, len(req.Features))
	for _, value := range req.Features {
		feature := strings.TrimSpace(value)
		if feature == "" {
			continue
		}
		if len([]rune(feature)) > 160 {
			return fmt.Errorf("cada característica debe tener máximo 160 caracteres")
		}
		features = append(features, feature)
	}
	req.Features = features
	return nil
}

func (h *Handler) CreatePlan(c *fiber.Ctx) error {
	var req CreatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := normalizePlanRequest(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	modulesJSON, _ := json.Marshal(req.Modules)
	featuresJSON, _ := json.Marshal(req.Features)

	var id string
	err := h.db.QueryRow(c.UserContext(),
		`INSERT INTO subscription_plans 
		(name, description, price_monthly, price_annual, currency, max_students, max_teachers, modules, features, is_active, is_featured) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
		req.Name, req.Description, req.PriceMonthly, req.PriceAnnual, req.Currency,
		req.MaxStudents, req.MaxTeachers, modulesJSON, featuresJSON, req.IsActive, req.IsFeatured).Scan(&id)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error creating plan")
	}
	h.auditSuperAdmin(c, "plan.create", "subscription_plans", id, "warning", fiber.Map{
		"name": req.Name, "modules": req.Modules, "is_active": req.IsActive,
	}, "")

	return response.Success(c, fiber.Map{"id": id}, "Plan created")
}

func (h *Handler) GetPlan(c *fiber.Ctx) error {
	id := c.Params("id")

	var name, currency string
	var description *string
	var priceMonthly, priceAnnual float64
	var maxStudents, maxTeachers int
	var modules, features []byte
	var isActive, isFeatured bool
	var createdAt interface{}

	err := h.db.QueryRow(c.UserContext(),
		`SELECT name, description, price_monthly, price_annual, currency, 
		 max_students, max_teachers, modules, features, is_active, is_featured, created_at 
		 FROM subscription_plans WHERE id = $1`, id).
		Scan(&name, &description, &priceMonthly, &priceAnnual, &currency,
			&maxStudents, &maxTeachers, &modules, &features, &isActive, &isFeatured, &createdAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return response.Error(c, fiber.StatusNotFound, "Plan not found")
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching plan")
	}

	desc := ""
	if description != nil {
		desc = *description
	}

	return response.Success(c, fiber.Map{
		"id":            id,
		"name":          name,
		"description":   desc,
		"price_monthly": priceMonthly,
		"price_annual":  priceAnnual,
		"currency":      currency,
		"max_students":  maxStudents,
		"max_teachers":  maxTeachers,
		"modules":       string(modules),
		"features":      string(features),
		"is_active":     isActive,
		"is_featured":   isFeatured,
		"created_at":    createdAt,
	}, "Plan retrieved")
}

func (h *Handler) UpdatePlan(c *fiber.Ctx) error {
	id := c.Params("id")
	var req CreatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := normalizePlanRequest(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	modulesJSON, _ := json.Marshal(req.Modules)
	featuresJSON, _ := json.Marshal(req.Features)

	result, err := h.db.Exec(c.UserContext(),
		`UPDATE subscription_plans SET 
		 name = $1, description = $2, price_monthly = $3, price_annual = $4, currency = $5, 
		 max_students = $6, max_teachers = $7, modules = $8, features = $9, is_active = $10, is_featured = $11, updated_at = NOW() 
		 WHERE id = $12`,
		req.Name, req.Description, req.PriceMonthly, req.PriceAnnual, req.Currency,
		req.MaxStudents, req.MaxTeachers, modulesJSON, featuresJSON, req.IsActive, req.IsFeatured, id)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating plan")
	}
	if result.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusNotFound, "Plan not found")
	}
	h.auditSuperAdmin(c, "plan.update", "subscription_plans", id, "warning", fiber.Map{
		"name": req.Name, "modules": req.Modules, "is_active": req.IsActive,
	}, "")

	return response.Success(c, nil, "Plan updated")
}

func (h *Handler) DeletePlan(c *fiber.Ctx) error {
	id := c.Params("id")

	// Verificar si hay escuelas usando este plan (lógica simple para ahora)
	// En un escenario real, no se borra, se desactiva.
	tag, err := h.db.Exec(c.UserContext(), "UPDATE subscription_plans SET is_active = false, updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error deactivating plan")
	}
	if tag.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusNotFound, "Plan not found")
	}

	h.auditSuperAdmin(c, "plan.deactivate", "subscription_plans", id, "warning", fiber.Map{"plan_id": id}, "")
	return response.Success(c, nil, "Plan deactivated")
}

func (h *Handler) TogglePlan(c *fiber.Ctx) error {
	id := c.Params("id")

	result, err := h.db.Exec(c.UserContext(), "UPDATE subscription_plans SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error toggling plan")
	}
	if result.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusNotFound, "Plan not found")
	}
	h.auditSuperAdmin(c, "plan.toggle", "subscription_plans", id, "warning", fiber.Map{}, "")

	return response.Success(c, nil, "Plan toggled")
}
