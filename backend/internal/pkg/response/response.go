package response

import (
	"github.com/gofiber/fiber/v2"
)

func Success(c *fiber.Ctx, data interface{}, message string) error {
	return c.JSON(fiber.Map{
		"success": true,
		"message": message,
		"data":    data,
	})
}

func Error(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(fiber.Map{
		"success": false,
		"error":   message,
	})
}

func PaginMeta(c *fiber.Ctx, data interface{}, meta interface{}) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    data,
		"meta":    meta,
	})
}

// Meta represents pagination metadata
type Meta struct {
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
	Total   int `json:"total"`
}

// SuccessWithMeta returns success response with pagination metadata
func SuccessWithMeta(c *fiber.Ctx, data interface{}, meta Meta) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    data,
		"meta":    meta,
	})
}

// SuccessMessage returns success response with only a message
func SuccessMessage(c *fiber.Ctx, message string) error {
	return c.JSON(fiber.Map{
		"success": true,
		"message": message,
	})
}

// ErrorFromErr creates error response from Go error
func ErrorFromErr(c *fiber.Ctx, status int, err error) error {
	return Error(c, status, err.Error())
}
