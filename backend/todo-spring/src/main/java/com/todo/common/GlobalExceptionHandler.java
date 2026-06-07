package com.todo.common;

import com.todo.exception.TodoNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 404 Not Found ──────────────────────────────────────────────────────
    @ExceptionHandler(TodoNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(TodoNotFoundException ex,
                                                    HttpServletRequest req) {
        log.warn("404 {} [{}] {}", ex.getMessage(), correlationId(req), req.getRequestURI());
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), null, req);
    }

    // ── 409 Conflict (optimistic locking) ─────────────────────────────────
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiError> handleConflict(OptimisticLockingFailureException ex,
                                                    HttpServletRequest req) {
        log.warn("409 Version conflict [{}] {}", correlationId(req), req.getRequestURI());
        return build(HttpStatus.CONFLICT,
                "Version conflict. Please reload and try again.", null, req);
    }

    // ── 422 Validation (request body) ─────────────────────────────────────
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex,
                                                      HttpServletRequest req) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
          .forEach(fe -> fieldErrors.put(fe.getField(), fe.getDefaultMessage()));
        log.warn("422 Validation failed [{}] {}", correlationId(req), fieldErrors);
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "Validation failed", fieldErrors, req);
    }

    // ── 400 Constraint violation (query/path params via @Validated) ────────
    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(
            jakarta.validation.ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(cv -> {
            String path = cv.getPropertyPath().toString();
            String field = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
            errors.put(field, cv.getMessage());
        });
        log.warn("400 Constraint violation [{}] {}", correlationId(req), errors);
        return build(HttpStatus.BAD_REQUEST, "Validation failed", errors, req);
    }

    // ── 500 Internal ───────────────────────────────────────────────────────
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleAll(Exception ex, HttpServletRequest req) {
        log.error("500 [{}] {}", correlationId(req), req.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", null, req);
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    private ResponseEntity<ApiError> build(HttpStatus status, String message,
                                            Object errors, HttpServletRequest req) {
        return ResponseEntity.status(status).body(
                ApiError.builder()
                        .statusCode(status.value())
                        .message(message)
                        .errors(errors)
                        .path(req.getRequestURI())
                        .correlationId(correlationId(req))
                        .build());
    }

    private String correlationId(HttpServletRequest req) {
        Object attr = req.getAttribute(CorrelationIdFilter.ATTR);
        return attr != null ? attr.toString() : "unknown";
    }
}
