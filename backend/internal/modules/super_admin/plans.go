package superadmin

import (
	"educore/internal/pkg/response"
	"encoding/json"

	"github.com/gofiber/fiber/v2"
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

		rows.Scan(&id, &name, &description, &priceMonthly, &priceAnnual, &currency,
			&maxStudents, &maxTeachers, &modules, &features, &isActive, &isFeatured, &createdAt)

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

func (h *Handler) CreatePlan(c *fiber.Ctx) error {
	var req CreatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.Currency == "" {
		req.Currency = "MXN"
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

	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Plan not found")
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

	if req.Currency == "" {
		req.Currency = "MXN"
	}

	modulesJSON, _ := json.Marshal(req.Modules)
	featuresJSON, _ := json.Marshal(req.Features)

	_, err := h.db.Exec(c.UserContext(),
		`UPDATE subscription_plans SET 
		 name = $1, description = $2, price_monthly = $3, price_annual = $4, currency = $5, 
		 max_students = $6, max_teachers = $7, modules = $8, features = $9, is_active = $10, is_featured = $11, updated_at = NOW() 
		 WHERE id = $12`,
		req.Name, req.Description, req.PriceMonthly, req.PriceAnnual, req.Currency,
		req.MaxStudents, req.MaxTeachers, modulesJSON, featuresJSON, req.IsActive, req.IsFeatured, id)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating plan")
	}

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

	_, err := h.db.Exec(c.UserContext(), "UPDATE subscription_plans SET is_active = NOT is_active WHERE id = $1", id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error toggling plan")
	}

	return response.Success(c, nil, "Plan toggled")
}
