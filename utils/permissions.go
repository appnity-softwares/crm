package utils

import "strings"

func ContainsPermission(permissions, permission string) bool {
	if permissions == "" {
		return false
	}
	parts := strings.Split(permissions, ",")
	for _, p := range parts {
		if strings.TrimSpace(p) == permission {
			return true
		}
	}
	return false
}
