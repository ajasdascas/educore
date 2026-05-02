//go:build ignore

package main

import (
	"fmt"
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := os.Getenv("EDUCORE_HASH_PASSWORD")
	if len(password) < 12 {
		log.Fatal("EDUCORE_HASH_PASSWORD is required and must be at least 12 characters")
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	fmt.Println(string(hash))
}
