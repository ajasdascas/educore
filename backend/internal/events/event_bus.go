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
}

var (
	instance *EventBus
	once     sync.Once
)

// GetInstance retorna el singleton del bus de eventos
func GetInstance() *EventBus {
	once.Do(func() {
		instance = &EventBus{
			listeners: make(map[string][]func(payload interface{})),
		}
	})
	return instance
}

// Publish emite un evento. Si algún listener falla, los demás siguen ejecutándose.
func (eb *EventBus) Publish(event string, payload interface{}) {
	eb.mu.RLock()
	handlers, ok := eb.listeners[event]
	eb.mu.RUnlock()

	if !ok {
		return
	}

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
