package com.todo.dto.response;

/**
 * Typed response for GET /health.
 */
public record HealthResponse(
        String status,
        String mongodb,
        String redis,
        long uptime
) {}
