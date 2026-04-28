// ============================================================
// ARCHIVO: event_bus.go
// MÓDULO:  Infraestructura (events)
// QUÉ HACE: Bus de eventos central. Los módulos se comunican publicando
//           y escuchando eventos. Nunca importan código de otros módulos directamente.
//           Si un listener falla, el emisor no se ve afectado.
// ============================================================
package events

import (
	"log"
	"sync"
)

type EventBus struct {
	listeners map[string][]func(payload interface{})
	mu        sync.RWMutex
	isRunning bool
}

var (
	instance *EventBus
	once     sync.Once
)

// NewEventBus creates a new event bus instance (alternative to singleton)
func NewEventBus() *EventBus {
	return &EventBus{
		listeners: make(map[string][]func(payload interface{})),
		isRunning: false,
	}
}

// GetInstance retorna el singleton del bus de eventos
func GetInstance() *EventBus {
	once.Do(func() {
		instance = &EventBus{
			listeners: make(map[string][]func(payload interface{})),
			isRunning: false,
		}
	})
	return instance
}

// Start initializes the event bus
func (eb *EventBus) Start() {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	eb.isRunning = true
	log.Println("[EventBus] Started successfully")
}

// Publish emite un evento. Si algún listener falla, los demás siguen ejecutándose.
// Supports both interface{} and map[string]interface{} payloads
func (eb *EventBus) Publish(event string, payload interface{}) {
	eb.mu.RLock()
	isRunning := eb.isRunning
	handlers, ok := eb.listeners[event]
	eb.mu.RUnlock()

	if !isRunning {
		log.Printf("[EventBus] Not running, dropping event: %s", event)
		return
	}

	if !ok {
		log.Printf("[EventBus] No listeners for event: %s", event)
		return
	}

	log.Printf("[EventBus] Publishing event: %s", event)

	for _, listener := range handlers {
		go func(fn func(interface{})) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[EventBus] Listener falló para evento '%s': %v", event, r)
				}
			}()
			fn(payload)
		}(listener)
	}
}

// Subscribe registra un handler para un evento específico
func (eb *EventBus) Subscribe(event string, handler func(interface{})) {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	eb.listeners[event] = append(eb.listeners[event], handler)
}
