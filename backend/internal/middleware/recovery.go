// ============================================================
// ARCHIVO: recovery.go
// MÓDULO:  Infraestructura (middleware)
// QUÉ HACE: Captura cualquier panic dentro de un handler y retorna un error 500
//           en lugar de tirar todo el servidor. Cada módulo tiene su propio recovery.
// LO USA:   El registro de rutas de cada módulo en main.go o en el router del módulo.
// ============================================================
package middleware

import (
	"log"

	"github.com/gofiber/fiber/v2"
)

// ModuleRecovery es el middleware que protege cada módulo individualmente.
// Si un módulo explota, el resto sigue vivo.
func ModuleRecovery(moduleName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				// Registra el error internamente
				log.Printf("[MÓDULO: %s] PANIC capturado: %v", moduleName, r)
				
				// Retorna error controlado al cliente
				c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
					"success": false,
					"error":   "module_unavailable",
					"message": "Este servicio no está disponible temporalmente. El resto del sistema funciona con normalidad.",
					"module":  moduleName,
				})
			}
		}()
		return c.Next()
	}
}
