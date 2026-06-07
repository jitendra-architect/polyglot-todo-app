package com.todo.mapper;

import com.todo.dto.response.TodoResponse;
import com.todo.model.Todo;
import org.springframework.stereotype.Component;

/**
 * Maps between {@link Todo} domain documents and {@link TodoResponse} DTOs.
 * Keeps mapping logic out of both the domain model and the service layer.
 */
@Component
public class TodoMapper {

    public TodoResponse toResponse(Todo todo) {
        TodoResponse response = new TodoResponse();
        response.setId(todo.getId());
        response.setTitle(todo.getTitle());
        response.setDescription(todo.getDescription());
        response.setDueDate(todo.getDueDate());
        response.setStatus(todo.getStatus());
        response.setPriority(todo.getPriority());
        response.setCreatedAt(todo.getCreatedAt());
        response.setUpdatedAt(todo.getUpdatedAt());
        response.setVersion(todo.getVersion());
        return response;
    }
}
